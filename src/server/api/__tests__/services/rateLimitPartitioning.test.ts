import { describe, it, expect } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import type { NextApiResponse } from "next";
import { appRouter } from "../../root";

// No module under test is mocked. This drives the real authRouter, the real
// publicProcedure pipeline, and the real rateLimit() instance that authRouter
// creates at module scope -- i.e. the exact object a running server shares
// across every inbound request.

jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn().mockResolvedValue(undefined),
}));

// Each simulated client gets its own req/res pair with its own source IP,
// exactly as Next.js hands one per HTTP connection.
const makeClient = (ip: string) => {
	const res = {
		setHeader: jest.fn(),
		socket: { server: { io: null } },
	} as unknown as NextApiResponse;

	const req = {
		headers: { "x-forwarded-for": ip },
		socket: { remoteAddress: ip },
	};

	const prisma = new PrismaClient();
	// Attacker uses addresses that do not exist -> the procedure short-circuits
	// after the rate-limit check. No DB, no mail, no cost.
	prisma.user.findFirst = jest.fn().mockResolvedValue(null);

	return appRouter.createCaller({
		session: null,
		wss: null,
		prisma,
		res,
		req,
		// biome-ignore lint/suspicious/noExplicitAny: minimal context stub
	} as any);
};

const callReset = async (ip: string, email: string) => {
	try {
		await makeClient(ip).auth.passwordResetLink({ email });
		return "allowed";
	} catch (e) {
		return (e as { code?: string }).code ?? "unknown";
	}
};

describe("rateLimit partitioning", () => {
	// CONTROL: runs first, on a cold bucket. If this fails, every later
	// assertion is meaningless because the endpoint would be rejecting for
	// some reason other than the rate limiter.
	it("CONTROL: a fresh client on a cold bucket is allowed through", async () => {
		expect(await callReset("198.51.100.1", "control@example.com")).toBe("allowed");
	});

	it("one client using up passwordResetLink does not lock out other clients", async () => {
		// Drain from a single source IP until it is cut off, rather than
		// hardcoding the limit, so the test does not depend on env config.
		let calls = 0;
		while ((await callReset("203.0.113.66", `junk${calls}@example.com`)) === "allowed") {
			calls++;
			if (calls > 200) throw new Error("limiter never engaged");
		}

		// the noisy client stays cut off
		expect(await callReset("203.0.113.66", "again@example.com")).toBe(
			"TOO_MANY_REQUESTS",
		);

		// unrelated clients on other addresses are not affected
		const outcomes = [];
		for (const ip of ["198.51.100.7", "192.0.2.44", "203.0.113.201"]) {
			outcomes.push(await callReset(ip, "real.user@example.com"));
		}
		expect(outcomes).toEqual(["allowed", "allowed", "allowed"]);
	});

	it("limits are separate per endpoint and per client", async () => {
		// 203.0.113.66 is cut off from passwordResetLink above, mfaResetLink
		// has its own budget
		const noisy = makeClient("203.0.113.66");
		let noisyCode = "allowed";
		try {
			for (let i = 0; i < 200; i++) {
				await noisy.mfaAuth.mfaResetLink({ email: `junk${i}@example.com` });
			}
		} catch (e) {
			noisyCode = (e as { code?: string }).code ?? "unknown";
		}
		expect(noisyCode).toBe("TOO_MANY_REQUESTS");

		await expect(
			makeClient("198.51.100.99").mfaAuth.mfaResetLink({
				email: "not.locked.out@example.com",
			}),
		).resolves.toBeDefined();
	});
});
