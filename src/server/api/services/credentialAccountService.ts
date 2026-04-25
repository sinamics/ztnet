import { prisma } from "~/server/db";

/**
 * Keep `Account` (better-auth's credential store, where `providerId="credential"`)
 * in sync with `User.hash` whenever a password is written.
 *
 * better-auth verifies passwords on sign-in by reading `Account.password` for the
 * row with `providerId="credential"` (see better-auth's `/sign-in/email` handler).
 * If we only update `User.hash`, the next login fails because the two stores drift.
 *
 * Use this any time `User.hash` is written from outside better-auth (registration,
 * password reset, profile-page password change).
 */
export async function upsertCredentialAccount(
	userId: string,
	passwordHash: string,
): Promise<void> {
	await prisma.account.upsert({
		where: {
			providerId_accountId: {
				providerId: "credential",
				accountId: userId,
			},
		},
		create: {
			userId,
			accountId: userId,
			providerId: "credential",
			password: passwordHash,
		},
		update: {
			password: passwordHash,
		},
	});
}
