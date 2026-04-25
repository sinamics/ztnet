/**
 * Pins down the OAuth config-shape contract for the genericOAuth plugin.
 *
 * These are configuration assertions, not behaviour tests — they exist to catch
 * silent regressions on the things that broke in production during the
 * next-auth → better-auth migration:
 *
 *   - PKCE was off by default in `genericOAuth` (next-auth had it on); we re-enable it.
 *   - The default callback URL changed from `/api/auth/callback/oauth` (next-auth)
 *     to `/api/auth/oauth2/callback/oauth` (better-auth). Pinning `redirectURI`
 *     to the legacy path keeps existing IdP registrations working — see also the
 *     Next.js rewrite in `next.config.mjs`.
 *
 * If any of these constants drifts, every self-hosted ztnet install will fail
 * to log in via OAuth.
 */

import {
	OAUTH_PROVIDER_ID,
	auth,
	isOAuthAllowNewUsers,
	isOAuthExclusiveLogin,
	legacyOAuthRedirectURI,
} from "~/lib/auth";

describe("OAuth configuration shape", () => {
	const ENV_BACKUP = { ...process.env };

	beforeEach(() => {
		process.env = { ...ENV_BACKUP };
	});

	afterAll(() => {
		process.env = ENV_BACKUP;
	});

	describe("legacyOAuthRedirectURI()", () => {
		it("returns the legacy /api/auth/callback/<providerId> path", () => {
			process.env.NEXTAUTH_URL = "https://ztnet.example.com";
			expect(legacyOAuthRedirectURI()).toBe(
				"https://ztnet.example.com/api/auth/callback/oauth",
			);
		});

		it("strips a trailing slash from NEXTAUTH_URL so the path is well-formed", () => {
			process.env.NEXTAUTH_URL = "https://ztnet.example.com/";
			expect(legacyOAuthRedirectURI()).toBe(
				"https://ztnet.example.com/api/auth/callback/oauth",
			);
		});

		it("returns undefined when NEXTAUTH_URL is missing (test/build env)", () => {
			// biome-ignore lint/performance/noDelete: must actually unset the env key
			delete process.env.NEXTAUTH_URL;
			expect(legacyOAuthRedirectURI()).toBeUndefined();
		});
	});

	describe("OAUTH_PROVIDER_ID", () => {
		it("matches the legacy provider id `oauth` so existing DB rows + UI translations stay valid", () => {
			expect(OAUTH_PROVIDER_ID).toBe("oauth");
		});
	});

	describe("isOAuthAllowNewUsers()", () => {
		it("defaults to true (matches pre-migration behaviour)", () => {
			// biome-ignore lint/performance/noDelete: must actually unset the env key
			delete process.env.OAUTH_ALLOW_NEW_USERS;
			expect(isOAuthAllowNewUsers()).toBe(true);
		});

		it("returns false only when explicitly set to 'false' (case-insensitive)", () => {
			process.env.OAUTH_ALLOW_NEW_USERS = "false";
			expect(isOAuthAllowNewUsers()).toBe(false);
			process.env.OAUTH_ALLOW_NEW_USERS = "FALSE";
			expect(isOAuthAllowNewUsers()).toBe(false);
		});

		it("returns true for any other value", () => {
			process.env.OAUTH_ALLOW_NEW_USERS = "yes";
			expect(isOAuthAllowNewUsers()).toBe(true);
			process.env.OAUTH_ALLOW_NEW_USERS = "true";
			expect(isOAuthAllowNewUsers()).toBe(true);
		});
	});

	describe("session config", () => {
		it("disables cookieCache so isActive/requestChangePassword flips take effect immediately", () => {
			// If cookieCache is enabled, an admin disabling a user via /api/auth/admin
			// or our own update mutations would leave the user authenticated for up
			// to `maxAge` seconds (5 min default). For ztnet that's a security
			// regression vs. next-auth, which read from DB on every session call.
			expect(
				(auth.options.session as { cookieCache?: { enabled?: boolean } })?.cookieCache
					?.enabled,
			).toBe(false);
		});
	});

	describe("isOAuthExclusiveLogin()", () => {
		it("defaults to false", () => {
			// biome-ignore lint/performance/noDelete: must actually unset the env key
			delete process.env.OAUTH_EXCLUSIVE_LOGIN;
			expect(isOAuthExclusiveLogin()).toBe(false);
		});

		it("returns true when explicitly set (case-insensitive)", () => {
			process.env.OAUTH_EXCLUSIVE_LOGIN = "true";
			expect(isOAuthExclusiveLogin()).toBe(true);
			process.env.OAUTH_EXCLUSIVE_LOGIN = "TRUE";
			expect(isOAuthExclusiveLogin()).toBe(true);
		});
	});
});
