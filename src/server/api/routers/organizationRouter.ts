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
import {
	ORG_INVITE_TOKEN_SECRET,
	encrypt,
	generateInstanceSecret,
} from "~/utils/encryption";
import { createTransporter, inviteOrganizationTemplate, sendEmail } from "~/utils/mail";
import ejs from "ejs";

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
	getAllOrg: adminRoleProtectedRoute.query(async ({ ctx }) => {
		// get all organizations related to the user

		// get all organizations related to the user
		const organizations = await ctx.prisma.organization.findMany({
			where: {
				ownerId: ctx.session.user.id,
			},
			include: {
				userRoles: true,
				users: true,
				invitations: true,
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
	getOrgById: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// setTimeout(() => {
			// 	ctx.ws.emit(ctx.session.user.id, "Hello from trpc router");
			// }, 5000);
			// get all organizations related to the user
			return await ctx.prisma.organization.findUnique({
				where: {
					id: input.organizationId,
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
				organizationId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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
	addUser: adminRoleProtectedRoute
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
				userName: z.string(),
				organizationRole: z.enum(["READ_ONLY", "USER"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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
			// leave organization
			return await ctx.prisma.organization.update({
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
	generateInviteLink: adminRoleProtectedRoute
		.input(
			z.object({
				organizationId: z.string(),
				email: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!input.email) {
				throw new Error("Email cannot be empty.");
			}
			if (!input.organizationId) {
				throw new Error("Organization ID cannot be empty.");
			}
			const payload = {
				email: input.email,
				organizationId: input.organizationId,
				expires: Date.now() + 3600000, // Current time + 1 hour
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
				},
			});

			const invitationLink = `${process.env.NEXTAUTH_URL}/auth/register?organizationInvite=${invitation.token}`;

			// Return the invitation link
			return { invitationLink, encryptedToken };
		}),
	inviteUserByMail: adminRoleProtectedRoute
		.input(
			z.object({
				organizationId: z.string(),
				email: z.string().email(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { organizationId, email } = input;
			const globalOptions = await ctx.prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			const defaultTemplate = inviteOrganizationTemplate();
			const template = globalOptions?.inviteOrganizationTemplate ?? defaultTemplate;

			const renderedTemplate = await ejs.render(
				JSON.stringify(template),
				{
					toEmail: email,
					fromAdmin: ctx.session.user.name,
					fromOrganization: organizationId,
				},
				{ async: true },
			);
			// create transporter
			const transporter = createTransporter(globalOptions);
			const parsedTemplate = JSON.parse(renderedTemplate) as Record<string, string>;

			// define mail options
			const mailOptions = {
				from: globalOptions.smtpEmail,
				to: email,
				subject: parsedTemplate.subject,
				html: parsedTemplate.body,
			};

			// send test mail to user
			await sendEmail(transporter, mailOptions);
		}),
	deleteInvite: adminRoleProtectedRoute
		.input(
			z.object({
				organizationId: z.string(),
				token: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { organizationId, token } = input;
			const invite = await ctx.prisma.organizationInvitation.deleteMany({
				where: {
					organizationId,
					token,
				},
			});
			return invite;
		}),
});
