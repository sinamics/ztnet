import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
	// Global options every signed in user may see. The full row (mail server,
	// templates, ...) is admin only, see admin.getAllOptions.
	getAllOptions: protectedProcedure.query(async ({ ctx }) => {
		return await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				siteName: true,
				enablePersonalNetworks: true,
			},
		});
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
