/**
 * Drives the real Better Auth instance from `src/lib/auth.ts` through its HTTP
 * handler, so the allowlist is tested as wired, not only as a function.
 *
 * Pins down:
 *   1. A token forged with a known NEXTAUTH_SECRET cannot sign anyone in through
 *      Better Auth's verify-email route.
 *   2. A signed in user cannot reach update-user or sign-up to set internal fields.
 *   3. Every allowlisted path is a real Better Auth route, so a rename in a
 *      Better Auth upgrade fails here instead of silently breaking login.
 *   4. Internal user fields are never accepted from request bodies.
 */
import jwt from "jsonwebtoken";

jest.mock("~/server/db", () => ({ prisma: {} }));
jest.mock("~/utils/mail", () => ({ sendMailWithTemplate: jest.fn() }));

const ENV_BACKUP = { ...process.env };
const SECRET = "random_secret";

let authModule: typeof import("~/lib/auth");

beforeAll(async () => {
	process.env.NEXTAUTH_SECRET = SECRET;
	process.env.NEXTAUTH_URL = "http://localhost:3000";
	// Enable the genericOAuth plugin so its routes exist for the path checks.
	process.env.OAUTH_ID = "client-id";
	process.env.OAUTH_SECRET = "client-secret";
	process.env.OAUTH_AUTHORIZATION_URL = "https://idp.example/authorize";
	process.env.OAUTH_ACCESS_TOKEN_URL = "https://idp.example/token";
	authModule = await import("~/lib/auth");
});

afterAll(() => {
	process.env = ENV_BACKUP;
});

const call = (path: string, init?: RequestInit) =>
	authModule.auth.handler(new Request(`http://localhost:3000/api/auth${path}`, init));

const postJson = (body: unknown): RequestInit => ({
	method: "POST",
	headers: { "content-type": "application/json", origin: "http://localhost:3000" },
	body: JSON.stringify(body),
});

describe("Better Auth route surface", () => {
	it("refuses a verify-email token forged with the public secret", async () => {
		const forged = jwt.sign(
			{
				email: "admin@example.com",
				updateTo: "admin@example.com",
				requestType: "change-email-verification",
			},
			SECRET,
			{ algorithm: "HS256", expiresIn: "1h" },
		);

		const res = await call(`/verify-email?token=${forged}`);

		expect(res.status).toBe(404);
		expect(res.headers.getSetCookie()).toEqual([]);
	});

	it("refuses update-user and sign-up over HTTP", async () => {
		expect((await call("/update-user", postJson({ role: "ADMIN" }))).status).toBe(404);
		expect(
			(
				await call(
					"/sign-up/email",
					postJson({ email: "a@example.com", password: "Password123!", name: "a" }),
				)
			).status,
		).toBe(404);
	});

	it("still serves allowlisted routes", async () => {
		expect((await call("/ok")).status).toBe(200);
	});

	it("allowlists only paths Better Auth actually mounts", () => {
		const mounted = new Set(
			Object.values(authModule.auth.api as Record<string, { path?: string }>)
				.map((endpoint) => endpoint?.path)
				.filter(Boolean),
		);
		for (const path of authModule.ALLOWED_AUTH_HTTP_PATHS) {
			expect(mounted).toContain(path);
		}
		// The routes behind the reported takeover exist and stay blocked.
		for (const path of [
			"/verify-email",
			"/update-user",
			"/sign-up/email",
			"/change-email",
		]) {
			expect(mounted).toContain(path);
			expect(authModule.ALLOWED_AUTH_HTTP_PATHS.has(path)).toBe(false);
		}
	});

	it("never accepts internal user fields from request input", () => {
		const fields = authModule.auth.options.user?.additionalFields ?? {};
		expect(Object.keys(fields)).toEqual(
			expect.arrayContaining([
				"role",
				"isActive",
				"hash",
				"userGroupId",
				"twoFactorEnabled",
			]),
		);
		for (const [name, field] of Object.entries(
			fields as Record<string, { input?: boolean }>,
		)) {
			expect({ name, input: field.input }).toEqual({ name, input: false });
		}
	});
});
