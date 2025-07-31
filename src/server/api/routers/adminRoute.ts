import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
import { z } from "zod";
import * as ztController from "~/utils/ztApi";
import { mailTemplateMap, sendMailWithTemplate } from "~/utils/mail";
import { type GlobalOptions, Role } from "@prisma/client";
import { throwError } from "~/server/helpers/errorHandler";
import type { ZTControllerNodeStatus } from "~/types/ztController";
import type { NetworkAndMemberResponse } from "~/types/network";
import { execSync } from "node:child_process";
import fs from "node:fs";
import type { WorldConfig } from "~/types/worldConfig";
import axios from "axios";
import { updateLocalConf } from "~/utils/planet";
import jwt from "jsonwebtoken";
import { networkRouter } from "./networkRouter";
import { decrypt, encrypt, generateInstanceSecret } from "~/utils/encryption";
import { SMTP_SECRET } from "~/utils/encryption";
import { ZT_FOLDER } from "~/utils/ztApi";
import { isRunningInDocker } from "~/utils/docker";
import { getNetworkClassCIDR } from "~/utils/IPv4gen";
import type { InvitationLinkType } from "~/types/invitation";
import { MailTemplateKey } from "~/utils/enums";
import path from "node:path";
import archiver from "archiver";
import { BackupMetadata } from "~/types/backupRestore";
import { checkAndDeactivateExpiredUsers } from "~/cronTasks";

type WithError<T> = T & { error?: boolean; message?: string };

export const adminRouter = createTRPCRouter({
	updateUser: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.string(),
				params: z.object({
					isActive: z.boolean().optional(),
					expiresAt: z.date().nullable().optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.id === input.id) {
				throwError("You can't change your own status");
			}

			// get user and validate that is not a admin user
			const user = await ctx.prisma.user.findUnique({
				where: {
					id: input.id,
				},
			});
			if (user.role === "ADMIN") {
				throwError("You can't change the status of admin users");
			}

			return await ctx.prisma.user.update({
				where: {
					id: input.id,
				},
				data: {
					...input.params,
				},
			});
		}),
	deleteUser: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.id === input.id) {
				throwError("You can't delete your own account");
			}

			// check if user is admin user
			const user = await ctx.prisma.user.findUnique({
				where: {
					id: input.id,
				},
			});

			if (user.role === "ADMIN") {
				throwError("You can't delete admin users");
			}

			// get user networks
			const userNetworks = await ctx.prisma.network.findMany({
				where: {
					authorId: input.id,
				},
			});

			// delete user networks
			const caller = networkRouter.createCaller(ctx);
			for (const network of userNetworks) {
				caller.deleteNetwork({ nwid: network.nwid, central: false });
			}

			return await ctx.prisma.user.delete({
				where: {
					id: input.id,
				},
			});
		}),
	createUser: adminRoleProtectedRoute
		.input(
			z.object({
				name: z.string().min(1, "Name is required"),
				email: z.string().email("Valid email is required"),
				password: z.string().min(6, "Password must be at least 6 characters"),
				role: z.nativeEnum(Role).default(Role.READ_ONLY),
				userGroupId: z.number().optional(),
				expiresAfterDays: z.number().optional(),
				requestChangePassword: z.boolean().default(false),
				organizationId: z.string().optional(),
				organizationRole: z.nativeEnum(Role).default(Role.USER),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const {
				name,
				email,
				password,
				role,
				userGroupId,
				expiresAfterDays,
				requestChangePassword,
				organizationId,
				organizationRole,
			} = input;

			// Check if user with this email already exists
			const existingUser = await ctx.prisma.user.findUnique({
				where: { email },
			});

			if (existingUser) {
				throwError("User with this email already exists");
			}

			// Hash the password
			const bcrypt = await import("bcryptjs");
			const hash = bcrypt.hashSync(password, 10);

			// Calculate expiration date if specified
			let expiresAt: Date | null = null;
			if (expiresAfterDays && expiresAfterDays > 0) {
				expiresAt = new Date();
				expiresAt.setDate(expiresAt.getDate() + expiresAfterDays);
			}

			// Get user group if specified, or default group
			let finalUserGroupId = userGroupId;
			if (!finalUserGroupId) {
				const defaultUserGroup = await ctx.prisma.userGroup.findFirst({
					where: { isDefault: true },
				});
				finalUserGroupId = defaultUserGroup?.id;
			}

			// Create the user
			const newUser = await ctx.prisma.user.create({
				data: {
					name,
					email,
					hash,
					role,
					userGroupId: finalUserGroupId,
					expiresAt,
					requestChangePassword,
					lastLogin: new Date().toISOString(),
					options: {
						create: {
							localControllerUrl: isRunningInDocker()
								? "http://zerotier:9993"
								: "http://127.0.0.1:9993",
						},
					},
				},
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					userGroupId: true,
					expiresAt: true,
					requestChangePassword: true,
					createdAt: true,
				},
			});

			// If organization is specified, add user to organization with specified role
			if (organizationId && organizationRole) {
				// Verify that the organization exists and the current admin has access to it
				const organization = await ctx.prisma.organization.findFirst({
					where: {
						id: organizationId,
						ownerId: ctx.session.user.id, // Only allow adding to organizations owned by the admin
					},
				});

				if (!organization) {
					throwError("Organization not found or access denied");
				}

				// Add the user to the organization
				await ctx.prisma.organization.update({
					where: { id: organizationId },
					data: {
						users: {
							connect: { id: newUser.id },
						},
					},
				});

				// Set the user's role in the organization
				await ctx.prisma.userOrganizationRole.create({
					data: {
						userId: newUser.id,
						organizationId: organizationId,
						role: organizationRole,
					},
				});
			}

			return newUser;
		}),
	getUser: adminRoleProtectedRoute
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.prisma.user.findFirst({
				select: {
					id: true,
					name: true,
					email: true,
					emailVerified: true,
					lastLogin: true,
					lastseen: true,
					online: true,
					role: true,
					_count: {
						select: {
							network: true,
						},
					},
					userGroup: true,
					userGroupId: true,
					isActive: true,
					expiresAt: true,
				},

				where: {
					id: input.userId,
				},
			});
		}),
	getUsers: adminRoleProtectedRoute
		.input(
			z.object({
				isAdmin: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const users = await ctx.prisma.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					emailVerified: true,
					lastLogin: true,
					createdAt: true,
					expiresAt: true,
					lastseen: true,
					online: true,
					role: true,
					_count: {
						select: {
							network: true,
						},
					},
					userGroup: true,
					userGroupId: true,
					isActive: true,
				},

				where: input.isAdmin ? { role: "ADMIN" } : undefined,
			});
			return users;
		}),
	generateInviteLink: adminRoleProtectedRoute
		.input(
			z.object({
				secret: z.string(),
				expireTime: z.string(),
				timesCanUse: z.string().optional(),
				groupId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { secret, expireTime, timesCanUse, groupId } = input;

			const token = jwt.sign({ secret }, process.env.NEXTAUTH_SECRET, {
				expiresIn: `${expireTime}m`,
			});
			const url = `${process.env.NEXTAUTH_URL}/locale-redirect?invite=${token}`;

			// Store the token, email, createdBy, and expiration in the UserInvitation table
			await ctx.prisma.invitation.create({
				data: {
					token,
					url,
					secret,
					groupId,
					timesCanUse: Number.parseInt(timesCanUse) || 1,
					expiresAt: new Date(Date.now() + Number.parseInt(expireTime) * 60 * 1000),
					invitedById: ctx.session.user.id,
				},
			});

			return token;
		}),
	getInvitationLink: adminRoleProtectedRoute.query(async ({ ctx }) => {
		const invite = await ctx.prisma.invitation.findMany({
			where: {
				invitedById: ctx.session.user.id,
				// Exclude organization invitations by filtering out invitations that have organizations
				organizations: {
					none: {}
				}
			},
		});

		// map over and check if groupId exists, and if so get the group name
		const invitationLinks: InvitationLinkType[] = await Promise.all(
			invite.map(async (inv) => {
				let groupName = null;
				if (inv.groupId) {
					const group = await ctx.prisma.userGroup.findUnique({
						where: {
							id: Number.parseInt(inv.groupId, 10),
						},
					});
					groupName = group?.name || null;
				}
				return {
					...inv,
					groupName,
				};
			}),
		);

		return invitationLinks;
	}),
	deleteInvitationLink: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.invitation.delete({
				where: {
					id: input.id,
				},
			});
		}),
	getControllerStats: adminRoleProtectedRoute.query(async ({ ctx }) => {
		try {
			const isCentral = false;
			const networks = await ztController.get_controller_networks(ctx, isCentral);
			const networkCount = networks.length;
			let totalMembers = 0;
			const assignedIPs = new Set<string>();
			for (const network of networks) {
				const networkDetails = await ztController.local_network_detail(
					ctx,
					network as string,
					isCentral,
				);
				totalMembers += networkDetails?.members.length;

				// @ts-expect-error
				const usedIp = getNetworkClassCIDR(networkDetails?.network?.ipAssignmentPools);
				if (usedIp[0]?.target) assignedIPs.add(usedIp[0]?.target);
			}

			const controllerStatus = (await ztController.get_controller_status(
				ctx,
				isCentral,
			)) as ZTControllerNodeStatus;
			return {
				networkCount,
				totalMembers,
				controllerStatus,
				assignedIPs: Array.from(assignedIPs),
			};
		} catch (error) {
			return throwError(error);
		}
	}),

	// Set global options
	getAllOptions: adminRoleProtectedRoute.query(async ({ ctx }) => {
		let options = (await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
		})) as WithError<GlobalOptions>;

		if (options?.smtpPassword && !options.smtpPassword.includes(":")) {
			options = {
				...options,
				error: true,
				message:
					"Please re-enter your SMTP password to enhance security through database hashing.",
			};
		} else if (options?.smtpPassword) {
			try {
				options.smtpPassword = decrypt(
					options.smtpPassword,
					generateInstanceSecret(SMTP_SECRET),
				);
			} catch (_err) {
				console.warn(
					"Failed to decrypt SMTP password. Has the NextAuth secret been changed?. Re-save the SMTP password to fix this.",
				);
			}
		}
		return options;
	}),

	// Set global options
	changeRole: adminRoleProtectedRoute
		.input(
			z.object({
				role: z.string().refine((value) => Object.values(Role).includes(value as Role), {
					message: "Role is not valid",
					path: ["role"],
				}),
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, role } = input;

			if (ctx.session.user.id === id) {
				throwError("You can't change your own role");
			}

			// If the role is set to Admin, also set the userGroupId to null (i.e., delete the userGroup for the user)
			const updateData =
				role === "ADMIN"
					? {
							role: role as Role,
							userGroupId: null,
							expiresAt: null,
							isActive: true,
						}
					: {
							role: role as Role,
						};

			return await ctx.prisma.user.update({
				where: {
					id,
				},
				data: updateData,
			});
		}),
	updateGlobalOptions: adminRoleProtectedRoute
		.input(
			z.object({
				enableRegistration: z.boolean().optional(),
				firstUserRegistration: z.boolean().optional(),
				userRegistrationNotification: z.boolean().optional(),
				welcomeMessageTitle: z.string().max(50).optional(),
				welcomeMessageBody: z.string().max(350).optional(),
				siteName: z.string().max(30).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.globalOptions.update({
				where: {
					id: 1,
				},
				data: {
					...input,
				},
			});
		}),
	getMailTemplates: adminRoleProtectedRoute
		.input(
			z.object({
				template: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const templates = await ctx.prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			return JSON.parse(templates?.[input.template]) ?? mailTemplateMap[input.template]();
		}),

	setMail: adminRoleProtectedRoute
		.input(
			z.object({
				smtpHost: z.string().optional(),
				smtpPort: z.string().optional(),
				smtpSecure: z.boolean().optional(),
				smtpEmail: z.string().optional(),
				smtpPassword: z.string().optional(),
				smtpUsername: z.string().optional(),
				smtpUseSSL: z.boolean().optional(),
				smtpIgnoreTLS: z.boolean().optional(),
				smtpRequireTLS: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.smtpPassword) {
				// Encrypt SMTP password before storing
				input.smtpPassword = encrypt(
					input.smtpPassword,
					generateInstanceSecret(SMTP_SECRET),
				);
			}

			return await ctx.prisma.globalOptions.update({
				where: {
					id: 1,
				},
				data: {
					...input,
				},
			});
		}),
	setMailTemplates: adminRoleProtectedRoute
		.input(
			z.object({
				template: z.string(),
				type: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { type, template } = input;
			return await ctx.prisma.globalOptions.update({
				where: { id: 1 },
				data: { [type]: template },
			});
		}),
	getDefaultMailTemplate: adminRoleProtectedRoute
		.input(
			z.object({
				template: z.string(),
			}),
		)
		.mutation(({ input }) => {
			return mailTemplateMap[input.template]();
		}),
	sendTestMail: adminRoleProtectedRoute
		.input(
			z.object({
				type: z.nativeEnum(MailTemplateKey),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { type } = input;
			const { user } = ctx.session;

			const templateData = {
				// Common tags
				toEmail: user.email,
				toName: user.name,
				fromName: user.name,
				fromAdmin: user.name,
				fromOrganization: "Test Organization",

				// Specific tags for each template
				invitationLink: "https://ztnet.network/invite",
				forgotLink: "https://ztnet.network/reset-password",
				notificationMessage: "This is a test notification message",
				nwid: "8056c2e21c000001",
				accessTime: new Date().toISOString(),
				ipAddress: "192.168.1.1",
				browserInfo: "Test Browser (Test OS)",
				accountPageUrl: "https://ztnet.network/account",

				// Additional tags that might be used in future templates
				userId: user.id,
				userRole: "Admin",
				applicationName: "ZTNET",
				supportEmail: "support@ztnet.network",
				loginUrl: "https://ztnet.network/login",
				expirationTime: "24 hours",
				actionRequired: "Please verify your email address",
				customMessage: "This is a custom message for testing purposes",

				// verifyEmailTemplate specific tags
				verifyLink: "https://ztnet.network/verify-email",
			};

			await sendMailWithTemplate(type, {
				to: user.email,
				userId: user.id,
				templateData,
			});

			return { success: true, message: `Test email for ${type} sent successfully` };
		}),

	/**
	 * `unlinkedNetwork` is an admin protected query that fetches and returns detailed information about networks
	 * that are present in the controller but not stored in the database.
	 *
	 * First, it fetches the network IDs from the controller and from the database.
	 *
	 * It then compares these lists to find networks that exist in the controller but not in the database.
	 *
	 * For each of these unlinked networks, it fetches detailed network information from the controller.
	 *
	 * @access restricted to admins
	 * @param {Object} ctx - context object that carries important information like database instance
	 * @param {Object} input - input object that contains possible query parameters or payload
	 * @returns {Promise<NetworkAndMemberResponse[]>} - an array of unlinked network details
	 */
	unlinkedNetwork: adminRoleProtectedRoute
		.input(
			z.object({
				getDetails: z.boolean().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			try {
				const ztNetworks = (await ztController.get_controller_networks(ctx)) as string[];
				const dbNetworks = await ctx.prisma.network.findMany({
					select: { nwid: true },
				});

				// create a set of nwid for faster lookup
				const dbNetworkIds = new Set(dbNetworks.map((network) => network.nwid));

				// find networks that are not in database
				const unlinkedNetworks = ztNetworks.filter(
					(networkId) => !dbNetworkIds.has(networkId),
				);

				if (unlinkedNetworks.length === 0) return [];

				if (input.getDetails) {
					const unlinkArr: NetworkAndMemberResponse[] = await Promise.all(
						unlinkedNetworks.map((unlinked) =>
							ztController.local_network_detail(ctx, unlinked, false),
						),
					);
					return unlinkArr;
				}

				return unlinkedNetworks;
			} catch (_error) {
				return throwError("Failed to fetch unlinked networks", _error);
			}
		}),
	assignNetworkToUser: adminRoleProtectedRoute
		.input(
			z.object({
				userId: z.string(),
				nwid: z.string(),
				nwname: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				// console.log(ipAssignmentPools);
				// Store the created network in the database
				const updatedUser = await ctx.prisma.user.update({
					where: {
						id: ctx.session.user.id,
					},
					data: {
						network: {
							create: {
								nwid: input.nwid,
								name: input.nwname || "",
							},
						},
					},
					select: {
						network: true,
					},
				});
				return updatedUser;

				// return ipAssignmentPools;
			} catch (err: unknown) {
				if (err instanceof Error) {
					// Log the error and throw a custom error message

					console.error(err);
					throwError("Could not create network! Please try again");
				} else {
					// Throw a generic error for unknown error types
					throwError("An unknown error occurred");
				}
			}
		}),
	addUserGroup: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.number().optional(),
				groupName: z
					.string()
					.nonempty()
					.refine((val) => val.trim().length > 0, {
						message: "Group name cannot be empty",
					}),
				maxNetworks: z
					.string()
					.nonempty()
					.refine((val) => val.trim().length > 0, {
						message: "Max networks cannot be empty",
					}),
				isDefault: z
					.boolean()
					.refine((val) => typeof val !== "string", {
						message: "Default must be a boolean, not a string",
					})
					.optional()
					.refine((val) => val !== undefined, {
						message: "Default is required",
					}),
				expiresAt: z
					.string()
					.optional()
					.transform((val) => {
						if (!val || val === "") return null;
						return val;
					})
					.refine(
						(val) => {
							if (val === null) return true;
							return !Number.isNaN(Date.parse(val));
						},
						{
							message: "Invalid date format",
						},
					)
					.refine(
						(val) => {
							if (val === null) return true;
							const selectedDate = new Date(val);
							const today = new Date();
							today.setHours(0, 0, 0, 0); // Set to start of day for comparison
							return selectedDate >= today;
						},
						{
							message: "Expiration date cannot be in the past",
						},
					),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				// If isDefault is true, update all other groups to have isDefault as false
				if (input.isDefault) {
					await ctx.prisma.userGroup.updateMany({
						where: {
							isDefault: true,
						},
						data: {
							isDefault: false,
						},
					});
				}

				// Parse the expiration date if provided and set to end of day
				let expiresAt: Date | null = null;
				if (input.expiresAt && input.expiresAt !== "") {
					const date = new Date(input.expiresAt);
					// Set to end of day (23:59:59.999) to ensure expiration happens after the full day
					date.setHours(23, 59, 59, 999);
					expiresAt = date;
				}

				// Use upsert to either update or create a new userGroup
				return await ctx.prisma.userGroup.upsert({
					where: {
						id: input.id || -1,
					},
					create: {
						name: input.groupName,
						maxNetworks: Number.parseInt(input.maxNetworks),
						isDefault: input.isDefault,
						expiresAt,
					},
					update: {
						name: input.groupName,
						maxNetworks: Number.parseInt(input.maxNetworks),
						isDefault: input.isDefault,
						expiresAt,
					},
				});
			} catch (err: unknown) {
				if (err instanceof Error) {
					// Log the error and throw a custom error message
					throwError("Could not process user group operation! Please try again");
				} else {
					// Throw a generic error for unknown error types
					throwError("An unknown error occurred");
				}
			}
		}),
	getUserGroups: adminRoleProtectedRoute.query(async ({ ctx }) => {
		const userGroups = await ctx.prisma.userGroup.findMany({
			select: {
				id: true,
				name: true,
				maxNetworks: true,
				isDefault: true,
				expiresAt: true,
				_count: {
					select: {
						users: true,
					},
				},
			},
		});

		return userGroups;
	}),
	deleteUserGroup: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.number().refine((val) => val > 0, {
					message: "A valid group ID is required",
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				// Check if the user group exists
				const existingGroup = await ctx.prisma.userGroup.findUnique({
					where: {
						id: input.id,
					},
				});

				if (!existingGroup) {
					throwError("User group not found!");
				}

				// Delete the user group
				await ctx.prisma.userGroup.delete({
					where: {
						id: input.id,
					},
				});

				return { message: "User group successfully deleted." };
			} catch (err: unknown) {
				if (err instanceof Error) {
					// Log the error and throw a custom error message
					throwError("Could not delete user group! Please try again.");
				} else {
					// Throw a generic error for unknown error types
					throwError("An unknown error occurred.");
				}
			}
		}),
	assignUserGroup: adminRoleProtectedRoute
		.input(
			z.object({
				userid: z.string(),
				userGroupId: z.string().nullable(), // Allow null value for userGroupId
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.id === input.userid) {
				throwError("You can't change your own Group");
			}

			// Check if the user and the user group exist
			const user = await ctx.prisma.user.findUnique({
				where: {
					id: input.userid,
				},
			});

			// do not add usergroup if admin user
			if (user.role === "ADMIN" && input.userGroupId !== "none") {
				throwError("You can't add groups to admin users");
			}

			try {
				// If "none" is selected, remove the user from the group
				if (input.userGroupId === "none") {
					return await ctx.prisma.user.update({
						where: {
							id: input.userid,
						},
						data: {
							userGroupId: null, // Remove the user's association with a userGroup
							expiresAt: null, // Remove expiration when removing from group
						},
					});
				}

				const userGroup = await ctx.prisma.userGroup.findUnique({
					where: {
						id: Number.parseInt(input.userGroupId),
					},
					select: {
						id: true,
						name: true,
						expiresAt: true,
					},
				});

				if (!user || !userGroup) {
					throw new Error("User or UserGroup not found");
				}

				// Calculate expiration date if the group has expiration settings
				let expiresAt: Date | null = null;
				if (userGroup.expiresAt) {
					// If the group has an expiration date, set the user's expiration to that date
					expiresAt = new Date(userGroup.expiresAt);
				}

				// Assign the user to the user group
				return await ctx.prisma.user.update({
					where: {
						id: input.userid,
					},
					data: {
						userGroupId: Number.parseInt(input.userGroupId), // Link the user to the userGroup
						expiresAt, // Set expiration based on group settings
					},
				});
			} catch (err: unknown) {
				if (err instanceof Error) {
					// Log the error and throw a custom error message
					throwError(`Error assigning user to group: ${err.message}`);
				} else {
					// Throw a generic error for unknown error types
					throwError("An unknown error occurred");
				}
			}
		}),
	getIdentity: adminRoleProtectedRoute.query(async () => {
		let ip = "External IP";
		try {
			const response = await axios.get("https://api.ip.sb/ip");
			ip = response.data.trim();
		} catch (error) {
			console.error("Failed to fetch public IP:", error);
		}

		// Get identity from the file system
		const identityPath = `${ZT_FOLDER}/identity.public`;
		const identity = fs.existsSync(identityPath)
			? fs.readFileSync(identityPath, "utf-8").trim()
			: "";

		return { ip, identity };
	}),
	getPlanet: adminRoleProtectedRoute.query(async ({ ctx }) => {
		const paths = {
			backupDir: `${ZT_FOLDER}/planet_backup`,
			planetPath: `${ZT_FOLDER}/planet`,
			mkworldDir: `${ZT_FOLDER}/zt-mkworld`,
		};

		const options = await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				planet: {
					select: {
						id: true,
						plID: true,
						plBirth: true,
						plRecommend: true,
						rootNodes: true,
					},
				},
			},
		});
		// Check if the backup directory exists
		const backupExists = fs.existsSync(paths.backupDir);

		// If backup exists and no planet data is found in the database
		if (backupExists && !options?.planet) {
			return {
				error: new Error(
					"Inconsistent configuration: Planet backup exists but no planet data in the database.",
				),
				rootNodes: [], // Assuming rootNodes as an empty array in case of error
				...options?.planet,
			};
		}

		return options?.planet;
	}),
	makeWorld: adminRoleProtectedRoute
		.input(
			z
				.object({
					plID: z.number().optional(),
					plRecommend: z.boolean().default(true),
					plBirth: z.number().optional(),
					rootNodes: z.array(
						z.object({
							identity: z.string().min(1, "Identity must have a value."),
							endpoints: z
								.any()
								.refine(
									(data): data is string[] =>
										Array.isArray(data) && data.every((item) => typeof item === "string"),
									{
										message: "Endpoints must be an array of strings.",
									},
								),
							comments: z.string().optional(),
						}),
					),
				})
				.refine(
					// Validator function
					(data) => {
						if (!data.plRecommend) {
							return data.plID !== null && data.plBirth !== null;
						}
						return true;
					},
					// Error message
					{
						message:
							"If plRecommend is false, both plID and plBirth need to be provided.",
						path: ["plID", "plBirth"], // Path of the fields the error refers to
					},
				),
		)

		.mutation(async ({ ctx, input }) => {
			// data.plID 149604618 // official world in production ZeroTier Cloud
			// data.plID  227883110  // reserved world for future
			// data.plBirth 1567191349589
			try {
				const mkworldDir = `${ZT_FOLDER}/zt-mkworld`;
				const planetPath = `${ZT_FOLDER}/planet`;
				const backupDir = `${ZT_FOLDER}/planet_backup`;

				// Check for write permission on the directory
				try {
					fs.accessSync(ZT_FOLDER, fs.constants.W_OK);
				} catch (_err) {
					if (isRunningInDocker()) {
						throwError(
							`Please remove the :ro flag from the docker volume mount for ${ZT_FOLDER}`,
						);
					} else {
						throwError(
							`Permission error: cannot write to ${ZT_FOLDER}. Make sure the folder is writable.`,
						);
					}
				}

				// Check if identity.public exists
				if (!fs.existsSync(`${ZT_FOLDER}/identity.public`)) {
					throwError("identity.public file does NOT exist, cannot generate planet file.");
				}

				// Check if ztmkworld executable exists
				const ztmkworldBinPath = "/usr/local/bin/ztmkworld";
				if (!fs.existsSync(ztmkworldBinPath)) {
					throwError("ztmkworld executable does not exist at the specified location.");
				}
				// Ensure /var/lib/zerotier-one/zt-mkworld directory exists
				if (!fs.existsSync(mkworldDir)) {
					fs.mkdirSync(mkworldDir);
				}

				// Backup existing planet file if it exists
				if (fs.existsSync(planetPath)) {
					// we only backup the orginal planet file once
					if (!fs.existsSync(backupDir)) {
						fs.mkdirSync(backupDir);

						const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, "_");
						fs.copyFileSync(planetPath, `${backupDir}/planet.bak.${timestamp}`);
					}
				}
				// const identity = fs.readFileSync(`${ZT_FOLDER}/identity.public`, "utf-8").trim();

				/*
				 *
				 * Mock the mkworld.config.json file and write it to the file system
				 *
				 */

				const config: WorldConfig = {
					rootNodes: input.rootNodes.map((node) => ({
						comments: node.comments || "ztnet.network",
						identity: node.identity,
						endpoints: node.endpoints,
					})),
					signing: ["previous.c25519", "current.c25519"],
					output: "planet.custom",
					plID: input.plID || 0,
					plBirth: input.plBirth || 0,
					plRecommend: input.plRecommend,
				};

				fs.writeFileSync(`${mkworldDir}/mkworld.config.json`, JSON.stringify(config));

				/*
				 *
				 * Update local.conf file with the new port number
				 *
				 */
				// Extract the port numbers from the first endpoint string
				const portNumbers = input.rootNodes[0].endpoints[0]
					.split(",")
					.map((endpoint) => Number.parseInt(endpoint.split("/").pop() || "", 10));

				try {
					await updateLocalConf(portNumbers);
				} catch (error) {
					throwError(error);
				}

				/*
				 *
				 * Generate planet file using mkworld
				 *
				 */
				try {
					execSync(
						// "cd /etc/zt-mkworld && /usr/local/bin/ztmkworld -c /etc/zt-mkworld/mkworld.config.json",
						// use mkworldDir
						`cd ${mkworldDir} && ${ztmkworldBinPath} -c ${mkworldDir}/mkworld.config.json`,
					);
				} catch (_error) {
					throwError(
						"Could not create planet file. Please make sure your config is valid.",
					);
				}
				// Copy generated planet file
				fs.copyFileSync(`${mkworldDir}/planet.custom`, planetPath);

				/*
				 *
				 * Update DB with the new planet file details
				 *
				 */
				await ctx.prisma.planet.upsert({
					where: {
						id: 1,
					},
					update: {
						globalOptions: {
							connect: {
								id: 1,
							},
						},
						// Data for updating an existing Planet
						plBirth: input.plBirth || 0,
						plID: input.plID || 0,
						rootNodes: {
							deleteMany: {},
							create: config.rootNodes,
						},
					},
					create: {
						globalOptions: {
							connect: {
								id: 1,
							},
						},
						// Data for creating a new Planet
						plBirth: input.plBirth || 0,
						plID: input.plID || 0,
						rootNodes: {
							create: config.rootNodes,
						},
					},
				});

				return config;
			} catch (err: unknown) {
				if (err instanceof Error) {
					// Log the error and throw a custom error message
					throwError(`${err.message}`);
				} else {
					// Throw a generic error for unknown error types
					throwError("An unknown error occurred");
				}
			}
		}),
	resetWorld: adminRoleProtectedRoute.mutation(async ({ ctx }) => {
		const paths = {
			backupDir: `${ZT_FOLDER}/planet_backup`,
			planetPath: `${ZT_FOLDER}/planet`,
			mkworldDir: `${ZT_FOLDER}/zt-mkworld`,
		};

		const resetDatabase = async () => {
			await ctx.prisma.planet.deleteMany({});
		};

		try {
			// Ensure backup directory exists
			if (!fs.existsSync(paths.backupDir)) {
				await resetDatabase();
				throw new Error("Backup directory does not exist.");
			}

			// Get list of backup files and find the most recent
			const backups = fs
				.readdirSync(paths.backupDir)
				.filter((file) => file.startsWith("planet.bak."))
				.sort();

			// Restore from the latest backup
			const latestBackup = backups.at(-1);
			if (latestBackup) {
				fs.copyFileSync(`${paths.backupDir}/${latestBackup}`, paths.planetPath);
			}

			// Clean up backup and mkworld directories
			fs.rmSync(paths.backupDir, { recursive: true, force: true });
			fs.rmSync(paths.mkworldDir, { recursive: true, force: true });
			/*
			 *
			 * Reset local.conf with default port number
			 *
			 */
			try {
				await updateLocalConf([9993]);
			} catch (error) {
				throwError(error);
			}

			await resetDatabase();
			return { success: true };
		} catch (err) {
			if (err instanceof Error) {
				throwError(`Error during reset: ${err.message}`);
			} else {
				throwError("An unknown error occurred during reset.");
			}
		}
	}),

	createBackup: adminRoleProtectedRoute
		.input(
			z.object({
				includeDatabase: z.boolean().default(true),
				includeZerotier: z.boolean().default(true),
				backupName: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const backupName = input.backupName || `ztnet-backup-${timestamp}`;
				const backupDir = path.join(process.cwd(), "tmp", "backups");
				const tempDir = path.join(backupDir, "temp", Date.now().toString());
				const backupPath = path.join(backupDir, `${backupName}.tar.gz`);

				// Ensure backup and temp directories exist
				fs.mkdirSync(backupDir, { recursive: true });
				fs.mkdirSync(tempDir, { recursive: true });

				try {
					// Backup database
					if (input.includeDatabase) {
						const dbUrl = process.env.DATABASE_URL;
						if (!dbUrl) {
							throw new Error("DATABASE_URL not found");
						}

						if (!dbUrl.includes("postgresql")) {
							throw new Error("Only PostgreSQL databases are supported");
						}

						try {
							const dumpPath = path.join(tempDir, "database_dump.sql");

							// Parse PostgreSQL URL
							const url = new URL(dbUrl);
							const host = url.hostname;
							const port = url.port || "5432";
							const username = url.username;
							const password = url.password;
							const database = url.pathname.slice(1); // Remove leading slash

							// Set environment variables for pg_dump
							const env = {
								...process.env,
								PGPASSWORD: password,
							};

							const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --verbose --clean --if-exists`;

							execSync(`${dumpCommand} > "${dumpPath}"`, {
								env,
								stdio: ["pipe", "pipe", "inherit"],
							});

							// Check if dump file was created and has content
							if (fs.existsSync(dumpPath)) {
								const stats = fs.statSync(dumpPath);
								if (stats.size === 0) {
									throw new Error("Database dump file is empty");
								}
							} else {
								throw new Error("Database dump file was not created");
							}
						} catch (error) {
							throw new Error(`Database backup failed: ${error.message}`);
						}
					}

					// Backup ZeroTier folder
					if (input.includeZerotier && ZT_FOLDER && fs.existsSync(ZT_FOLDER)) {
						const ztBackupPath = path.join(tempDir, "zerotier");

						// Copy ZeroTier folder to temp directory
						try {
							execSync(`cp -r "${ZT_FOLDER}" "${ztBackupPath}"`, {
								stdio: ["pipe", "pipe", "inherit"],
							});
						} catch (error) {
							throw new Error(`ZeroTier backup failed: ${error.message}`);
						}
					}

					// Add metadata
					const metadata = {
						created: new Date().toISOString(),
						version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
						includeDatabase: input.includeDatabase,
						includeZerotier: input.includeZerotier,
						docker: isRunningInDocker(),
					};

					const metadataPath = path.join(tempDir, "backup_metadata.json");
					fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

					// Create tar.gz archive using system tar command
					try {
						// Change to temp directory and create archive with relative paths
						execSync(`cd "${tempDir}" && tar -czf "${backupPath}" .`, {
							stdio: ["pipe", "pipe", "inherit"],
						});
					} catch (error) {
						throw new Error(`Archive creation failed: ${error.message}`);
					}

					// Verify archive was created successfully
					if (!fs.existsSync(backupPath)) {
						throw new Error("Backup archive was not created");
					}

					// Clean up temp directory
					fs.rmSync(tempDir, { recursive: true, force: true });

					// Return backup info
					const stats = fs.statSync(backupPath);
					return {
						success: true,
						backupPath,
						fileName: `${backupName}.tar.gz`,
						size: stats.size,
						created: new Date().toISOString(),
					};
				} catch (error) {
					// Clean up temp directory on error
					if (fs.existsSync(tempDir)) {
						fs.rmSync(tempDir, { recursive: true, force: true });
					}
					throw error;
				}
			} catch (error) {
				throwError(`Backup creation failed: ${error.message}`);
			}
		}),

	// Download backup file
	downloadBackup: adminRoleProtectedRoute
		.input(
			z.object({
				fileName: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const backupDir = path.join(process.cwd(), "tmp", "backups");
				const filePath = path.join(backupDir, input.fileName);

				if (!fs.existsSync(filePath)) {
					throwError("Backup file not found");
				}

				// Security check - ensure file is within backup directory
				const resolvedPath = path.resolve(filePath);
				const resolvedBackupDir = path.resolve(backupDir);
				if (!resolvedPath.startsWith(resolvedBackupDir)) {
					throwError("Invalid file path");
				}

				const fileBuffer = fs.readFileSync(filePath);
				return {
					data: fileBuffer.toString("base64"),
					fileName: input.fileName,
					size: fileBuffer.length,
				};
			} catch (error) {
				throwError(`Download failed: ${error.message}`);
			}
		}),

	// List available backups
	listBackups: adminRoleProtectedRoute.query(async () => {
		try {
			const backupDir = path.join(process.cwd(), "tmp", "backups");

			if (!fs.existsSync(backupDir)) {
				return [];
			}

			const files = fs.readdirSync(backupDir);
			const backups = files
				.filter((file) => file.endsWith(".tar.gz"))
				.map((file) => {
					const filePath = path.join(backupDir, file);
					const stats = fs.statSync(filePath);
					return {
						fileName: file,
						size: stats.size,
						created: stats.birthtime.toISOString(),
						modified: stats.mtime.toISOString(),
					};
				})
				.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

			return backups;
		} catch (_error) {
			return [];
		}
	}),

	// Delete backup
	deleteBackup: adminRoleProtectedRoute
		.input(
			z.object({
				fileName: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const backupDir = path.join(process.cwd(), "tmp", "backups");
				const filePath = path.join(backupDir, input.fileName);

				// Security check
				const resolvedPath = path.resolve(filePath);
				const resolvedBackupDir = path.resolve(backupDir);
				if (!resolvedPath.startsWith(resolvedBackupDir)) {
					throwError("Invalid file path");
				}

				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
					return { success: true };
				}
				throwError("Backup file not found");
			} catch (error) {
				throwError(`Delete failed: ${error.message}`);
			}
		}),
	restoreBackup: adminRoleProtectedRoute
		.input(
			z.object({
				fileName: z.string(),
				restoreDatabase: z.boolean().default(true),
				restoreZerotier: z.boolean().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const backupDir = path.join(process.cwd(), "tmp", "backups");
				const backupPath = path.join(backupDir, input.fileName);
				const extractDir = path.join(backupDir, "extract", Date.now().toString());

				// Security check
				const resolvedPath = path.resolve(backupPath);
				const resolvedBackupDir = path.resolve(backupDir);
				if (!resolvedPath.startsWith(resolvedBackupDir)) {
					throwError("Invalid file path");
				}

				if (!fs.existsSync(backupPath)) {
					throwError("Backup file not found");
				}

				// Create extraction directory
				fs.mkdirSync(extractDir, { recursive: true });

				// Extract backup using tar (available by default on Debian and FreeBSD)
				try {
					// Determine compression type from file extension
					let tarOptions = "-xf";
					if (input.fileName.endsWith(".tar.gz") || input.fileName.endsWith(".tgz")) {
						tarOptions = "-xzf";
					} else if (input.fileName.endsWith(".tar.bz2")) {
						tarOptions = "-xjf";
					} else if (input.fileName.endsWith(".tar.xz")) {
						tarOptions = "-xJf";
					}

					execSync(`tar ${tarOptions} "${backupPath}" -C "${extractDir}"`, {
						stdio: ["pipe", "pipe", "inherit"],
					});
				} catch (extractError) {
					throw new Error(`Failed to extract backup: ${extractError.message}`);
				}

				// Read metadata
				const metadataPath = path.join(extractDir, "backup_metadata.json");
				let metadata: BackupMetadata = {};
				if (fs.existsSync(metadataPath)) {
					metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
				}

				// Restore database
				if (input.restoreDatabase) {
					const sqlDumpPath = path.join(extractDir, "database_dump.sql");
					const dbUrl = process.env.DATABASE_URL;

					if (!dbUrl) {
						throw new Error("DATABASE_URL not found");
					}

					if (!dbUrl.includes("postgresql")) {
						throw new Error("Only PostgreSQL databases are supported");
					}

					if (fs.existsSync(sqlDumpPath)) {
						// Check dump file size
						const dumpStats = fs.statSync(sqlDumpPath);
						if (dumpStats.size === 0) {
							throw new Error("Database dump file is empty");
						}

						// Parse PostgreSQL URL
						const url = new URL(dbUrl);
						const host = url.hostname;
						const port = url.port || "5432";
						const username = url.username;
						const password = url.password;
						const database = url.pathname.slice(1); // Remove leading slash

						// Set environment variables for psql
						const env = {
							...process.env,
							PGPASSWORD: password,
						};

						const restoreCommand = `psql -h ${host} -p ${port} -U ${username} -d ${database}`;

						execSync(`${restoreCommand} < "${sqlDumpPath}"`, {
							env,
							stdio: ["pipe", "pipe", "inherit"],
						});
					}
				}

				// Restore ZeroTier folder
				if (input.restoreZerotier && ZT_FOLDER) {
					const ztBackupPath = path.join(extractDir, "zerotier");
					if (fs.existsSync(ztBackupPath)) {
						const dockerMode = isRunningInDocker();

						if (dockerMode) {
							// Docker Compose setup - ZeroTier runs in separate container
							// Check if zerotier container is running and stop it
							try {
								const containerCheck = execSync(
									"docker ps --format '{{.Names}}' | grep -w zerotier",
									{ encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
								);

								if (containerCheck.trim()) {
									try {
										execSync("docker stop zerotier", { stdio: "ignore", timeout: 30000 });
										await new Promise((resolve) => setTimeout(resolve, 3000));
									} catch {
										// Continue anyway if we can't stop the container
									}
								}
							} catch {
								// Docker command not available or container not found - continue anyway
							}

							// Backup current folder
							const ztBackupCurrent = `${ZT_FOLDER}.backup.${Date.now()}`;
							if (fs.existsSync(ZT_FOLDER)) {
								let backupSuccess = false;
								let retries = 5;

								while (!backupSuccess && retries > 0) {
									try {
										execSync("sync", { stdio: "ignore" });
										execSync(`cp -r "${ZT_FOLDER}" "${ztBackupCurrent}"`, {
											stdio: "ignore",
										});
										backupSuccess = true;
									} catch {
										retries--;
										if (retries > 0) {
											await new Promise((resolve) => setTimeout(resolve, 3000));
										}
									}
								}
							}

							// Clear existing contents
							try {
								const items = fs.readdirSync(ZT_FOLDER);
								for (const item of items) {
									const itemPath = path.join(ZT_FOLDER, item);
									const stat = fs.statSync(itemPath);
									if (stat.isDirectory()) {
										fs.rmSync(itemPath, { recursive: true, force: true });
									} else {
										fs.unlinkSync(itemPath);
									}
								}
							} catch {
								// Continue if we can't clear contents
							}

							// Copy restored files
							try {
								execSync(`cp -r "${ztBackupPath}"/* "${ZT_FOLDER}"/`, {
									stdio: "ignore",
								});

								// Copy hidden files
								try {
									execSync(`cp -r "${ztBackupPath}"/.[^.]* "${ZT_FOLDER}"/`, {
										stdio: "ignore",
									});
								} catch {
									// Ignore if no hidden files exist
								}
							} catch (copyError) {
								throw new Error(`Failed to copy restored files: ${copyError.message}`);
							}

							// Set proper permissions
							try {
								execSync(`chown -R 999:999 "${ZT_FOLDER}"`, { stdio: "ignore" });
								execSync(`chmod -R 700 "${ZT_FOLDER}"`);
							} catch {
								// Continue if we can't set permissions
							}

							// Start the ZeroTier container
							try {
								execSync("docker start zerotier", { stdio: "ignore", timeout: 30000 });
								await new Promise((resolve) => setTimeout(resolve, 5000));
							} catch {
								// Don't throw error, just log warning - the restore was successful
								console.warn(
									"Could not start ZeroTier container automatically. Please run: docker restart zerotier",
								);
							}
						} else {
							// Host installation - ZeroTier runs as system service
							// Stop ZeroTier service on host
							const stopMethods = [
								() => execSync("systemctl stop zerotier-one", { stdio: "ignore" }),
								() => execSync("service zerotier-one stop", { stdio: "ignore" }),
								() => execSync("pkill -f zerotier-one", { stdio: "ignore" }),
							];

							for (const method of stopMethods) {
								try {
									method();
									break;
								} catch {
									// Try next method
								}
							}

							// Wait for service to stop
							await new Promise((resolve) => setTimeout(resolve, 2000));

							// Force kill any remaining processes
							try {
								execSync("pkill -9 -f zerotier", { stdio: "ignore" });
								await new Promise((resolve) => setTimeout(resolve, 1000));
							} catch {
								// Continue if no processes to kill
							}

							// Backup current folder
							const ztBackupCurrent = `${ZT_FOLDER}.backup.${Date.now()}`;
							if (fs.existsSync(ZT_FOLDER)) {
								let backupSuccess = false;
								let retries = 3;

								while (!backupSuccess && retries > 0) {
									try {
										fs.renameSync(ZT_FOLDER, ztBackupCurrent);
										backupSuccess = true;
									} catch (renameError) {
										retries--;
										if (renameError.code === "EBUSY" && retries > 0) {
											await new Promise((resolve) => setTimeout(resolve, 2000));
										} else if (retries === 0) {
											// Fallback to copy
											try {
												execSync(`cp -r "${ZT_FOLDER}" "${ztBackupCurrent}"`);
												execSync(`rm -rf "${ZT_FOLDER}"`);
												backupSuccess = true;
											} catch (_copyError) {
												throw new Error(
													`Failed to backup current ZeroTier folder: ${renameError.message}`,
												);
											}
										}
									}
								}
							}

							// Copy restored folder
							fs.mkdirSync(path.dirname(ZT_FOLDER), { recursive: true });
							execSync(`cp -r "${ztBackupPath}" "${ZT_FOLDER}"`);

							// Set proper permissions for host installation
							try {
								execSync(`chown -R root:root "${ZT_FOLDER}"`);
								execSync(`chmod -R 700 "${ZT_FOLDER}"`);
							} catch {
								// Continue if we can't set permissions
							}

							// Start ZeroTier service on host
							const startMethods = [
								() => execSync("systemctl start zerotier-one", { stdio: "ignore" }),
								() => execSync("service zerotier-one start", { stdio: "ignore" }),
								() => execSync("zerotier-one -d", { stdio: "ignore" }),
							];

							let serviceStarted = false;
							for (const method of startMethods) {
								try {
									method();
									serviceStarted = true;
									break;
								} catch {
									// Try next method
								}
							}

							if (!serviceStarted) {
								console.warn(
									"Could not start ZeroTier service automatically. Please run: systemctl start zerotier-one",
								);
							}
						}
					}
				}

				// Clean up extraction directory
				fs.rmSync(extractDir, { recursive: true, force: true });

				return {
					success: true,
					metadata,
					restoredDatabase: input.restoreDatabase,
					restoredZerotier: input.restoreZerotier,
				};
			} catch (mainError) {
				throwError(`Restore failed: ${mainError.message}`);
			}
		}),

	// Upload backup file
	uploadBackup: adminRoleProtectedRoute
		.input(
			z.object({
				fileName: z.string(),
				fileData: z.string(), // base64 encoded file data
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const backupDir = path.join(process.cwd(), "tmp", "backups");
				fs.mkdirSync(backupDir, { recursive: true });

				const filePath = path.join(backupDir, input.fileName);

				// Security check - ensure filename is safe
				if (
					!input.fileName.endsWith(".tar.gz") ||
					input.fileName.includes("..") ||
					input.fileName.includes("/")
				) {
					throwError("Invalid filename");
				}

				// Convert base64 to buffer and save - fix the Buffer type issue
				const fileBuffer = Buffer.from(input.fileData, "base64");
				fs.writeFileSync(filePath, new Uint8Array(fileBuffer));

				const stats = fs.statSync(filePath);
				return {
					success: true,
					fileName: input.fileName,
					size: stats.size,
					uploaded: new Date().toISOString(),
				};
			} catch (error) {
				throwError(`Upload failed: ${error.message}`);
			}
		}),
});
