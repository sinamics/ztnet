/**
 * Regression guard for a real vulnerability.
 *
 * Prisma compiles `{ email: { equals: x, mode: "insensitive" } }` to
 * `email ILIKE $1`, where `%` and `_` inside the *value* are LIKE wildcards.
 * Binding the value as a parameter does not change that.
 *
 * The credential sign-in pre-flight hook resolves the account with this lookup
 * and then REWRITES the matched row's email, using an address straight off an
 * unvalidated request body. With an ILIKE, `{"email": "%@some-domain.com"}`
 * matched a real account and would have overwritten that victim's address,
 * unauthenticated. Zod does not close it on the validated paths either: it
 * rejects `%` but accepts `_`, which is legal in an address and still a
 * single-character wildcard.
 *
 * These tests pin the SQL shape, so switching back to `mode: "insensitive"`
 * fails here rather than silently in production.
 */
import {
	findUserIdsByEmail,
	emailIsTaken,
	findUniqueUserIdByEmail,
} from "~/server/api/services/userEmailLookup";

type QueryRawMock = jest.Mock & { lastSql?: string; lastValues?: unknown[] };

function makePrisma(rows: { id: string }[]) {
	const $queryRaw = jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
		($queryRaw as QueryRawMock).lastSql = strings.join("?");
		($queryRaw as QueryRawMock).lastValues = values;
		return Promise.resolve(rows);
	}) as QueryRawMock;
	// biome-ignore lint/suspicious/noExplicitAny: minimal PrismaClient stand-in
	return { $queryRaw } as any;
}

describe("findUserIdsByEmail", () => {
	it("uses lower() equality, never LIKE/ILIKE", async () => {
		const prisma = makePrisma([]);
		await findUserIdsByEmail(prisma, "user@example.com");

		const sql: string = prisma.$queryRaw.lastSql;
		expect(sql.toUpperCase()).not.toContain("LIKE");
		expect(sql.toLowerCase()).toContain('lower("email") = lower(');
	});

	it("passes the address as a bound parameter, not inlined into the SQL", async () => {
		const prisma = makePrisma([]);
		await findUserIdsByEmail(prisma, "user@example.com");

		expect(prisma.$queryRaw.lastSql).not.toContain("user@example.com");
		expect(prisma.$queryRaw.lastValues).toContain("user@example.com");
	});

	it("normalizes the address before querying", async () => {
		const prisma = makePrisma([]);
		await findUserIdsByEmail(prisma, "  User@Example.COM  ");

		expect(prisma.$queryRaw.lastValues[0]).toBe("user@example.com");
	});

	it.each([
		["%@example.com", "% wildcard spanning a whole domain"],
		["vict_m@example.com", "_ wildcard, which zod's .email() accepts"],
		["%", "bare wildcard"],
	])("passes %s through as a literal (%s)", async (payload) => {
		const prisma = makePrisma([]);
		await findUserIdsByEmail(prisma, payload);

		// The payload reaches the DB as a value compared with `=`, so Postgres
		// gives it no pattern meaning.
		expect(prisma.$queryRaw.lastValues[0]).toBe(payload.trim().toLowerCase());
		expect(prisma.$queryRaw.lastSql.toUpperCase()).not.toContain("LIKE");
	});

	it("caps the rows read so an ambiguous match cannot scan the table", async () => {
		const prisma = makePrisma([]);
		await findUserIdsByEmail(prisma, "user@example.com", 2);

		expect(prisma.$queryRaw.lastSql.toUpperCase()).toContain("LIMIT");
		expect(prisma.$queryRaw.lastValues).toContain(2);
	});

	it("returns just the ids", async () => {
		const prisma = makePrisma([{ id: "u1" }, { id: "u2" }]);
		await expect(findUserIdsByEmail(prisma, "user@example.com")).resolves.toEqual([
			"u1",
			"u2",
		]);
	});
});

describe("emailIsTaken", () => {
	it("is true when a row matches", async () => {
		await expect(emailIsTaken(makePrisma([{ id: "u1" }]), "a@b.com")).resolves.toBe(true);
	});

	it("is false when nothing matches", async () => {
		await expect(emailIsTaken(makePrisma([]), "a@b.com")).resolves.toBe(false);
	});

	it("stops at one row, since existence is all it needs", async () => {
		const prisma = makePrisma([]);
		await emailIsTaken(prisma, "a@b.com");
		expect(prisma.$queryRaw.lastValues).toContain(1);
	});
});

/**
 * `User.email` is UNIQUE but case sensitive, so `Bob@x.com` and `bob@x.com`
 * can coexist. A `LIMIT 1` lookup returns an arbitrary one of them — Postgres
 * guarantees no ordering without an ORDER BY. The callers mint password-reset
 * and MFA-reset tokens and add accounts to organizations, so resolving the
 * wrong row is worse than resolving nothing.
 */
describe("findUniqueUserIdByEmail", () => {
	let warn: jest.SpyInstance;

	beforeEach(() => {
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it("resolves the id when exactly one account matches", async () => {
		await expect(
			findUniqueUserIdByEmail(makePrisma([{ id: "u1" }]), "a@b.com"),
		).resolves.toBe("u1");
	});

	it("returns null when nothing matches", async () => {
		await expect(findUniqueUserIdByEmail(makePrisma([]), "a@b.com")).resolves.toBeNull();
	});

	it("refuses to guess when two accounts differ only by casing", async () => {
		await expect(
			findUniqueUserIdByEmail(makePrisma([{ id: "u1" }, { id: "u2" }]), "a@b.com"),
		).resolves.toBeNull();
	});

	it("reads two rows so ambiguity is detectable at all", async () => {
		// With LIMIT 1 the second row is invisible and the caller silently
		// proceeds with an arbitrary account.
		const prisma = makePrisma([{ id: "u1" }]);
		await findUniqueUserIdByEmail(prisma, "a@b.com");
		expect(prisma.$queryRaw.lastValues).toContain(2);
	});

	it("names the conflicting ids so an admin can merge them", async () => {
		await findUniqueUserIdByEmail(makePrisma([{ id: "u1" }, { id: "u2" }]), "a@b.com");
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("u1, u2"));
	});

	it("never logs the submitted address, which is user-supplied input", async () => {
		await findUniqueUserIdByEmail(
			makePrisma([{ id: "u1" }, { id: "u2" }]),
			"secret@example.com",
		);
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("secret@example.com"));
	});
});
