/**
 * `mapOAuthProfileToUser` runs on every OAuth callback. The fallback chain
 * matters because each provider documented at
 * https://ztnet.network/authentication/oauth exposes the user identity through
 * a different field name. A regression here would either store the wrong
 * display name or reject the whole sign-in (if email is missing).
 */
import { mapOAuthProfileToUser, parseOAuthScopes } from "~/lib/auth";

const SCOPE_BACKUP = process.env.OAUTH_SCOPE;

beforeEach(() => {
	// biome-ignore lint/performance/noDelete: must actually unset the env key
	delete process.env.OAUTH_SCOPE;
});

afterAll(() => {
	if (SCOPE_BACKUP === undefined) {
		// biome-ignore lint/performance/noDelete: must actually unset the env key
		delete process.env.OAUTH_SCOPE;
	} else {
		process.env.OAUTH_SCOPE = SCOPE_BACKUP;
	}
});

describe("mapOAuthProfileToUser", () => {
	it("uses `name` when present (Keycloak / Authentik / Azure AD)", () => {
		expect(
			mapOAuthProfileToUser({
				name: "Alice Example",
				email: "alice@example.com",
				picture: "https://idp/pic.png",
			}),
		).toEqual({
			name: "Alice Example",
			email: "alice@example.com",
			image: "https://idp/pic.png",
		});
	});

	it("falls back to `login` for GitHub profiles (which omit `name` for many users)", () => {
		expect(
			mapOAuthProfileToUser({
				login: "alice-gh",
				email: "alice@example.com",
				avatar_url: "https://github.com/alice.png",
			}),
		).toEqual({
			name: "alice-gh",
			email: "alice@example.com",
			image: "https://github.com/alice.png",
		});
	});

	it("falls back to `username` for Discord profiles", () => {
		expect(
			mapOAuthProfileToUser({
				username: "alice#1234",
				email: "alice@example.com",
			}),
		).toMatchObject({ name: "alice#1234" });
	});

	it("falls back to the email local-part when the profile has no name fields", () => {
		expect(mapOAuthProfileToUser({ email: "alice@example.com" })).toMatchObject({
			name: "alice",
		});
	});

	it("uses the literal 'OAuth User' as last resort (extreme edge case — IdPs that return no name AND no email)", () => {
		expect(mapOAuthProfileToUser({})).toMatchObject({ name: "OAuth User" });
	});

	it("prefers `picture` (OIDC) over `avatar_url` (GitHub) over `image_url`", () => {
		expect(
			mapOAuthProfileToUser({
				name: "x",
				picture: "p",
				avatar_url: "a",
				image_url: "i",
			}),
		).toMatchObject({ image: "p" });
		expect(
			mapOAuthProfileToUser({ name: "x", avatar_url: "a", image_url: "i" }),
		).toMatchObject({ image: "a" });
		expect(mapOAuthProfileToUser({ name: "x", image_url: "i" })).toMatchObject({
			image: "i",
		});
	});

	it("returns image=undefined when the profile has no image fields", () => {
		expect(mapOAuthProfileToUser({ name: "x", email: "x@y.com" }).image).toBeUndefined();
	});
});

describe("parseOAuthScopes", () => {
	it("defaults to the OIDC trio when OAUTH_SCOPE is unset", () => {
		jest.replaceProperty(process, "env", { ...process.env });
		// biome-ignore lint/performance/noDelete: must actually unset the env key
		delete process.env.OAUTH_SCOPE;
		expect(parseOAuthScopes()).toEqual(["openid", "profile", "email"]);
	});

	it("splits a single-spaced value (the canonical form documented for ztnet)", () => {
		process.env.OAUTH_SCOPE = "openid profile email";
		expect(parseOAuthScopes()).toEqual(["openid", "profile", "email"]);
	});

	it("handles GitHub's 'read:user user:email' (colon-containing scopes)", () => {
		process.env.OAUTH_SCOPE = "read:user user:email";
		expect(parseOAuthScopes()).toEqual(["read:user", "user:email"]);
	});

	it("collapses extra whitespace so user typos don't produce empty scopes", () => {
		// `["", "openid", "", "profile", ""]` would crash the IdP request.
		process.env.OAUTH_SCOPE = "  openid   profile email ";
		expect(parseOAuthScopes()).toEqual(["openid", "profile", "email"]);
	});

	it("supports a single scope (Discord 'identify' or Facebook 'email')", () => {
		process.env.OAUTH_SCOPE = "email";
		expect(parseOAuthScopes()).toEqual(["email"]);
	});
});
