// app/server/actions/settings.ts
"use server";

import { decrypt, generateInstanceSecret, SMTP_SECRET } from "~/utils/encryption";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";

export async function getAllOptions() {
	// Check authentication
	const session = await auth();
	if (!session) {
		throw new Error("Unauthorized");
	}

	const options = await prisma.globalOptions.findFirst({
		where: {
			id: 1,
		},
	});

	if (options?.smtpPassword) {
		try {
			options.smtpPassword = decrypt(
				options.smtpPassword,
				generateInstanceSecret(SMTP_SECRET),
			);
		} catch (_err) {
			console.warn(
				"Failed to decrypt SMTP password. Has the NextAuth secret been changed?. Re-save the SMTP password to fix this.",
			);
		}
	}

	return options;
}

// You might also want to add a type for the return value
export type GlobalOptions = NonNullable<Awaited<ReturnType<typeof getAllOptions>>>;
