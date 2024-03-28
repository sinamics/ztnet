import { uniqueNamesGenerator } from "unique-names-generator";
import { z } from "zod";
import {
	createTRPCRouter,
	adminRoleProtectedRoute,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import { networkRouter } from "./networkRouter";
import * as ztController from "~/utils/ztApi";
import {
	ORG_INVITE_TOKEN_SECRET,
	decrypt,
	encrypt,
	generateInstanceSecret,
} from "~/utils/encryption";
import { createTransporter, inviteOrganizationTemplate, sendEmail } from "~/utils/mail";
import ejs from "ejs";
import { Role } from "@prisma/client";
import { checkUserOrganizationRole } from "~/utils/role";
import { HookType, NetworkCreated, OrgMemberRemoved } from "~/types/webhooks";
import { throwError } from "~/server/helpers/errorHandler";
import { sendWebhook } from "~/utils/webhook";
import { nameGeneratorConfig } from "../services/networkService";
import rateLimit from "~/utils/rateLimit";

// Create a Zod schema for the HookType enum
const HookTypeEnum = z.enum(Object.values(HookType) as [HookType, ...HookType[]]);

const invitationRateLimit = rateLimit({
	interval: 5 * 60 * 1000, // 300 seconds or 5 minutes
	uniqueTokenPerInterval: 1000,
});

export const organizationRouter = createTRPCRouter({
	createOrg: adminRoleProtectedRoute
		.input(
			z.object({
				orgName: z.string(),
				orgDescription: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.$transaction(async (prisma) => {
				// Step 1: Create the organization and add the user as a member
				const newOrg = await prisma.organization.create({
					data: {
						orgName: input.orgName,
						description: input.orgDescription,
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
	deleteOrg: adminRoleProtectedRoute
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});
			const caller = networkRouter.createCaller(ctx);
			// make sure the user is the owner of the organization
			const org = await ctx.prisma.organization.findUnique({
				where: {
					id: input.organizationId,
				},
				include: {
					networks: true,
				},
			});
			if (org?.ownerId !== ctx.session.user.id) {
				throw new Error("You are not the owner of this organization.");
			}
			// delete all networks on the controller
			for (const nw of org.networks) {
				await caller.deleteNetwork({
					nwid: nw.nwid,
					organizationId: input.organizationId,
				});
			}

			return await ctx.prisma.$transaction(async (prisma) => {
				// Delete all activity logs related to the organization
				await prisma.activityLog.deleteMany({
					where: {
						organizationId: input.organizationId,
					},
				});

				// Finally, delete the organization itself
				return await prisma.organization.deleteMany({
					where: {
						id: input.organizationId,
					},
				});
			});
		}),
	updateMeta: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				orgName: z.string().min(3).max(40),
				orgDescription: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Updated organization meta: ${input.orgName}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null,
				},
			});
			// update the organization
			return await ctx.prisma.organization.update({
				where: {
					id: input.organizationId,
				},
				data: {
					orgName: input.orgName,
					description: input.orgDescription,
				},
			});
		}),
	getOrgIdbyUserid: protectedProcedure.query(async ({ ctx }) => {
		// get all organizations this user is a member of
		return await ctx.prisma.organization.findMany({
			where: {
				users: {
					some: {
						id: ctx.session.user.id,
					},
				},
			},
			select: {
				id: true,
			},
		});
	}),
	getAllOrg: adminRoleProtectedRoute.query(async ({ ctx }) => {
		// get all organizations related to the user
		const organizations = await ctx.prisma.organization.findMany({
			where: {
				ownerId: ctx.session.user.id,
			},
			include: {
				userRoles: true,
				users: true,
				invitations: true,
				webhooks: true,
			},
			//order by desc
			orderBy: {
				createdAt: "desc",
			},
		});

		// Add URL to each invitation
		const organizationsWithInvitationLinks = organizations?.map((org) => {
			return {
				...org,
				invitations: org.invitations.map((invitation) => {
					return {
						...invitation,
						tokenUrl: `${process.env.NEXTAUTH_URL}/auth/register?organizationInvite=${invitation.token}`,
					};
				}),
			};
		});

		return organizationsWithInvitationLinks;
	}),
	getOrgUserRoleById: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// get all organizations related to the user
			return await ctx.prisma.userOrganizationRole.findUnique({
				where: {
					userId_organizationId: {
						organizationId: input.organizationId,
						userId: input.userId,
					},
				},
			});
		}),
	getPlatformUsers: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// get all users
			return await ctx.prisma.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
				},
			});
		}),

	getOrgUsers: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.READ_ONLY,
			});

			// get all organizations related to the user
			const organization = await ctx.prisma.organization.findUnique({
				where: {
					id: input.organizationId,
				},
				select: {
					userRoles: true,
					users: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			// return user with role flatten and sort by id
			const users = organization?.users
				.map((user) => {
					const role = organization.userRoles.find((role) => role.userId === user.id);
					return {
						...user,
						role: role?.role,
					};
				})
				.sort((a, b) => a.id.localeCompare(b.id)); // Sort users by id in ascending order

			return users;
		}),
	getOrgById: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.READ_ONLY,
			});
			// get all organizations related to the user
			return await ctx.prisma.organization.findUnique({
				where: {
					id: input.organizationId,
				},
				include: {
					userRoles: true,
					users: true,
					webhooks: true,
					invitations: true,
					networks: {
						include: {
							networkMembers: true,
						},
					},
				},
			});
		}),
	createOrgNetwork: protectedProcedure
		.input(
			z.object({
				networkName: z.string().optional(),
				orgName: z.string().optional(),
				organizationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					minimumRequiredRole: Role.USER,
				});
			}

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Created a new network: ${input.networkName}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null,
				},
			});

			// Generate ipv4 address, cidr, start & end
			const ipAssignmentPools = IPv4gen(null);

			if (!input?.networkName) {
				// Generate adjective and noun word
				input.networkName = uniqueNamesGenerator(nameGeneratorConfig);
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
				where: { id: input.organizationId },
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

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Created a new network: ${newNw.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});

			try {
				// Send webhook
				await sendWebhook<NetworkCreated>({
					hookType: HookType.NETWORK_CREATED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: newNw.nwid,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
			return newNw;
		}),
	changeUserRole: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
				role: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.userId === ctx.session.user.id) {
				throw new Error("You cannot change your own role.");
			}

			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					minimumRequiredRole: Role.ADMIN,
				});
			}

			// get the user name
			const user = await ctx.prisma.user.findUnique({
				where: {
					id: input.userId,
				},
				select: {
					name: true,
				},
			});

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed user ${user.name} role to ${input.role} in organization.`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null,
				},
			});
			// chagne the user's role in the organization
			return await ctx.prisma.userOrganizationRole.update({
				where: {
					userId_organizationId: {
						organizationId: input.organizationId,
						userId: input.userId,
					},
				},
				data: {
					role: input.role as Role,
				},
			});
		}),
	sendMessage: protectedProcedure
		.input(
			z.object({
				message: z.string().optional(),
				organizationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure a message was provided
			if (!input.message) {
				throw new Error("Message content cannot be empty.");
			}
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.READ_ONLY,
			});
			// Get the current user's ID
			const userId = ctx.session.user.id;

			// Create a new message in the database
			const newMessage = await ctx.prisma.messages.create({
				data: {
					content: input.message,
					userId, // Associate the message with the current user
					organizationId: input.organizationId, // Associate the message with the specified organization
				},
				include: {
					user: {
						select: {
							name: true,
							email: true,
							id: true,
						},
					},
				},
			});

			// Update LastReadMessage for the sender
			await ctx.prisma.lastReadMessage.upsert({
				where: {
					userId_organizationId: {
						userId: userId,
						organizationId: input.organizationId,
					},
				},
				update: {
					lastMessageId: newMessage.id,
				},
				create: {
					userId: userId,
					organizationId: input.organizationId,
					lastMessageId: newMessage.id,
				},
			});

			// emit to other users in the same organization
			ctx.wss.emit(input.organizationId, newMessage);

			// Return the newly created message
			return newMessage;
		}),
	getMessages: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.READ_ONLY,
			});

			const userId = ctx.session.user.id;

			// Get the ID of the last message read by the current user
			const lastRead = await ctx.prisma.lastReadMessage.findUnique({
				where: {
					userId_organizationId: {
						userId: userId,
						organizationId: input.organizationId,
					},
				},
			});

			// Get all messages associated with the current organization
			const messages = await ctx.prisma.messages.findMany({
				where: {
					organizationId: input.organizationId,
				},
				take: 30,
				orderBy: {
					createdAt: "desc",
				},
				include: {
					user: {
						select: {
							name: true,
							email: true,
							id: true,
						},
					},
				},
			});

			// Optionally, mark messages as read/unread based on the lastReadMessageId
			const processedMessages = messages.reverse().map((message) => {
				return {
					...message,
					isRead: lastRead ? message.id <= lastRead.lastMessageId : false,
				};
			});

			return processedMessages;
		}),
	markMessagesAsRead: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get the current user's ID
			const userId = ctx.session.user.id;
			// Find the latest message in the organization
			const latestMessage = await ctx.prisma.messages.findFirst({
				where: {
					organizationId: input.organizationId,
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			// Check if there's a latest message
			if (!latestMessage) {
				return null; // or handle the case where there are no messages
			}
			// Get the ID of the last message read by the current user
			return await ctx.prisma.lastReadMessage.upsert({
				where: {
					userId_organizationId: {
						userId: userId,
						organizationId: input.organizationId,
					},
				},
				update: {
					lastMessageId: latestMessage.id,
				},
				create: {
					userId: userId,
					organizationId: input.organizationId,
					lastMessageId: latestMessage.id,
				},
			});
		}),
	getOrgNotifications: protectedProcedure
		.input(z.object({})) // No input required if fetching for all organizations
		.query(async ({ ctx }) => {
			// Get the current user's ID
			const userId = ctx.session.user.id;

			// Get a list of organizations associated with the user through UserOrganizationRole
			const userOrganizations = await ctx.prisma.userOrganizationRole.findMany({
				where: { userId: userId },
				select: { organizationId: true },
			});

			// Initialize an object to hold the notification status for each organization
			const notifications = {};

			// Check unread messages for each organization
			for (const userOrg of userOrganizations) {
				const lastRead = await ctx.prisma.lastReadMessage.findUnique({
					where: {
						userId_organizationId: {
							userId: userId,
							organizationId: userOrg.organizationId,
						},
					},
				});

				const latestMessage = await ctx.prisma.messages.findFirst({
					where: {
						organizationId: userOrg.organizationId,
					},
					orderBy: {
						createdAt: "desc",
					},
				});

				const hasUnreadMessages =
					latestMessage && (!lastRead || latestMessage.id > lastRead.lastMessageId);

				// Add the unread message status to the notifications object
				notifications[userOrg.organizationId] = { hasUnreadMessages: hasUnreadMessages };
			}

			// Return the notifications object
			return notifications;
		}),

	addUser: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
				userName: z.string(),
				organizationRole: z.enum(["READ_ONLY", "USER", "ADMIN"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// check if the user is already a member of the organization
			const userRole = await ctx.prisma.userOrganizationRole.findFirst({
				where: {
					organizationId: input.organizationId,
					userId: input.userId,
				},
			});
			if (userRole) {
				throw new Error("User is already a member of the organization.");
			}
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Added user ${input.userName} to organization.`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId, // Use null if organizationId is not provided
				},
			});
			// Add user to the organization
			const updatedOrganization = await ctx.prisma.organization.update({
				where: {
					id: input.organizationId,
				},
				data: {
					userRoles: {
						create: {
							userId: input.userId,
							role: input.organizationRole,
						},
					},
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
	leave: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const org = await ctx.prisma.organization.findUnique({
				where: {
					id: input.organizationId,
				},
				include: {
					users: {
						select: {
							email: true,
							id: true,
						},
					},
				},
			});

			// make sure the user is not the owner of the organization
			if (org?.ownerId === input.userId) {
				throw new Error("You cannot kick the organization owner.");
			}

			// Find the email of the user
			const user = org.users.find((user) => user.id === input.userId);
			if (!user) {
				throw new Error("User not found in organization.");
			}

			// Send webhook
			try {
				await sendWebhook<OrgMemberRemoved>({
					hookType: HookType.ORG_MEMBER_REMOVED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					removedUserId: user.id,
					removedUserEmail: user.email,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			// leave organization
			await ctx.prisma.organization.update({
				where: {
					id: input.organizationId,
				},
				data: {
					users: {
						disconnect: {
							id: input.userId,
						},
					},
					userRoles: {
						deleteMany: {
							userId: input.userId,
							organizationId: input.organizationId,
						},
					},
				},
			});

			// Log the action
			return await ctx.prisma.activityLog.create({
				data: {
					action: `User ${user.email} left organization.`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId,
				},
			});
		}),
	getLogs: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.READ_ONLY,
			});
			// Get all messages associated with the current user
			const logs = await ctx.prisma.activityLog.findMany({
				where: {
					organizationId: input.organizationId,
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
	preValidateUserInvite: publicProcedure
		.input(
			z.object({
				token: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!input.token) {
				throw new Error("An error occurred while processing the invitation link.");
			}

			// add rate limit
			const INVITATION_REQUEST_LIMIT = 5;
			try {
				await invitationRateLimit.check(
					ctx.res,
					INVITATION_REQUEST_LIMIT,
					"ORGANIZATION_INVITATION",
				);
			} catch {
				throwError("Rate limit exceeded, try again later.", "TOO_MANY_REQUESTS");
			}

			try {
				const secret = generateInstanceSecret(ORG_INVITE_TOKEN_SECRET);
				const decryptedToken = decrypt(input.token, secret) as string;
				const tokenPayload = JSON.parse(decryptedToken);

				// make sure the invitation exist
				const invitation = await ctx.prisma.organizationInvitation.findFirst({
					where: {
						token: input.token,
					},
				});

				// Check if the invitation is valid
				if (!invitation) {
					throw new Error("An error occurred while processing the invitation link.");
				}

				// Check if the token is expired
				if (invitation.expiresAt.getTime() < Date.now()) {
					throw new Error("An error occurred while processing the invitation link.");
				}

				// Check if the user already exists, then add him to the organization
				const doesUserExist = await ctx.prisma.user.findFirst({
					where: {
						email: tokenPayload.email,
					},
				});

				// if ctx user and the user has a valid invite add him.
				if (doesUserExist) {
					// make sure the user does not exist in the organization
					const isMember = await ctx.prisma.userOrganizationRole.findFirst({
						where: {
							organizationId: tokenPayload.organizationId,
							userId: doesUserExist.id,
						},
					});

					if (isMember) {
						throw new Error("You are already a member of the organization.");
					}

					// Add the user to the organization
					// Add user to the organization
					await ctx.prisma.organization.update({
						where: {
							id: tokenPayload.organizationId,
						},
						data: {
							userRoles: {
								create: {
									userId: doesUserExist.id,
									role: tokenPayload.role,
								},
							},
							users: {
								connect: {
									id: doesUserExist.id,
								},
							},
						},
						include: {
							users: true,
						},
					});

					// delete the invitation
					await ctx.prisma.organizationInvitation.deleteMany({
						where: {
							email: tokenPayload.email,
							organizationId: tokenPayload.organizationId,
						},
					});

					// Log the action
					await ctx.prisma.activityLog.create({
						data: {
							action: `User ${doesUserExist.name} joined organization ${tokenPayload.organizationId}`,
							performedById: tokenPayload.invitedById,
							organizationId: tokenPayload.organizationId,
						},
					});

					return {
						user: doesUserExist,
						organizationId: tokenPayload.organizationId,
					};
				}
			} catch (_e) {
				throw new Error("An error occurred while processing the invitation link.");
			}
			// if the user does not exist, return empty object
			return {};
		}),
	generateInviteLink: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				role: z.nativeEnum(Role),
				email: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const payload = {
				email: input.email,
				organizationId: input.organizationId,
				role: input.role,
				invitedById: ctx.session.user.id,
				expiresAt: Date.now() + 3600000, // Current time + 1 hour
			};

			// Encrypt the payload
			const secret = generateInstanceSecret(ORG_INVITE_TOKEN_SECRET); // Use SMTP_SECRET or any other relevant context
			const encryptedToken = encrypt(JSON.stringify(payload), secret);

			// Store the token in the database
			const invitation = await ctx.prisma.organizationInvitation.create({
				data: {
					token: encryptedToken,
					organizationId: input.organizationId,
					email: input.email,
					role: input.role,
					invitedById: ctx.session.user.id,
					expiresAt: new Date(payload.expiresAt),
				},
			});

			const invitationLink = `${process.env.NEXTAUTH_URL}/auth/register?organizationInvite=${invitation.token}`;

			// Return the invitation link
			return { invitationLink, encryptedToken };
		}),
	resendInvite: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				invitationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const invitation = await ctx.prisma.organizationInvitation.findFirst({
				where: {
					id: input.invitationId,
					organizationId: input.organizationId,
				},
			});

			if (!invitation) {
				throw new Error("Invitation not found.");
			}

			// make sure mailSentAt is more than 1 minute ago
			if (invitation.mailSentAt && invitation.mailSentAt.getTime() > Date.now() - 60000) {
				throw new Error("You can only resend an invitation after 1 minute.");
			}
			// make sure the user has the required permissions
			await checkUserOrganizationRole({
				ctx,
				organizationId: invitation.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			try {
				// get the org mail template
				const globalOptions = await ctx.prisma.globalOptions.findFirst({
					where: {
						id: 1,
					},
				});

				const defaultTemplate = inviteOrganizationTemplate();
				const template = globalOptions?.inviteOrganizationTemplate ?? defaultTemplate;

				// create invitation link
				const invitationLink = `${process.env.NEXTAUTH_URL}/auth/register?organizationInvite=${invitation.token}`;

				// get organization name
				const organization = await ctx.prisma.organization.findUnique({
					where: {
						id: invitation.organizationId,
					},
				});

				if (!organization) {
					throw new Error("Organization not found.");
				}

				const renderedTemplate = await ejs.render(
					JSON.stringify(template),
					{
						toEmail: invitation.email,
						fromAdmin: ctx.session.user.name,
						fromOrganization: organization.orgName,
						invitationLink: invitationLink,
					},
					{ async: true },
				);

				// create transporter
				const transporter = createTransporter(globalOptions);
				const parsedTemplate = JSON.parse(renderedTemplate) as Record<string, string>;

				// define mail options
				const mailOptions = {
					from: globalOptions.smtpEmail,
					to: invitation.email,
					subject: parsedTemplate.subject,
					html: parsedTemplate.body,
				};

				//update mailSentAt: new Date()
				await ctx.prisma.organizationInvitation.update({
					where: {
						id: input.invitationId,
					},
					data: {
						mailSentAt: new Date(),
					},
				});
				// send test mail to user
				return await sendEmail(transporter, mailOptions);
			} catch (error) {
				return throwError(error.message);
			}
		}),

	// define mail options
	inviteUserByMail: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				role: z.nativeEnum(Role),
				email: z.string().email(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { organizationId, email, role } = input;

			if (!email) {
				throw new Error("Email cannot be empty.");
			}

			if (!organizationId) {
				throw new Error("Organization ID cannot be empty.");
			}

			if (!role) {
				throw new Error("Role cannot be empty.");
			}

			// make sure user has the required permissions
			await checkUserOrganizationRole({
				ctx,
				organizationId: organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// check if the user already exists
			const doesUserExist = await ctx.prisma.user.findFirst({
				where: {
					email: email,
				},
			});

			if (doesUserExist) {
				// make sure the user does not exist in the organization
				const isMember = await ctx.prisma.userOrganizationRole.findFirst({
					where: {
						organizationId: organizationId,
						userId: doesUserExist.id,
					},
				});

				if (isMember) {
					throw new Error("User is already a member of the organization.");
				}
			}

			// check if the user has pending invitation
			const existingInvitation = await ctx.prisma.organizationInvitation.findFirst({
				where: {
					organizationId: organizationId,
					email: email,
				},
			});

			if (existingInvitation) {
				throw new Error("User already has a pending invitation.");
			}

			try {
				const tokenPayload = {
					email: email,
					organizationId: organizationId,
					role: role,
					invitedById: ctx.session.user.id,
					expiresAt: Date.now() + 86400000, // Current time + 24 hour
				};

				// Encrypt the payload
				const secret = generateInstanceSecret(ORG_INVITE_TOKEN_SECRET); // Use SMTP_SECRET or any other relevant context
				const encryptedToken = encrypt(JSON.stringify(tokenPayload), secret);

				const globalOptions = await ctx.prisma.globalOptions.findFirst({
					where: {
						id: 1,
					},
				});

				// get the org mail template
				const defaultTemplate = inviteOrganizationTemplate();
				const template = globalOptions?.inviteOrganizationTemplate ?? defaultTemplate;

				// create invitation link
				const invitationLink = `${process.env.NEXTAUTH_URL}/auth/register?organizationInvite=${encryptedToken}`;

				// get organization name
				const organization = await ctx.prisma.organization.findUnique({
					where: {
						id: organizationId,
					},
				});

				if (!organization) {
					throw new Error("Organization not found.");
				}

				const renderedTemplate = await ejs.render(
					JSON.stringify(template),
					{
						toEmail: email,
						fromAdmin: ctx.session.user.name,
						fromOrganization: organization.orgName,
						invitationLink: invitationLink,
					},
					{ async: true },
				);

				// create transporter
				const transporter = createTransporter(globalOptions);
				const parsedTemplate = JSON.parse(renderedTemplate) as Record<string, string>;

				// log the action
				await ctx.prisma.activityLog.create({
					data: {
						action: `Sent an invitation to ${email} to join organization ${organization.orgName}`,
						performedById: ctx.session.user.id,
						organizationId: organizationId,
					},
				});

				// define mail options
				const mailOptions = {
					from: globalOptions.smtpEmail,
					to: email,
					subject: parsedTemplate.subject,
					html: parsedTemplate.body,
				};

				// send test mail to user
				await sendEmail(transporter, mailOptions);

				// Store the token in the database
				await ctx.prisma.organizationInvitation.create({
					data: {
						token: encryptedToken,
						organizationId: organizationId,
						email: email,
						role: role,
						invitedById: ctx.session.user.id,
						expiresAt: new Date(tokenPayload.expiresAt),
						mailSentAt: new Date(),
					},
				});

				return { invitationLink, encryptedToken };
			} catch (error) {
				return throwError(error.message);
			}
		}),
	deleteInvite: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				invitationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { organizationId, invitationId } = input;
			const invite = await ctx.prisma.organizationInvitation.deleteMany({
				where: {
					organizationId,
					id: invitationId,
				},
			});
			return invite;
		}),
	getInvites: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { organizationId } = input;
			// make sure the user is member of the organization and has the required permissions
			await checkUserOrganizationRole({
				ctx,
				organizationId: organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			return await ctx.prisma.organizationInvitation.findMany({
				where: {
					organizationId,
				},
			});
		}),
	transferNetworkOwnership: protectedProcedure
		.input(
			z.object({
				organizationId: z.string({ invalid_type_error: "Organization ID is required" }),
				nwid: z.string({ invalid_type_error: "Network ID is required" }),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// make sure the user is member of the organization and has the required permissions
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.USER,
			});

			// Update the network with the new organization ID
			await ctx.prisma.network.update({
				where: { nwid: input.nwid, authorId: ctx.session.user.id },
				data: { organizationId: input.organizationId, authorId: null },
			});

			// Log the action
			return await ctx.prisma.activityLog.create({
				data: {
					action: `Transferred private network ${input.nwid} to organization ${input.organizationId}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId, // Use null if organizationId is not provided
				},
			});
		}),
	deleteOrgWebhooks: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				webhookId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// create webhook
			return await ctx.prisma.webhook.deleteMany({
				where: {
					id: input.webhookId,
					organizationId: input.organizationId,
				},
			});
		}),
	addOrgWebhooks: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				webhookUrl: z.string(),
				webhookName: z.string(),
				hookType: z.array(HookTypeEnum),
				webhookId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// Validate the URL to be HTTPS
			if (!input.webhookUrl.startsWith("https://")) {
				// throw error
				console.error("Webhook URL is not HTTPS");
				return throwError(`Webhook URL needs to be HTTPS: ${input.webhookUrl}`);
			}

			if (input.hookType.length === 0) {
				// throw error
				return throwError("Webhook needs to have at least one action type");
			}
			// create webhook
			return await ctx.prisma.webhook.upsert({
				where: {
					id: input.webhookId,
				},
				create: {
					url: input.webhookUrl,
					description: "",
					name: input.webhookName,
					eventTypes: input.hookType,
					organization: {
						connect: { id: input.organizationId },
					},
				},
				update: {
					url: input.webhookUrl,
					description: "",
					name: input.webhookName,
					eventTypes: input.hookType,
				},
			});
		}),
	getOrgWebhooks: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// make sure the user is member of the organization
			await checkUserOrganizationRole({
				ctx,
				organizationId: input.organizationId,
				minimumRequiredRole: Role.ADMIN,
			});

			// get all organizations related to the user
			return await ctx.prisma.webhook.findMany({
				where: {
					id: input.organizationId,
				},
			});
		}),
});
