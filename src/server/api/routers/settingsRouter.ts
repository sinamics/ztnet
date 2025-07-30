import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
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
	getPublicOptions: publicProcedure.query(async ({ ctx }) => {
		const publicOptions = await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				siteName: true,
			},
		});

		return publicOptions;
	}),
	getAdminOptions: protectedProcedure.query(async ({ ctx }) => {
		const options = await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				enableRegistration: true,
			},
		});

		const oauthExclusiveLogin =
			process.env.OAUTH_EXCLUSIVE_LOGIN?.toLowerCase() === "true";
		const oauthAllowNewUsers =
			process.env.OAUTH_ALLOW_NEW_USERS?.toLowerCase() !== "false";

		return {
			...options,
			oauthExclusiveLogin,
			oauthAllowNewUsers,
		};
	}),
});
