/**
 * Drives the real Better Auth OAuth callback end to end, with the identity
 * provider and the database replaced by in-memory stand-ins, and pins down what
 * the browser is sent when ztnet's hooks reject the login:
 *
 *   - OAUTH_ALLOW_NEW_USERS=false: an unknown IdP user is redirected back to the
 *     login page with `?error=registration_disabled`, and no user row is written.
 *   - a disabled user with a linked account is redirected with
 *     `?error=account-expired`, and no session row is written.
 *   - the positive control: a new user is created and sent to the callbackURL.
 *
 * Better Auth only redirects when the thrown APIError carries a `code`; without
 * it the browser would get a raw JSON 403 from /api/auth/callback/oauth. That
 * contract is what these tests protect.
 */

// Type-only import: erased at runtime, so the auth module is still loaded only
// after the env is set up below. It also makes this file a module, keeping its
// top-level constants out of the global scope shared with script-style tests.
import type * as AuthModule from "~/lib/auth";

jest.mock("~/utils/mail", () => ({ sendMailWithTemplate: jest.fn() }));

jest.mock("~/server/db", () => {
	// Minimal in-memory Prisma: enough of the query API for Better Auth's prisma
	// adapter and ztnet's own hooks (create/find/update/upsert/delete/count with
	// equals/in/not/AND/OR filters and `select` projection).
	const tables = new Map<string, Record<string, unknown>[]>();
	const rows = (m: string) => {
		if (!tables.has(m)) tables.set(m, []);
		return tables.get(m) as Record<string, unknown>[];
	};
	const same = (a: unknown, b: unknown) =>
		a instanceof Date && b instanceof Date ? +a === +b : a === b;
	const matchValue = (v: unknown, cond: unknown): boolean => {
		if (cond === null || typeof cond !== "object" || cond instanceof Date)
			return same(v, cond);
		const c = cond as Record<string, unknown>;
		if ("equals" in c) return same(v, c.equals);
		if ("in" in c) return (c.in as unknown[]).some((x) => same(v, x));
		if ("notIn" in c) return !(c.notIn as unknown[]).some((x) => same(v, x));
		if ("not" in c) return !matchValue(v, c.not);
		if ("contains" in c) return String(v).includes(String(c.contains));
		if ("startsWith" in c) return String(v).startsWith(String(c.startsWith));
		if ("endsWith" in c) return String(v).endsWith(String(c.endsWith));
		if ("gt" in c) return (v as number) > (c.gt as number);
		if ("gte" in c) return (v as number) >= (c.gte as number);
		if ("lt" in c) return (v as number) < (c.lt as number);
		if ("lte" in c) return (v as number) <= (c.lte as number);
		return false;
	};
	const matches = (
		row: Record<string, unknown>,
		where: Record<string, unknown> = {},
	): boolean =>
		Object.entries(where).every(([k, cond]) => {
			if (k === "AND")
				return (cond as Record<string, unknown>[]).every((w) => matches(row, w));
			if (k === "OR")
				return (cond as Record<string, unknown>[]).some((w) => matches(row, w));
			if (k === "NOT") return !matches(row, cond as Record<string, unknown>);
			return matchValue(row[k], cond);
		});
	const pick = (row: Record<string, unknown>, select?: Record<string, unknown>) =>
		select
			? Object.fromEntries(
					Object.keys(select)
						.filter((k) => select[k])
						.map((k) => [k, row[k]]),
				)
			: { ...row };
	let seq = 0;
	type Args = {
		where?: Record<string, unknown>;
		data?: Record<string, unknown>;
		select?: Record<string, unknown>;
		create?: Record<string, unknown>;
		update?: Record<string, unknown>;
		take?: number;
	};
	const model = (m: string) => {
		const find = (where?: Record<string, unknown>) =>
			rows(m).find((r) => matches(r, where));
		return {
			create: async ({ data = {}, select }: Args) => {
				const row = { id: `${m}_${++seq}`, ...data };
				rows(m).push(row);
				return pick(row, select);
			},
			findFirst: async ({ where, select }: Args = {}) => {
				const r = find(where);
				return r ? pick(r, select) : null;
			},
			findUnique: async ({ where, select }: Args = {}) => {
				const r = find(where);
				return r ? pick(r, select) : null;
			},
			findMany: async ({ where, select, take }: Args = {}) =>
				rows(m)
					.filter((r) => matches(r, where))
					.slice(0, take ?? undefined)
					.map((r) => pick(r, select)),
			count: async ({ where }: Args = {}) =>
				rows(m).filter((r) => matches(r, where)).length,
			update: async ({ where, data = {}, select }: Args) => {
				const r = find(where);
				if (!r) throw new Error(`fake prisma: ${m} row not found for update`);
				Object.assign(r, data);
				return pick(r, select);
			},
			updateMany: async ({ where, data = {} }: Args) => {
				const hit = rows(m).filter((r) => matches(r, where));
				for (const r of hit) Object.assign(r, data);
				return { count: hit.length };
			},
			upsert: async ({ where, create = {}, update = {} }: Args) => {
				const r = find(where);
				if (r) {
					Object.assign(r, update);
					return { ...r };
				}
				const row = { id: `${m}_${++seq}`, ...create };
				rows(m).push(row);
				return { ...row };
			},
			delete: async ({ where }: Args) => {
				const r = find(where);
				if (r) rows(m).splice(rows(m).indexOf(r), 1);
				return r ?? null;
			},
			deleteMany: async ({ where }: Args = {}) => {
				const hit = rows(m).filter((r) => matches(r, where));
				for (const r of hit) rows(m).splice(rows(m).indexOf(r), 1);
				return { count: hit.length };
			},
		};
	};
	const prisma: Record<string, unknown> = new Proxy(
		{},
		{
			get: (_t, prop: string) => {
				if (prop === "$transaction")
					return async (arg: unknown) =>
						typeof arg === "function"
							? arg(prisma)
							: Promise.all(arg as Promise<unknown>[]);
				if (prop === "then") return undefined;
				return model(prop);
			},
		},
	);
	return { prisma, __tables: tables };
});

const ENV_BACKUP = { ...process.env };
const BASE = "http://localhost:3000";
const IDP = "https://idp.example";

let authModule: typeof AuthModule;
let tables: Map<string, Record<string, unknown>[]>;
let idpProfile: Record<string, unknown>;

beforeAll(async () => {
	process.env.NEXTAUTH_SECRET = "random_secret";
	process.env.NEXTAUTH_URL = BASE;
	process.env.OAUTH_ID = "client-id";
	process.env.OAUTH_SECRET = "client-secret";
	process.env.OAUTH_AUTHORIZATION_URL = `${IDP}/authorize`;
	process.env.OAUTH_ACCESS_TOKEN_URL = `${IDP}/token`;
	process.env.OAUTH_USER_INFO = `${IDP}/userinfo`;
	process.env.OAUTH_EXCLUSIVE_LOGIN = "false";
	authModule = await import("~/lib/auth");
	tables = (jest.requireMock("~/server/db") as { __tables: typeof tables }).__tables;

	// The identity provider: token exchange and userinfo, nothing else.
	jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.toString()
					: input.url;
		if (url.startsWith(`${IDP}/token`)) {
			return Response.json({
				access_token: "access-token",
				token_type: "Bearer",
				expires_in: 3600,
				scope: "openid profile email",
			});
		}
		if (url.startsWith(`${IDP}/userinfo`)) return Response.json(idpProfile);
		return new Response("unexpected fetch in test", { status: 404 });
	});
});

afterAll(() => {
	process.env = ENV_BACKUP;
	jest.restoreAllMocks();
});

beforeEach(() => {
	tables.clear();
	tables.set("globalOptions", [{ id: 1, enableRegistration: true }]);
	idpProfile = {
		id: "idp-user-1",
		email: "oauth.user@example.com",
		email_verified: true,
		name: "OAuth User",
	};
});

const call = (path: string, init?: RequestInit) =>
	authModule.auth.handler(new Request(`${BASE}/api/auth${path}`, init));

/** Runs the browser side of the flow: sign-in/social, IdP "login", callback. */
async function completeOAuthLogin() {
	const start = await call("/sign-in/social", {
		method: "POST",
		headers: { "content-type": "application/json", origin: BASE },
		body: JSON.stringify({
			provider: "oauth",
			callbackURL: "/network",
			errorCallbackURL: "/auth/login",
		}),
	});
	expect(start.status).toBe(200);
	const { url } = (await start.json()) as { url: string };
	const authorize = new URL(url);
	expect(authorize.searchParams.get("redirect_uri")).toBe(
		`${BASE}/api/auth/callback/oauth`,
	);
	const state = authorize.searchParams.get("state");
	const cookie = start.headers
		.getSetCookie()
		.map((c) => c.split(";")[0])
		.join("; ");
	const callback = await call(`/callback/oauth?code=test-code&state=${state}`, {
		headers: { cookie },
	});
	return {
		status: callback.status,
		location: new URL(callback.headers.get("location") ?? "", BASE),
	};
}

describe("OAuth callback gating through the real Better Auth handler", () => {
	it("creates and signs in a new user when registration is allowed (control)", async () => {
		process.env.OAUTH_ALLOW_NEW_USERS = "true";
		const result = await completeOAuthLogin();
		expect(result.status).toBe(302);
		expect(result.location.pathname).toBe("/network");
		expect(tables.get("user")).toHaveLength(1);
		// The first user of an empty install is promoted to ADMIN by the hook.
		expect(tables.get("user")?.[0]).toMatchObject({
			email: "oauth.user@example.com",
			role: "ADMIN",
			isActive: true,
			firstTime: false,
		});
		expect(tables.get("account")?.[0]).toMatchObject({
			providerId: "oauth",
			accountId: "idp-user-1",
		});
		expect(tables.get("session")).toHaveLength(1);
	});

	it("sends a new user to the login page with registration_disabled when OAUTH_ALLOW_NEW_USERS=false", async () => {
		process.env.OAUTH_ALLOW_NEW_USERS = "false";
		const result = await completeOAuthLogin();
		expect(result.status).toBe(302);
		expect(result.location.pathname).toBe("/auth/login");
		expect(result.location.searchParams.get("error")).toBe("registration_disabled");
		expect(tables.get("user") ?? []).toHaveLength(0);
		expect(tables.get("session") ?? []).toHaveLength(0);
	});

	it("sends a new user to the login page when the global registration toggle is off", async () => {
		process.env.OAUTH_ALLOW_NEW_USERS = "true";
		tables.set("globalOptions", [{ id: 1, enableRegistration: false }]);
		const result = await completeOAuthLogin();
		expect(result.status).toBe(302);
		expect(result.location.pathname).toBe("/auth/login");
		expect(result.location.searchParams.get("error")).toBe("registration_disabled");
		expect(tables.get("user") ?? []).toHaveLength(0);
	});

	it("sends a disabled existing user to the login page with account-expired", async () => {
		process.env.OAUTH_ALLOW_NEW_USERS = "false";
		tables.set("user", [
			{
				id: "user-disabled",
				name: "Disabled",
				email: "oauth.user@example.com",
				emailVerified: true,
				role: "USER",
				isActive: false,
				firstTime: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		tables.set("account", [
			{
				id: "acc-disabled",
				userId: "user-disabled",
				providerId: "oauth",
				accountId: "idp-user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const result = await completeOAuthLogin();
		expect(result.status).toBe(302);
		expect(result.location.pathname).toBe("/auth/login");
		expect(result.location.searchParams.get("error")).toBe("account-expired");
		expect(tables.get("session") ?? []).toHaveLength(0);
	});
});
