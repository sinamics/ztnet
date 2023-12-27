import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { SMTP_SECRET, decrypt, generateInstanceSecret } from "~/utils/encryption";

export const settingsRouter = createTRPCRouter({
	// Set global options
	getAllOptions: protectedProcedure.query(async ({ ctx }) => {
		const options = await ctx.prisma.globalOptions.findFirst({
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
	}),
});
