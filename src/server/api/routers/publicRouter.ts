import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const publicRouter = createTRPCRouter({
	registrationAllowed: publicProcedure.query(async ({ ctx }) => {
		const oauthExclusiveLogin =
			process.env.OAUTH_EXCLUSIVE_LOGIN?.toLowerCase() === "true";
		const oauthAllowNewUsers =
			process.env.OAUTH_ALLOW_NEW_USERS?.toLowerCase() !== "false";
		const options = await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				enableRegistration: true,
			},
		});

		return {
			enableRegistration: options?.enableRegistration,
			oauthExclusiveLogin,
			oauthAllowNewUsers,
		};
	}),
	getWelcomeMessage: publicProcedure.query(async ({ ctx }) => {
		return await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				welcomeMessageTitle: true,
				welcomeMessageBody: true,
			},
		});
	}),
});
