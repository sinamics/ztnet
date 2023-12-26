import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { member_details } from "~/utils/ztApi";

export const publicRouter = createTRPCRouter({
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
	getNodeidStatus: publicProcedure
		.input(
			z.object({
				nodeid: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const status = [];
			const database_members = await ctx.prisma.network_members.findMany({
				where: {
					address: input.nodeid,
				},
				select: {
					nwid: true,
					deleted: true,
				},
			});

			for (const member of database_members) {
				const { authorized } = await member_details(ctx, member.nwid, input.nodeid);

				status.push({
					nwid: member.nwid,
					deleted: member.deleted,
					authorized,
				});
			}

			return status;
		}),
});
