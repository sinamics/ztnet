/**
 * Tests for the credential sign-in pre-flight middleware (`runBeforeAuthHook`).
 *
 * This middleware fires before better-auth verifies the password against
 * Account.password. It owns:
 *   1. OAUTH_EXCLUSIVE_LOGIN defense-in-depth (refuse /sign-in/email + /sign-up/email).
 *   2. Per-account cooldown after MAX_FAILED_ATTEMPTS bad logins.
 *   3. Failed-password attempt counter increment (without throwing — better-auth
 *      produces the user-facing 401, we just bookkeep).
 *   4. One-time backfill of the credential `Account` row for users who pre-date
 *      the next-auth → better-auth migration. Without this, their first login
 *      after upgrade would fail because better-auth reads from `Account.password`.
 *   5. TOTP enforcement when `User.twoFactorEnabled = true`.
 *
 * Bypassing any of these is a security regression, so each path has an explicit test.
 */
import { runBeforeAuthHook } from "~/lib/auth";
import { prisma } from "~/server/db";

jest.mock("~/server/db", () => ({
	prisma: {
		user: {
			findFirst: jest.fn(),
			update: jest.fn(),
		},
		account: {
			findFirst: jest.fn(),
			create: jest.fn(),
		},
	},
}));

jest.mock("bcryptjs", () => ({
	compare: jest.fn(),
	hash: jest.fn(),
}));

jest.mock("otplib", () => ({
	authenticator: {
		check: jest.fn(),
	},
}));

jest.mock("~/utils/encryption", () => ({
	decrypt: jest.fn(),
	generateInstanceSecret: jest.fn(() => "secret"),
	TOTP_MFA_TOKEN_SECRET: "TOTP_MFA_TOKEN_SECRET",
}));

import { compare } from "bcryptjs";
import { authenticator } from "otplib";
import { decrypt } from "~/utils/encryption";

const ENV_KEYS = ["OAUTH_EXCLUSIVE_LOGIN", "NEXTAUTH_SECRET"] as const;
const ENV_BACKUP = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
	jest.clearAllMocks();
	// biome-ignore lint/performance/noDelete: must actually unset the env key
	delete process.env.OAUTH_EXCLUSIVE_LOGIN;
	process.env.NEXTAUTH_SECRET = "test_secret";
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

function makeCtx(overrides: {
	path?: string;
	email?: string;
	password?: string;
	totpCode?: string | null;
}) {
	const headers = new Headers();
	if (overrides.totpCode !== undefined && overrides.totpCode !== null) {
		headers.set("x-totp-code", overrides.totpCode);
	}
	const body: Record<string, unknown> = {};
	if (overrides.email !== undefined) body.email = overrides.email;
	if (overrides.password !== undefined) body.password = overrides.password;
	return {
		path: overrides.path ?? "/sign-in/email",
		body,
		headers,
	};
}

describe("OAUTH_EXCLUSIVE_LOGIN defense-in-depth", () => {
	it("rejects POST /sign-in/email when exclusive OAuth is on", async () => {
		process.env.OAUTH_EXCLUSIVE_LOGIN = "true";
		await expect(runBeforeAuthHook(makeCtx({ path: "/sign-in/email" }))).rejects.toThrow(
			/Email\/password authentication is disabled/i,
		);
		expect(prisma.user.findFirst).not.toHaveBeenCalled();
	});

	it("rejects POST /sign-up/email when exclusive OAuth is on", async () => {
		process.env.OAUTH_EXCLUSIVE_LOGIN = "true";
		await expect(runBeforeAuthHook(makeCtx({ path: "/sign-up/email" }))).rejects.toThrow(
			/Email\/password authentication is disabled/i,
		);
	});

	it("ignores other paths even when exclusive OAuth is on", async () => {
		process.env.OAUTH_EXCLUSIVE_LOGIN = "true";
		await expect(
			runBeforeAuthHook(makeCtx({ path: "/sign-out" })),
		).resolves.toBeUndefined();
	});

	it("does not block /sign-in/email when exclusive OAuth is off", async () => {
		process.env.OAUTH_EXCLUSIVE_LOGIN = "false";
		// no email in body → early return (line 121 of auth.ts)
		await expect(
			runBeforeAuthHook(makeCtx({ path: "/sign-in/email" })),
		).resolves.toBeUndefined();
	});
});

describe("Cooldown after MAX_FAILED_ATTEMPTS", () => {
	it("throws TOO_MANY_REQUESTS when failedLoginAttempts >= 5 within the cooldown window", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "u@example.com",
			hash: "$2a$10$x",
			failedLoginAttempts: 5,
			lastFailedLoginAttempt: new Date(Date.now() - 10_000), // 10s ago
			twoFactorEnabled: false,
		});

		await expect(
			runBeforeAuthHook(makeCtx({ email: "u@example.com", password: "x" })),
		).rejects.toThrow(/Too many failed attempts/i);
	});

	it("does NOT throw once the 1-minute cooldown has elapsed", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "u@example.com",
			hash: "$2a$10$x",
			failedLoginAttempts: 5,
			lastFailedLoginAttempt: new Date(Date.now() - 90_000), // 90s ago > 60s
			twoFactorEnabled: false,
		});
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });

		await expect(
			runBeforeAuthHook(makeCtx({ email: "u@example.com", password: "x" })),
		).resolves.toBeUndefined();
	});
});

describe("failed-password bookkeeping", () => {
	it("increments failedLoginAttempts on bad password but does NOT throw (better-auth owns the 401)", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "u@example.com",
			hash: "$2a$10$x",
			failedLoginAttempts: 0,
			lastFailedLoginAttempt: null,
			twoFactorEnabled: false,
		});
		(compare as jest.Mock).mockResolvedValue(false);

		await expect(
			runBeforeAuthHook(makeCtx({ email: "u@example.com", password: "wrong" })),
		).resolves.toBeUndefined();

		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: {
				failedLoginAttempts: { increment: 1 },
				lastFailedLoginAttempt: expect.any(Date),
			},
		});
	});

	it("does nothing when the user is unknown (better-auth handles the 401)", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		await expect(
			runBeforeAuthHook(makeCtx({ email: "ghost@example.com", password: "x" })),
		).resolves.toBeUndefined();
		expect(prisma.user.update).not.toHaveBeenCalled();
	});
});

describe("credential Account backfill", () => {
	it("creates the credential Account row on first login if it's missing (next-auth migration safety net)", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "u@example.com",
			hash: "$2a$10$existing",
			failedLoginAttempts: 0,
			lastFailedLoginAttempt: null,
			twoFactorEnabled: false,
		});
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

		await runBeforeAuthHook(makeCtx({ email: "u@example.com", password: "right" }));

		expect(prisma.account.create).toHaveBeenCalledWith({
			data: {
				userId: "u1",
				accountId: "u1",
				providerId: "credential",
				password: "$2a$10$existing",
			},
		});
	});

	it("does NOT recreate the Account if it already exists", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "u@example.com",
			hash: "$2a$10$existing",
			failedLoginAttempts: 0,
			lastFailedLoginAttempt: null,
			twoFactorEnabled: false,
		});
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({
			id: "acc",
			providerId: "credential",
		});

		await runBeforeAuthHook(makeCtx({ email: "u@example.com", password: "right" }));

		expect(prisma.account.create).not.toHaveBeenCalled();
	});

	it("skips backfill for OAuth-only users (no User.hash)", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "u@example.com",
			hash: null,
			failedLoginAttempts: 0,
			lastFailedLoginAttempt: null,
			twoFactorEnabled: false,
		});
		(prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

		await runBeforeAuthHook(makeCtx({ email: "u@example.com", password: "any" }));
		expect(prisma.account.create).not.toHaveBeenCalled();
	});
});

describe("TOTP 2FA enforcement", () => {
	const userWith2FA = {
		id: "u1",
		email: "u@example.com",
		hash: "$2a$10$existing",
		failedLoginAttempts: 0,
		lastFailedLoginAttempt: null,
		twoFactorEnabled: true,
		twoFactorSecret: "encrypted-secret",
	};

	it("throws second-factor-required when the user has 2FA on and no x-totp-code header", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(userWith2FA);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });

		await expect(
			runBeforeAuthHook(
				makeCtx({ email: "u@example.com", password: "right", totpCode: null }),
			),
		).rejects.toThrow(/second-factor-required/);
	});

	it("rejects when the TOTP code doesn't validate", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(userWith2FA);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });
		(decrypt as jest.Mock).mockReturnValue("12345678901234567890123456789012"); // 32 chars
		(authenticator.check as jest.Mock).mockReturnValue(false);

		await expect(
			runBeforeAuthHook(
				makeCtx({
					email: "u@example.com",
					password: "right",
					totpCode: "000000",
				}),
			),
		).rejects.toThrow(/incorrect-two-factor-code/);

		// failed-attempts increments on bad TOTP too
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: {
				failedLoginAttempts: { increment: 1 },
				lastFailedLoginAttempt: expect.any(Date),
			},
		});
	});

	it("accepts a valid TOTP code and allows the request to proceed", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(userWith2FA);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });
		(decrypt as jest.Mock).mockReturnValue("12345678901234567890123456789012");
		(authenticator.check as jest.Mock).mockReturnValue(true);

		await expect(
			runBeforeAuthHook(
				makeCtx({
					email: "u@example.com",
					password: "right",
					totpCode: "123456",
				}),
			),
		).resolves.toBeUndefined();
	});

	it("returns 500 (INTERNAL_SERVER_ERROR) when 2FA is on but no secret stored — should never happen but must not log the user in", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue({
			...userWith2FA,
			twoFactorSecret: null,
		});
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });

		await expect(
			runBeforeAuthHook(
				makeCtx({
					email: "u@example.com",
					password: "right",
					totpCode: "123456",
				}),
			),
		).rejects.toThrow(/Internal server error/);
	});

	it("returns 500 when the encrypted TOTP secret has the wrong length (encryption-key drift)", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(userWith2FA);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });
		(decrypt as jest.Mock).mockReturnValue("too-short");

		await expect(
			runBeforeAuthHook(
				makeCtx({
					email: "u@example.com",
					password: "right",
					totpCode: "123456",
				}),
			),
		).rejects.toThrow(/Internal server error/);
	});
});
