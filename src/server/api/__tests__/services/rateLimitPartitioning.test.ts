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

describe("rateLimit partitioning (GHSA-5p34-fh6h-7892)", () => {
	// CONTROL: runs first, on a cold bucket. If this fails, every later
	// assertion is meaningless because the endpoint would be rejecting for
	// some reason other than the rate limiter.
	it("CONTROL: a fresh client on a cold bucket is allowed through", async () => {
		expect(await callReset("198.51.100.1", "control@example.com")).toBe("allowed");
	});

	it("one attacker IP exhausts passwordResetLink for every other IP", async () => {
		// Drain from a single source IP until it is cut off, rather than
		// hardcoding the limit, so the test does not depend on env config.
		let attackerCalls = 0;
		while (
			(await callReset("203.0.113.66", `junk${attackerCalls}@example.com`)) === "allowed"
		) {
			attackerCalls++;
			if (attackerCalls > 200) throw new Error("limiter never engaged");
		}
		console.info(`attacker was cut off after ${attackerCalls} accepted calls`);

		// Three unrelated, never-seen clients on completely different IPs.
		const outcomes = [];
		for (const ip of ["198.51.100.7", "192.0.2.44", "203.0.113.201"]) {
			outcomes.push(await callReset(ip, "real.user@example.com"));
		}

		console.info("victim outcomes:", outcomes);
		expect(outcomes).toEqual([
			"TOO_MANY_REQUESTS",
			"TOO_MANY_REQUESTS",
			"TOO_MANY_REQUESTS",
		]);
	});

	it("the mfaAuth bucket is separate from auth, but equally global", async () => {
		// Proves the partitioning that DOES exist is per-endpoint, not per-caller:
		// the auth bucket is exhausted by the previous test, yet MFA still works
		// -- until one client exhausts that one too.
		const attacker = makeClient("203.0.113.66");
		for (let i = 0; i < 9; i++) {
			await attacker.mfaAuth.mfaResetLink({ email: `junk${i}@example.com` });
		}

		let victimCode = "allowed";
		try {
			await makeClient("198.51.100.99").mfaAuth.mfaResetLink({
				email: "locked.out@example.com",
			});
		} catch (e) {
			victimCode = (e as { code?: string }).code ?? "unknown";
		}

		console.info("mfa victim outcome:", victimCode);
		expect(victimCode).toBe("TOO_MANY_REQUESTS");
	});
});
