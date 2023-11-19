import { z } from "zod";
import {
	createTRPCRouter,
	adminRoleProtectedRoute,
	protectedProcedure,
} from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
	createOrg: adminRoleProtectedRoute
		.input(
			z.object({
				orgName: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.$transaction(async (prisma) => {
				// Step 1: Create the organization and add the user as a member
				const newOrg = await prisma.organization.create({
					data: {
						orgName: input.orgName,
						ownerId: ctx.session.user.id, // Set the current user as the owner
						users: {
							connect: { id: ctx.session.user.id }, // Connect the user as a member
						},
					},
				});

				// Step 2: Set the user's role in the organization
				await prisma.userOrganizationRole.create({
					data: {
						userId: ctx.session.user.id,
						organizationId: newOrg.id,
						role: "ADMIN",
					},
				});

				// Optionally, return the updated user with memberOfOrgs included
				return await prisma.user.findUnique({
					where: { id: ctx.session.user.id },
					include: {
						memberOfOrgs: true,
					},
				});
			});
		}),
	getAllOrg: adminRoleProtectedRoute.query(async ({ ctx }) => {
		// get all organizations related to the user
		return await ctx.prisma.organization.findMany({
			where: {
				ownerId: ctx.session.user.id,
			},
			include: {
				userRoles: true,
				users: true,
			},
		});
	}),
	getOrgById: protectedProcedure
		.input(
			z.object({
				orgId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// get all organizations related to the user
			return await ctx.prisma.organization.findUnique({
				where: {
					id: input.orgId,
				},
				include: {
					userRoles: true,
					users: true,
				},
			});
		}),
});
