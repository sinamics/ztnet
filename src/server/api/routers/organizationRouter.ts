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
	sendMessage: protectedProcedure
		.input(
			z.object({
				message: z.string().optional(),
				orgId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure a message was provided
			if (!input.message) {
				throw new Error("Message content cannot be empty.");
			}

			// Get the current user's ID
			const userId = ctx.session.user.id;

			// Create a new message in the database
			const newMessage = await ctx.prisma.messages.create({
				data: {
					content: input.message,
					userId, // Associate the message with the current user
					organizationId: input.orgId, // Associate the message with the specified organization
				},
				include: {
					user: true, // Include user details in the response
				},
			});

			// emit to other users in the same organization
			ctx.wss.emit(input.orgId, newMessage);

			// Return the newly created message
			return newMessage;
		}),
	getMessages: protectedProcedure
		.input(
			z.object({
				orgId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get all messages associated with the current user
			const message = await ctx.prisma.messages.findMany({
				where: {
					organizationId: input.orgId,
				},
				take: 20,
				orderBy: {
					createdAt: "desc",
				},
				include: {
					user: true,
				},
			});

			return message.reverse();
		}),
	addUser: protectedProcedure
		.input(
			z.object({
				orgId: z.string(),
				userId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Add user to the organization
			const updatedOrganization = await ctx.prisma.organization.update({
				where: {
					id: input.orgId,
				},
				data: {
					users: {
						connect: {
							id: input.userId,
						},
					},
				},
				include: {
					users: true, // Assuming you want to return the updated list of users
				},
			});

			return updatedOrganization;
		}),
	getLogs: protectedProcedure
		.input(
			z.object({
				orgId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get all messages associated with the current user
			const logs = await ctx.prisma.activityLog.findMany({
				where: {
					organizationId: input.orgId,
				},
				take: 100,
				orderBy: {
					createdAt: "desc",
				},
				include: {
					performedBy: {
						select: {
							name: true,
						},
					},
				},
			});

			return logs;
		}),
});
