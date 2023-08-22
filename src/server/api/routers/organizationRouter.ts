import { z } from "zod";
import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
	createOrg: adminRoleProtectedRoute
		.input(
			z.object({
				orgName: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// create organization
			return await ctx.prisma.user.update({
				where: { id: ctx.session.user.id },
				data: {
					adminOrgs: {
						create: {
							name: input.orgName,
						},
					},
				},
			});
		}),
	getOrg: adminRoleProtectedRoute.query(async ({ ctx }) => {
		// get all organizations related to the user
		return await ctx.prisma.organization.findMany({
			where: {
				adminId: ctx.session.user.id,
			},
		});
	}),
});
