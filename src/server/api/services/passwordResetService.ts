import { createHash, randomBytes } from "crypto";
import type { PrismaClient, User } from "@prisma/client";
import { normalizeEmail } from "~/utils/email";

/**
 * Password reset links carry an opaque random token backed by a Verification
 * row, not a self contained JWT. A link is valid only while its row exists, so
 * it cannot be forged from NEXTAUTH_SECRET, it works once, and it is revoked
 * when a newer link is requested or the password is reset.
 *
 * Only a SHA-256 of the token is stored, so reading the database does not
 * yield usable links. The row is bound to the user id and to the email the
 * link was sent to, so changing the account email invalidates the link.
 */
export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_IDENTIFIER_PREFIX = "ztnet-reset-password:";

type ResetPrisma = Pick<PrismaClient, "verification" | "user">;

const identifierFor = (token: string) =>
	`${PASSWORD_RESET_IDENTIFIER_PREFIX}${createHash("sha256").update(token).digest("hex")}`;

// User ids are cuids and never contain ":", so the first ":" splits id and email.
const valueFor = (userId: string, email: string) => `${userId}:${normalizeEmail(email)}`;

/** Deletes every outstanding reset link for the user, plus any expired reset rows. */
export async function revokePasswordResetTokens(prisma: ResetPrisma, userId: string) {
	await prisma.verification.deleteMany({
		where: {
			identifier: { startsWith: PASSWORD_RESET_IDENTIFIER_PREFIX },
			OR: [{ value: { startsWith: `${userId}:` } }, { expiresAt: { lte: new Date() } }],
		},
	});
}

/** Issues a new reset token for the user and revokes any older ones. */
export async function createPasswordResetToken(
	prisma: ResetPrisma,
	user: Pick<User, "id" | "email">,
): Promise<string> {
	await revokePasswordResetTokens(prisma, user.id);

	const token = randomBytes(32).toString("base64url");
	await prisma.verification.create({
		data: {
			identifier: identifierFor(token),
			value: valueFor(user.id, user.email),
			expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
		},
	});
	return token;
}

/**
 * Looks up the user a reset token belongs to without consuming it. Returns null
 * for unknown, expired or malformed tokens, and when the account email no longer
 * matches the address the link was sent to.
 */
export async function resolvePasswordResetToken(
	prisma: ResetPrisma,
	token: unknown,
): Promise<{ verificationId: string; user: User } | null> {
	if (typeof token !== "string" || !token) return null;

	const row = await prisma.verification.findFirst({
		where: { identifier: identifierFor(token), expiresAt: { gt: new Date() } },
	});
	if (!row) return null;

	const separator = row.value.indexOf(":");
	if (separator <= 0) return null;
	const userId = row.value.slice(0, separator);
	const email = row.value.slice(separator + 1);

	const user = await prisma.user.findFirst({ where: { id: userId } });
	if (!user || normalizeEmail(user.email) !== email) return null;

	return { verificationId: row.id, user };
}

/**
 * Claims a reset token. The delete is the claim, so when two requests race with
 * the same token only one gets the user back.
 */
export async function consumePasswordResetToken(
	prisma: ResetPrisma,
	token: unknown,
): Promise<User | null> {
	const resolved = await resolvePasswordResetToken(prisma, token);
	if (!resolved) return null;

	const { count } = await prisma.verification.deleteMany({
		where: { id: resolved.verificationId, expiresAt: { gt: new Date() } },
	});
	return count === 1 ? resolved.user : null;
}
