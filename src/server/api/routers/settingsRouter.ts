import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
	// Set global options
	getAllOptions: protectedProcedure.query(async ({ ctx }) => {
		const options = await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
		});
		// Never send actual password to client - only indicate if one exists
		if (options) {
			return {
				...options,
				smtpPassword: null,
				hasSmtpPassword: Boolean(options.smtpPassword),
			};
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
