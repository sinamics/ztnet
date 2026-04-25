/**
 * Tests for the better-auth `databaseHooks` we wire up in `src/lib/auth.ts`.
 *
 * These hooks are the migration's main correctness boundary:
 *   - `onUserCreateBefore` enforces OAUTH_ALLOW_NEW_USERS and the global
 *     `enableRegistration` toggle for OAuth-triggered user creation. Pre-migration
 *     this lived in next-auth's signin callback; the new hook needs to behave
 *     identically.
 *   - `onSessionCreated` enforces `isActive`, per-user expiry, and per-userGroup
 *     expiry for EVERY sign-in (credential AND OAuth). Pre-migration this was on
 *     the credential authorize() path only and was missing from OAuth — those
 *     blocked-user-can-still-sign-in-via-OAuth cases are what these tests pin down.
 */

import { onSessionCreated, onUserCreateBefore } from "~/lib/auth";
import { prisma } from "~/server/db";

jest.mock("~/server/db", () => ({
	prisma: {
		user: {
			findUnique: jest.fn(),
			update: jest.fn(),
			count: jest.fn(),
		},
		userGroup: {
			findFirst: jest.fn(),
		},
		userDevice: {
			findUnique: jest.fn(),
			upsert: jest.fn(),
		},
		globalOptions: {
			findFirst: jest.fn(),
		},
	},
}));

jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
}));

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
	jest.clearAllMocks();
	process.env = { ...ENV_BACKUP };
	process.env.NEXTAUTH_URL = "https://ztnet.example";
});

afterAll(() => {
	process.env = ENV_BACKUP;
});

// ─────────────────────────────────────────────────────────────────────────────
// onUserCreateBefore
// ─────────────────────────────────────────────────────────────────────────────

describe("onUserCreateBefore", () => {
	const baseUser = { id: "u1", email: "new@example.com", name: "New User" };

	it("stamps role=ADMIN on the very first user (userCount=0)", async () => {
		(prisma.user.count as jest.Mock).mockResolvedValue(0);
		(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue(null);

		const result = await onUserCreateBefore(baseUser, { path: "/sign-up/email" });
		expect(result.data.role).toBe("ADMIN");
		expect(result.data.firstTime).toBe(true);
		expect(result.data.isActive).toBe(true);
	});

	it("stamps role=USER for subsequent users", async () => {
		(prisma.user.count as jest.Mock).mockResolvedValue(7);
		(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue(null);

		const result = await onUserCreateBefore(baseUser, { path: "/sign-up/email" });
		expect(result.data.role).toBe("USER");
	});

	it("attaches the default user group when one exists", async () => {
		(prisma.user.count as jest.Mock).mockResolvedValue(2);
		(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue({ id: 42 });

		const result = await onUserCreateBefore(baseUser, { path: "/sign-up/email" });
		expect(result.data.userGroupId).toBe(42);
	});

	describe("OAuth flow gating", () => {
		const oauthCtx = { path: "/oauth2/callback/oauth" };

		it("blocks new OAuth users when OAUTH_ALLOW_NEW_USERS=false", async () => {
			process.env.OAUTH_ALLOW_NEW_USERS = "false";
			await expect(onUserCreateBefore(baseUser, oauthCtx)).rejects.toThrow(
				/registration_disabled/,
			);
			expect(prisma.user.count).not.toHaveBeenCalled();
		});

		it("blocks new OAuth users when global enableRegistration is off", async () => {
			process.env.OAUTH_ALLOW_NEW_USERS = "true";
			process.env.OAUTH_EXCLUSIVE_LOGIN = "false";
			(prisma.globalOptions.findFirst as jest.Mock).mockResolvedValue({
				enableRegistration: false,
			});

			await expect(onUserCreateBefore(baseUser, oauthCtx)).rejects.toThrow(
				/registration_disabled/,
			);
		});

		it("allows OAuth users when registration is on", async () => {
			process.env.OAUTH_ALLOW_NEW_USERS = "true";
			process.env.OAUTH_EXCLUSIVE_LOGIN = "false";
			(prisma.globalOptions.findFirst as jest.Mock).mockResolvedValue({
				enableRegistration: true,
			});
			(prisma.user.count as jest.Mock).mockResolvedValue(3);
			(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue(null);

			const result = await onUserCreateBefore(baseUser, oauthCtx);
			expect(result.data.role).toBe("USER");
		});

		it("ignores enableRegistration when OAUTH_EXCLUSIVE_LOGIN=true (OAuth bypasses the global toggle by design)", async () => {
			process.env.OAUTH_ALLOW_NEW_USERS = "true";
			process.env.OAUTH_EXCLUSIVE_LOGIN = "true";
			// globalOptions intentionally not mocked — must not be queried.
			(prisma.user.count as jest.Mock).mockResolvedValue(3);
			(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue(null);

			await expect(onUserCreateBefore(baseUser, oauthCtx)).resolves.toMatchObject({
				data: expect.any(Object),
			});
			expect(prisma.globalOptions.findFirst).not.toHaveBeenCalled();
		});

		it("does NOT enforce OAuth gating on email sign-up paths", async () => {
			// The tRPC `register` procedure handles email registration with its own
			// enableRegistration guard; better-auth's user-create hook should not
			// double-gate it from the credential flow.
			process.env.OAUTH_ALLOW_NEW_USERS = "false";
			(prisma.user.count as jest.Mock).mockResolvedValue(3);
			(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue(null);

			await expect(
				onUserCreateBefore(baseUser, { path: "/sign-up/email" }),
			).resolves.toBeTruthy();
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// onSessionCreated
// ─────────────────────────────────────────────────────────────────────────────

describe("onSessionCreated", () => {
	const ACTIVE_USER = {
		id: "u1",
		email: "u1@example.com",
		isActive: true,
		expiresAt: null,
		role: "USER",
		firstTime: false,
		userGroup: null,
	};

	function makeCtx(
		overrides: Partial<{
			userAgent: string;
			cookieDeviceId: string;
			setCookie: jest.Mock;
		}> = {},
	) {
		const headers = new Headers();
		if (overrides.userAgent !== undefined) {
			headers.set("user-agent", overrides.userAgent);
		} else {
			headers.set("user-agent", "Mozilla/5.0 Chrome Test");
		}
		headers.set("x-forwarded-for", "203.0.113.4");
		if (overrides.cookieDeviceId) {
			headers.set("cookie", `next-auth.did-token=${overrides.cookieDeviceId}`);
		}
		return {
			headers,
			setCookie: overrides.setCookie ?? jest.fn(),
			path: "/sign-in/email",
		};
	}

	it("rejects when the user is missing", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
		await expect(onSessionCreated("missing", makeCtx())).rejects.toThrow(
			/user-not-found/,
		);
	});

	it("rejects credential sign-in when isActive=false", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue({
			...ACTIVE_USER,
			isActive: false,
		});
		await expect(onSessionCreated("u1", makeCtx())).rejects.toThrow(/account-expired/);
		expect(prisma.user.update).not.toHaveBeenCalled(); // bookkeeping never runs
	});

	it("rejects OAuth sign-in when isActive=false (the regression #4)", async () => {
		// Pre-fix, the after-hook only fired on `/sign-in/*` paths so the OAuth
		// callback (`/oauth2/callback/:providerId`) skipped this check entirely
		// and disabled users could log in with OAuth. This test pins the fix down.
		(prisma.user.findUnique as jest.Mock).mockResolvedValue({
			...ACTIVE_USER,
			isActive: false,
		});
		const ctx = makeCtx();
		ctx.path = "/oauth2/callback/oauth";
		await expect(onSessionCreated("u1", ctx)).rejects.toThrow(/account-expired/);
	});

	it("rejects when the user is past expiresAt", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue({
			...ACTIVE_USER,
			expiresAt: new Date(Date.now() - 1000),
		});
		await expect(onSessionCreated("u1", makeCtx())).rejects.toThrow(/account-expired/);
	});

	it("rejects when the user's group is past expiresAt (non-admin)", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue({
			...ACTIVE_USER,
			userGroup: { expiresAt: new Date(Date.now() - 1000) },
		});
		await expect(onSessionCreated("u1", makeCtx())).rejects.toThrow(/account-expired/);
	});

	it("does NOT reject ADMIN even when their userGroup is expired", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue({
			...ACTIVE_USER,
			role: "ADMIN",
			userGroup: { expiresAt: new Date(Date.now() - 1000) },
		});
		(prisma.user.update as jest.Mock).mockResolvedValue({});
		(prisma.userDevice.findUnique as jest.Mock).mockResolvedValue(null);
		(prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});

		await expect(onSessionCreated("u1", makeCtx())).resolves.toBeUndefined();
		expect(prisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "u1" },
				data: expect.objectContaining({ failedLoginAttempts: 0 }),
			}),
		);
	});

	it("resets failedLoginAttempts and stamps lastLogin on success", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(ACTIVE_USER);
		(prisma.user.update as jest.Mock).mockResolvedValue({});
		(prisma.userDevice.findUnique as jest.Mock).mockResolvedValue(null);
		(prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});

		await onSessionCreated("u1", makeCtx());

		const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
		expect(updateCall.where).toEqual({ id: "u1" });
		expect(updateCall.data.failedLoginAttempts).toBe(0);
		expect(updateCall.data.lastFailedLoginAttempt).toBeNull();
		expect(updateCall.data.firstTime).toBe(false);
		expect(updateCall.data.lastLogin).toBeInstanceOf(Date);
	});

	it("upserts a UserDevice using the cookie device id and stamps the IP", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(ACTIVE_USER);
		(prisma.user.update as jest.Mock).mockResolvedValue({});
		(prisma.userDevice.findUnique as jest.Mock).mockResolvedValue(null);
		(prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});

		await onSessionCreated("u1", makeCtx({ cookieDeviceId: "abc123" }));

		expect(prisma.userDevice.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { deviceId: "abc123" },
				create: expect.objectContaining({
					deviceId: "abc123",
					userId: "u1",
					ipAddress: "203.0.113.4",
				}),
			}),
		);
	});

	it("generates a new device id when no cookie is present and writes it via ctx.setCookie", async () => {
		// This is the fix for #6 — pre-fix, the device cookie was written via a
		// non-public `ctx.context.responseHeaders` API and frequently lost. We now
		// use better-auth's documented `ctx.setCookie(name, value, opts)`.
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(ACTIVE_USER);
		(prisma.user.update as jest.Mock).mockResolvedValue({});
		(prisma.userDevice.findUnique as jest.Mock).mockResolvedValue(null);
		(prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});

		const setCookie = jest.fn();
		await onSessionCreated("u1", makeCtx({ setCookie }));

		expect(setCookie).toHaveBeenCalledTimes(1);
		const [cookieName, cookieValue, opts] = setCookie.mock.calls[0];
		expect(cookieName).toBe("next-auth.did-token");
		expect(typeof cookieValue).toBe("string");
		expect(cookieValue.length).toBeGreaterThan(8);
		expect(opts).toEqual(
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
				path: "/",
			}),
		);
	});

	it("does NOT call ctx.setCookie when an existing device cookie is present", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(ACTIVE_USER);
		(prisma.user.update as jest.Mock).mockResolvedValue({});
		(prisma.userDevice.findUnique as jest.Mock).mockResolvedValue({
			ipAddress: "203.0.113.4",
		});
		(prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});

		const setCookie = jest.fn();
		await onSessionCreated(
			"u1",
			makeCtx({ setCookie, cookieDeviceId: "existing-device" }),
		);

		expect(setCookie).not.toHaveBeenCalled();
	});

	it("skips device tracking entirely when no user-agent is present (e.g. some API consumers)", async () => {
		(prisma.user.findUnique as jest.Mock).mockResolvedValue(ACTIVE_USER);
		(prisma.user.update as jest.Mock).mockResolvedValue({});

		await onSessionCreated("u1", makeCtx({ userAgent: "" }));
		expect(prisma.userDevice.upsert).not.toHaveBeenCalled();
	});
});
