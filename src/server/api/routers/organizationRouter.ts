import { uniqueNamesGenerator } from "unique-names-generator";
import { z } from "zod";
import {
	createTRPCRouter,
	adminRoleProtectedRoute,
	protectedProcedure,
} from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import { customConfig } from "./networkRouter";
import * as ztController from "~/utils/ztApi";

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
			// setTimeout(() => {
			// 	ctx.ws.emit(ctx.session.user.id, "Hello from trpc router");
			// }, 5000);
			// get all organizations related to the user
			return await ctx.prisma.organization.findUnique({
				where: {
					id: input.orgId,
				},
				include: {
					userRoles: true,
					users: true,
					networks: true,
				},
			});
		}),
	createOrgNetwork: protectedProcedure
		.input(
			z.object({
				networkName: z.string().optional(),
				orgName: z.string().optional(),
				orgId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// 1. Fetch the user with its related UserGroup
			// const userWithGroup = await ctx.prisma.user.findUnique({
			// 	where: { id: ctx.session.user.id },
			// 	select: {
			// 		userGroup: true,
			// 	},
			// });

			// Generate ipv4 address, cidr, start & end
			const ipAssignmentPools = IPv4gen(null);

			if (!input?.networkName) {
				// Generate adjective and noun word
				input.networkName = uniqueNamesGenerator(customConfig);
			}

			// Create ZT network
			const newNw = await ztController.network_create(
				ctx,
				input.networkName,
				ipAssignmentPools,
				false, // central
			);

			// Store the created network in the database
			await ctx.prisma.organization.update({
				where: { id: input.orgId },
				data: {
					networks: {
						create: {
							name: input.networkName,
							nwid: newNw.nwid,
							description: input.orgName,
						},
					},
				},
				include: {
					networks: true, // Optionally include the updated list of networks in the response
				},
			});
			return newNw;
		}),
	getNetworkById: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const user = ctx.session.user;

			// Retrieve the network with the organization details
			const network = await ctx.prisma.network.findUnique({
				where: {
					nwid: input.nwid,
				},
				include: {
					organization: true,
				},
			});

			// Check if the network exists
			if (!network) {
				throw new Error("Network not found");
			}

			// If the network is associated with an organization, verify the user's membership
			if (network.organizationId) {
				const isMember = await ctx.prisma.organization.findFirst({
					where: {
						id: network.organizationId,
						users: {
							some: { id: user.id },
						},
					},
				});

				// If the user is not a member of the organization, throw an error
				if (!isMember) {
					throw new Error(
						"Access denied: User is not a member of the organization associated with this network",
					);
				}
			}

			// Return the network if all checks pass
			return network;
		}),
});
