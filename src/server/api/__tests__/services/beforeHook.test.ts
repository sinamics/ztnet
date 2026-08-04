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
import { runBeforeAuthHook, resetLegacyEmailProbeCache } from "~/lib/auth";
import { prisma } from "~/server/db";
import { findUserIdsByEmail } from "~/server/api/services/userEmailLookup";

jest.mock("~/server/api/services/userEmailLookup", () => ({
	findUserIdsByEmail: jest.fn(),
}));

jest.mock("~/server/db", () => ({
	prisma: {
		$queryRaw: jest.fn(),
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
	resetLegacyEmailProbeCache();
	// Default: the instance still has legacy mixed-case rows, so the recovery
	// path is reachable. Tests that care about the clean case override this.
	(prisma.$queryRaw as jest.Mock).mockResolvedValue([1]);
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
	// `unknown` on purpose: this hook runs before better-auth validates the body,
	// so it has to survive whatever a client sends.
	email?: unknown;
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
		(findUserIdsByEmail as jest.Mock).mockResolvedValue([]);
		await expect(
			runBeforeAuthHook(makeCtx({ email: "ghost@example.com", password: "x" })),
		).resolves.toBeUndefined();
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("looks the user up by the lowercased email, matching better-auth", async () => {
		// better-auth's internalAdapter.findUserByEmail lowercases before querying.
		// If this hook queried the raw input it would resolve a different (or no)
		// user than the one better-auth then authenticates against.
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue([]);

		await runBeforeAuthHook(makeCtx({ email: " John@Example.COM ", password: "x" }));

		expect(prisma.user.findFirst).toHaveBeenCalledWith({
			where: { email: "john@example.com" },
		});
	});
});

/**
 * #964: users registered before emails were normalized are stored with the
 * casing they typed. better-auth lowercases the address before its own lookup
 * (`internalAdapter.findUserByEmail` → `email.toLowerCase()`) and Postgres
 * equality is case sensitive, so those rows became unreachable after the
 * next-auth → better-auth upgrade ("User not found"). This hook runs before
 * better-auth resolves the account, so normalizing the row here makes the
 * lookup later in the same request succeed.
 */
describe("legacy mixed-case email normalization (#964)", () => {
	const legacyUser = {
		id: "u1",
		email: "John@Example.com",
		hash: "$2a$10$existing",
		failedLoginAttempts: 0,
		lastFailedLoginAttempt: null,
		twoFactorEnabled: false,
	};
	const normalizedUser = { ...legacyUser, email: "john@example.com" };

	it("normalizes the stored email in place so better-auth's own lookup can find it", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // exact match misses
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		(prisma.user.update as jest.Mock).mockResolvedValue(normalizedUser);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });

		await runBeforeAuthHook(makeCtx({ email: "John@Example.com", password: "right" }));

		expect(findUserIdsByEmail).toHaveBeenCalledWith(prisma, "john@example.com", 2);
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: { email: "john@example.com" },
		});
	});

	it("continues the sign-in checks against the normalized row", async () => {
		// The backfill/cooldown/2FA steps must operate on the row better-auth
		// will authenticate, not on a stale copy.
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		(prisma.user.update as jest.Mock).mockResolvedValue(normalizedUser);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

		await runBeforeAuthHook(makeCtx({ email: "John@Example.com", password: "right" }));

		expect(prisma.account.create).toHaveBeenCalledWith({
			data: {
				userId: "u1",
				accountId: "u1",
				providerId: "credential",
				password: "$2a$10$existing",
			},
		});
	});

	it("does not touch the row when the email is already normalized", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(normalizedUser);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });

		await runBeforeAuthHook(makeCtx({ email: "john@example.com", password: "right" }));

		expect(findUserIdsByEmail).not.toHaveBeenCalled();
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("does not rewrite anything when no account matches at all", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue([]);

		await expect(
			runBeforeAuthHook(makeCtx({ email: "Ghost@Example.com", password: "x" })),
		).resolves.toBeUndefined();
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("refuses to pick one when two accounts differ only by casing", async () => {
		// There is no safe way to choose between them, and rewriting either would
		// hit the unique constraint on User.email. Leave both and let better-auth
		// produce its standard error.
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1", "u2"]);

		await expect(
			runBeforeAuthHook(makeCtx({ email: "John@Example.com", password: "right" })),
		).resolves.toBeUndefined();
		expect(prisma.user.update).not.toHaveBeenCalled();
		expect(prisma.account.create).not.toHaveBeenCalled();
	});

	it("swallows a failed rewrite rather than 500-ing the sign-in", async () => {
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		// `mockRejectedValueOnce`: jest.clearAllMocks() clears calls but keeps
		// implementations, so a persistent rejection would leak into later suites.
		(prisma.user.update as jest.Mock).mockRejectedValueOnce(
			new Error("unique constraint"),
		);

		await expect(
			runBeforeAuthHook(makeCtx({ email: "John@Example.com", password: "right" })),
		).resolves.toBeUndefined();
		expect(prisma.account.create).not.toHaveBeenCalled();
	});

	it("logs the failure without echoing the submitted address or the raw error", async () => {
		// This path runs on unvalidated request-body input. A raw error dump is
		// one library change away from carrying the submitted value into the log.
		const error = Object.assign(
			new Error("Unique constraint failed on Secret@Example.com"),
			{ name: "PrismaClientKnownRequestError", code: "P2002" },
		);
		const spy = jest.spyOn(console, "error").mockImplementation(() => {});
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		(prisma.user.update as jest.Mock).mockRejectedValueOnce(error);

		await runBeforeAuthHook(makeCtx({ email: "Secret@Example.com", password: "right" }));

		const logged = spy.mock.calls.flat().map(String).join(" ");
		expect(logged).not.toContain("Secret@Example.com");
		expect(logged).not.toContain("secret@example.com");
		expect(spy).not.toHaveBeenCalledWith(expect.anything(), error);
		// Still triageable: error class, code and the affected row.
		expect(logged).toContain("P2002");
		expect(logged).toContain("u1");
		spy.mockRestore();
	});

	it("still runs the security checks when a concurrent request wins the rewrite", async () => {
		// The rewrite loses a race to another request that normalized a different
		// row to the same address. better-auth will authenticate that row, so
		// skipping cooldown / 2FA / backfill here would be a bypass.
		(prisma.user.findFirst as jest.Mock)
			.mockResolvedValueOnce(null) // first lookup, before the race is lost
			.mockResolvedValueOnce({ ...normalizedUser, twoFactorEnabled: true }); // re-resolve
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		(prisma.user.update as jest.Mock).mockRejectedValueOnce(
			new Error("unique constraint"),
		);
		(compare as jest.Mock).mockResolvedValue(true);

		await expect(
			runBeforeAuthHook(
				makeCtx({ email: "John@Example.com", password: "right", totpCode: null }),
			),
		).rejects.toThrow(/second-factor-required/);
	});

	it("re-resolves the account when a concurrent request normalized one of the matches", async () => {
		// Ambiguous pair, so nothing is rewritten here, but a concurrent request
		// may have normalized one of them. That row is what better-auth will
		// authenticate, so it must still go through the checks below.
		(prisma.user.findFirst as jest.Mock)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(normalizedUser);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1", "u2"]);
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

		await runBeforeAuthHook(makeCtx({ email: "John@Example.com", password: "right" }));

		expect(prisma.user.update).not.toHaveBeenCalled();
		expect(prisma.account.create).toHaveBeenCalledWith({
			data: {
				userId: "u1",
				accountId: "u1",
				providerId: "credential",
				password: "$2a$10$existing",
			},
		});
	});

	it("costs no extra query when the address matches nothing (brute-force hot path)", async () => {
		// Unknown addresses are the bulk of credential-stuffing traffic. With zero
		// case-insensitive matches there is nothing to race against, so the
		// re-resolve must not run.
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue([]);

		await expect(
			runBeforeAuthHook(makeCtx({ email: "ghost@example.com", password: "x" })),
		).resolves.toBeUndefined();

		expect(prisma.user.findFirst).toHaveBeenCalledTimes(1);
		expect(findUserIdsByEmail).toHaveBeenCalledTimes(1);
	});

	it.each([
		["a number", 12345],
		["an object", { toString: () => "x" }],
		["an array", ["a@b.com"]],
		["null", null],
		["whitespace only", "   "],
	])(
		"returns quietly instead of throwing when the email is %s",
		async (_label, value) => {
			// This hook runs before better-auth's own zod validation, so a malformed
			// body must not become a 500.
			(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
			(findUserIdsByEmail as jest.Mock).mockResolvedValue([]);

			await expect(
				runBeforeAuthHook(makeCtx({ email: value, password: "x" })),
			).resolves.toBeUndefined();
			expect(prisma.user.update).not.toHaveBeenCalled();
		},
	);

	it("still enforces 2FA after normalizing a legacy row", async () => {
		// The rewrite must not become a way to skip the second factor.
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		(prisma.user.update as jest.Mock).mockResolvedValue({
			...normalizedUser,
			twoFactorEnabled: true,
			twoFactorSecret: "enc",
		});
		(compare as jest.Mock).mockResolvedValue(true);
		(prisma.account.findFirst as jest.Mock).mockResolvedValue({ id: "acc" });

		await expect(
			runBeforeAuthHook(
				makeCtx({ email: "John@Example.com", password: "right", totpCode: null }),
			),
		).rejects.toThrow(/second-factor-required/);
	});
});

/**
 * Prisma compiles `mode: "insensitive"` to ILIKE, which cannot use the unique
 * index on User.email — a sequential scan, measured at ~14x the indexed lookup
 * on 20k rows. It must not run on every sign-in, only on instances that
 * actually still hold mixed-case rows.
 */
describe("legacy email probe gating", () => {
	it("skips the sequential scan entirely on a clean instance", async () => {
		(prisma.$queryRaw as jest.Mock).mockResolvedValue([]); // no legacy rows
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

		await runBeforeAuthHook(makeCtx({ email: "ghost@example.com", password: "x" }));

		expect(findUserIdsByEmail).not.toHaveBeenCalled();
	});

	it("probes once per process, not once per sign-in", async () => {
		(prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

		await runBeforeAuthHook(makeCtx({ email: "a@example.com", password: "x" }));
		await runBeforeAuthHook(makeCtx({ email: "b@example.com", password: "x" }));
		await runBeforeAuthHook(makeCtx({ email: "c@example.com", password: "x" }));

		expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
	});

	it("re-probes after a rewrite so a drained instance stops scanning", async () => {
		(prisma.$queryRaw as jest.Mock).mockResolvedValue([1]);
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue(["u1"]);
		(prisma.user.update as jest.Mock).mockResolvedValue({
			id: "u1",
			email: "john@example.com",
			hash: null,
			twoFactorEnabled: false,
		});

		await runBeforeAuthHook(makeCtx({ email: "John@Example.com", password: "x" }));
		// The rewrite invalidated the cache, so the next miss probes again.
		await runBeforeAuthHook(makeCtx({ email: "other@example.com", password: "x" }));

		expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
	});

	it("fails open and keeps the recovery path when the probe errors", async () => {
		// Locking legacy users out because a probe failed would defeat the point.
		(prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error("db down"));
		(prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
		(findUserIdsByEmail as jest.Mock).mockResolvedValue([]);

		await runBeforeAuthHook(makeCtx({ email: "ghost@example.com", password: "x" }));

		expect(findUserIdsByEmail).toHaveBeenCalled();
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
