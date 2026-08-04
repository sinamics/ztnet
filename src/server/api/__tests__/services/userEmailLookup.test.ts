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
import { findUserIdsByEmail, emailIsTaken } from "~/server/api/services/userEmailLookup";

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
	it("uses lower() equality, never LIKE/ILIKE", () => {
		const prisma = makePrisma([]);
		findUserIdsByEmail(prisma, "user@example.com");

		const sql: string = prisma.$queryRaw.lastSql;
		expect(sql.toUpperCase()).not.toContain("LIKE");
		expect(sql.toLowerCase()).toContain('lower("email") = lower(');
	});

	it("passes the address as a bound parameter, not inlined into the SQL", () => {
		const prisma = makePrisma([]);
		findUserIdsByEmail(prisma, "user@example.com");

		expect(prisma.$queryRaw.lastSql).not.toContain("user@example.com");
		expect(prisma.$queryRaw.lastValues).toContain("user@example.com");
	});

	it("normalizes the address before querying", () => {
		const prisma = makePrisma([]);
		findUserIdsByEmail(prisma, "  User@Example.COM  ");

		expect(prisma.$queryRaw.lastValues[0]).toBe("user@example.com");
	});

	it.each([
		["%@example.com", "% wildcard spanning a whole domain"],
		["vict_m@example.com", "_ wildcard, which zod's .email() accepts"],
		["%", "bare wildcard"],
	])("passes %s through as a literal (%s)", (payload) => {
		const prisma = makePrisma([]);
		findUserIdsByEmail(prisma, payload);

		// The payload reaches the DB as a value compared with `=`, so Postgres
		// gives it no pattern meaning.
		expect(prisma.$queryRaw.lastValues[0]).toBe(payload.trim().toLowerCase());
		expect(prisma.$queryRaw.lastSql.toUpperCase()).not.toContain("LIKE");
	});

	it("caps the rows read so an ambiguous match cannot scan the table", () => {
		const prisma = makePrisma([]);
		findUserIdsByEmail(prisma, "user@example.com", 2);

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

	it("stops at one row, since existence is all it needs", () => {
		const prisma = makePrisma([]);
		emailIsTaken(prisma, "a@b.com");
		expect(prisma.$queryRaw.lastValues).toContain(1);
	});
});
