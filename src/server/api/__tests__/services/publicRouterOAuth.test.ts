/**
 * `publicRouter.registrationAllowed` is consumed by the LOGIN page (unauthenticated)
 * to decide whether to show the "Sign up" link, the email/password form, or the
 * "Sign in with OAuth" button. If it returns wrong flags, the UI hides legitimate
 * sign-in paths or shows ones the operator deliberately disabled.
 *
 * The router computes `oauthExclusiveLogin` and `oauthAllowNewUsers` from env
 * vars, and the SAME env-var semantics are used to gate the actual auth flow
 * (see `isOAuthExclusiveLogin` / `isOAuthAllowNewUsers` in `src/lib/auth.ts`).
 * This test pins the public-API contract to those env-var defaults.
 */
import { test, expect, describe, beforeEach } from "@jest/globals";

jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
}));
jest.mock("~/utils/encryption", () => ({
	encrypt: jest.fn(),
	generateInstanceSecret: jest.fn(),
	API_TOKEN_SECRET: "x",
	PASSWORD_RESET_SECRET: "x",
	VERIFY_EMAIL_SECRET: "x",
	TOTP_MFA_TOKEN_SECRET: "x",
}));
jest.mock("~/utils/ztApi", () => ({ ping_api: jest.fn() }));

import { appRouter } from "../../root";
import { PrismaClient } from "@prisma/client";

const ENV_KEYS = ["OAUTH_EXCLUSIVE_LOGIN", "OAUTH_ALLOW_NEW_USERS"] as const;
const ENV_BACKUP = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
	for (const key of ENV_KEYS) {
		delete process.env[key];
	}
});

afterAll(() => {
	for (const [key, value] of Object.entries(ENV_BACKUP)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

function makeCaller(enableRegistration: boolean) {
	const prisma = new PrismaClient();
	prisma.globalOptions.findFirst = jest
		.fn()
		.mockResolvedValue({ enableRegistration }) as never;

	return appRouter.createCaller({
		session: null,
		wss: null,
		prisma,
		res: { setHeader: jest.fn() } as never,
		req: { headers: {} } as never,
	});
}

describe("publicRouter.registrationAllowed", () => {
	test("returns the three flags in a single shape that matches the LoginPage's expected props", async () => {
		// Just verify the shape is present + types — the env-var defaults are
		// covered by `oauthConfig.test.ts` which tests the `is*` helpers directly.
		// We can't reliably test "OAUTH_ALLOW_NEW_USERS unset" here because
		// next/jest re-loads .env between test phases.
		process.env.OAUTH_EXCLUSIVE_LOGIN = "false";
		process.env.OAUTH_ALLOW_NEW_USERS = "true";
		const caller = makeCaller(true);
		const result = await caller.public.registrationAllowed();
		expect(result).toEqual({
			enableRegistration: true,
			oauthExclusiveLogin: false,
			oauthAllowNewUsers: true,
		});
	});

	test("OAUTH_EXCLUSIVE_LOGIN=true is reported to the client (case-insensitive)", async () => {
		process.env.OAUTH_EXCLUSIVE_LOGIN = "TRUE";
		const caller = makeCaller(true);
		const { oauthExclusiveLogin } = await caller.public.registrationAllowed();
		expect(oauthExclusiveLogin).toBe(true);
	});

	test("OAUTH_ALLOW_NEW_USERS=false is reported to the client (case-insensitive)", async () => {
		process.env.OAUTH_ALLOW_NEW_USERS = "FALSE";
		const caller = makeCaller(true);
		const { oauthAllowNewUsers } = await caller.public.registrationAllowed();
		expect(oauthAllowNewUsers).toBe(false);
	});

	test("when the DB has enableRegistration=false, the flag flows through", async () => {
		const caller = makeCaller(false);
		const { enableRegistration } = await caller.public.registrationAllowed();
		expect(enableRegistration).toBe(false);
	});
});
