import type { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "~/utils/email";

/**
 * Find the ids of users whose email matches `email` ignoring case.
 *
 * Deliberately NOT Prisma's `mode: "insensitive"`. That compiles to
 * `email ILIKE $1`, where `%` and `_` inside the *value* are LIKE wildcards,
 * not literals. Passing the value as a bound parameter does not change that.
 *
 * On the credential sign-in path the address is unvalidated request-body input
 * (better-auth validates inside the endpoint, after our pre-flight hook), so
 * `%@some-domain.com` would match a real account, and the caller would then
 * rewrite that victim's email. Zod does not close the hole on the validated
 * paths either: it rejects `%` but accepts `_`, which is legal in an address
 * and still a single-character wildcard.
 *
 * `lower(email) = lower($1)` is plain equality with no pattern semantics.
 *
 * @param limit caps the rows scanned; callers pass 2 to distinguish
 *              "exactly one match" from "ambiguous" without reading the table.
 */
export async function findUserIdsByEmail(
	prisma: PrismaClient,
	email: string,
	limit = 2,
): Promise<string[]> {
	const rows = await prisma.$queryRaw<{ id: string }[]>`
		SELECT "id" FROM "User" WHERE lower("email") = lower(${normalizeEmail(email)}) LIMIT ${limit}`;
	return rows.map((row) => row.id);
}

/**
 * Whether an account already exists for this address, ignoring case. Used by
 * the registration and invite paths so a row still stored with uppercase
 * characters is not shadowed by a second account for the same address.
 */
export async function emailIsTaken(
	prisma: PrismaClient,
	email: string,
): Promise<boolean> {
	return (await findUserIdsByEmail(prisma, email, 1)).length > 0;
}
