/**
 * Pins down the genericOAuth plugin config that gets handed to better-auth.
 *
 * `auth.options.plugins[0].options.config[0]` is the actual contract better-auth
 * sees. If any of these fields drifts, the OAuth flow fails in subtle ways:
 *   - PKCE off → vulnerable to authorization-code interception attacks AND breaks
 *     IdPs that require PKCE (Microsoft, modern Keycloak realms).
 *   - Wrong redirectURI → IdP returns redirect_uri_mismatch.
 *   - Missing discoveryUrl when OAUTH_WELLKNOWN is set → no discovery, broken setup.
 *   - Wrong scopes parsing → IdPs reject unknown scope values.
 *   - Missing trustedProviders → email-verification gating blocks linking when
 *     OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING is on.
 *
 * These tests load `auth` AFTER setting env vars (using jest.isolateModules) so
 * we can assert different env configurations without polluting the singleton.
 */

// Snapshot the keys we mutate so we can restore them. Avoid `process.env = {...}`
// because Node's process.env is a special proxy and full reassignment doesn't
// propagate cleanly to child requires.
const ENV_KEYS = [
	"OAUTH_ID",
	"OAUTH_SECRET",
	"OAUTH_WELLKNOWN",
	"OAUTH_AUTHORIZATION_URL",
	"OAUTH_ACCESS_TOKEN_URL",
	"OAUTH_USER_INFO",
	"OAUTH_SCOPE",
	"OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING",
	"OAUTH_ALLOW_NEW_USERS",
	"OAUTH_EXCLUSIVE_LOGIN",
	"NEXTAUTH_URL",
] as const;
const ENV_BACKUP = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
	jest.resetModules();
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

function loadAuth() {
	let exported: typeof import("~/lib/auth") | undefined;
	jest.isolateModules(() => {
		exported = require("~/lib/auth");
	});
	if (!exported) throw new Error("loadAuth failed");
	return exported;
}

function getGenericOAuthConfig() {
	const { auth } = loadAuth();
	// biome-ignore lint/suspicious/noExplicitAny: better-auth's BetterAuthOptions['plugins'] is generic
	const plugins = (auth.options as any).plugins as Array<{
		id: string;
		options?: { config?: unknown[] };
	}>;
	const generic = plugins.find((p) => p.id === "generic-oauth");
	return generic?.options?.config?.[0] as Record<string, unknown> | undefined;
}

describe("genericOAuth plugin: presence", () => {
	it("registers the plugin when both OAUTH_ID and OAUTH_SECRET are set", () => {
		process.env.OAUTH_ID = "client_id";
		process.env.OAUTH_SECRET = "client_secret";
		process.env.NEXTAUTH_URL = "https://ztnet.example";

		expect(getGenericOAuthConfig()).toBeDefined();
	});

	it("is NOT registered when OAUTH_ID is empty/falsy", () => {
		// next/jest reloads .env on resetModules, so `delete` doesn't stick — set
		// to an empty string instead. `!""` is true, which is what
		// buildGenericOAuthPlugin guards on.
		process.env.OAUTH_ID = "";
		process.env.OAUTH_SECRET = "client_secret";
		process.env.NEXTAUTH_URL = "https://ztnet.example";

		const { auth } = loadAuth();
		// biome-ignore lint/suspicious/noExplicitAny: see above
		const plugins = (auth.options as any).plugins as Array<{ id: string }>;
		expect(plugins.find((p) => p.id === "generic-oauth")).toBeUndefined();
	});

	it("is NOT registered when OAUTH_SECRET is empty/falsy", () => {
		process.env.OAUTH_ID = "client_id";
		process.env.OAUTH_SECRET = "";
		process.env.NEXTAUTH_URL = "https://ztnet.example";

		const { auth } = loadAuth();
		// biome-ignore lint/suspicious/noExplicitAny: see above
		const plugins = (auth.options as any).plugins as Array<{ id: string }>;
		expect(plugins.find((p) => p.id === "generic-oauth")).toBeUndefined();
	});
});

describe("genericOAuth plugin: required config shape", () => {
	beforeEach(() => {
		process.env.OAUTH_ID = "client_id";
		process.env.OAUTH_SECRET = "client_secret";
		process.env.NEXTAUTH_URL = "https://ztnet.example";
	});

	it("uses providerId='oauth' to match the legacy ztnet provider id", () => {
		expect(getGenericOAuthConfig()?.providerId).toBe("oauth");
	});

	it("enables PKCE (next-auth had `checks: ['state','pkce']`; better-auth's default is OFF)", () => {
		expect(getGenericOAuthConfig()?.pkce).toBe(true);
	});

	it("pins redirectURI to the URL documented at https://ztnet.network/authentication/oauth", () => {
		expect(getGenericOAuthConfig()?.redirectURI).toBe(
			"https://ztnet.example/api/auth/callback/oauth",
		);
	});

	it("forwards clientId and clientSecret from env", () => {
		const cfg = getGenericOAuthConfig();
		expect(cfg?.clientId).toBe("client_id");
		expect(cfg?.clientSecret).toBe("client_secret");
	});
});

describe("genericOAuth plugin: env var → config wiring", () => {
	beforeEach(() => {
		process.env.OAUTH_ID = "client_id";
		process.env.OAUTH_SECRET = "client_secret";
		process.env.NEXTAUTH_URL = "https://ztnet.example";
	});

	it("OAUTH_WELLKNOWN → discoveryUrl (OIDC providers like Keycloak / Authentik / Azure)", () => {
		process.env.OAUTH_WELLKNOWN =
			"https://idp.example/realms/main/.well-known/openid-configuration";
		const cfg = getGenericOAuthConfig();
		expect(cfg?.discoveryUrl).toBe(
			"https://idp.example/realms/main/.well-known/openid-configuration",
		);
		// authorizationUrl/tokenUrl/userInfoUrl can stay undefined — discovery fills them.
	});

	it("OAUTH_AUTHORIZATION_URL / OAUTH_ACCESS_TOKEN_URL / OAUTH_USER_INFO → standard OAuth 2.0 endpoints", () => {
		process.env.OAUTH_AUTHORIZATION_URL = "https://github.com/login/oauth/authorize";
		process.env.OAUTH_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
		process.env.OAUTH_USER_INFO = "https://api.github.com/user";

		const cfg = getGenericOAuthConfig();
		expect(cfg?.authorizationUrl).toBe("https://github.com/login/oauth/authorize");
		expect(cfg?.tokenUrl).toBe("https://github.com/login/oauth/access_token");
		expect(cfg?.userInfoUrl).toBe("https://api.github.com/user");
	});

	it("OAUTH_SCOPE='read:user user:email' → split into the array better-auth expects", () => {
		process.env.OAUTH_SCOPE = "read:user user:email";
		expect(getGenericOAuthConfig()?.scopes).toEqual(["read:user", "user:email"]);
	});

	// Default-when-unset is covered in `oauthProfileMapping.test.ts` against
	// `parseOAuthScopes()` directly. We can't repeat it here because next/jest
	// reloads .env on `resetModules`, putting OAUTH_SCOPE back if it's defined
	// in the user's local .env file.

	it("`mapProfileToUser` is wired and uses the documented fallback chain", () => {
		const cfg = getGenericOAuthConfig();
		const fn = cfg?.mapProfileToUser as (p: Record<string, unknown>) => {
			name: string;
			email: unknown;
		};
		expect(typeof fn).toBe("function");
		expect(fn({ login: "x" }).name).toBe("x");
	});
});

describe("accountLinking config (OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING)", () => {
	beforeEach(() => {
		process.env.OAUTH_ID = "client_id";
		process.env.OAUTH_SECRET = "client_secret";
		process.env.NEXTAUTH_URL = "https://ztnet.example";
	});

	it("enables account linking when OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING=true (the historical default)", () => {
		process.env.OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING = "true";
		const { auth } = loadAuth();
		// biome-ignore lint/suspicious/noExplicitAny: better-auth account options
		expect((auth.options as any).account.accountLinking.enabled).toBe(true);
	});

	it("disables account linking when OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING=false", () => {
		process.env.OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING = "false";
		const { auth } = loadAuth();
		// biome-ignore lint/suspicious/noExplicitAny: see above
		expect((auth.options as any).account.accountLinking.enabled).toBe(false);
	});

	it("lists 'oauth' as a trusted provider so unverified IdP emails can still link", () => {
		const { auth } = loadAuth();
		// biome-ignore lint/suspicious/noExplicitAny: see above
		expect((auth.options as any).account.accountLinking.trustedProviders).toContain(
			"oauth",
		);
	});
});
