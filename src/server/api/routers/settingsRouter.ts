import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
	registrationAllowed: publicProcedure.query(async ({ ctx }) => {
		return await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				enableRegistration: true,
			},
		});
	}),
	// Set global options
	getAllOptions: protectedProcedure.query(async ({ ctx }) => {
		return await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
		});
	}),
});
