import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
import { z } from "zod";
import * as ztController from "~/utils/ztApi";
import { mailTemplateMap, sendMailWithTemplate } from "~/utils/mail";
import { GlobalOptions, Role } from "@prisma/client";
import { throwError } from "~/server/helpers/errorHandler";
import { type ZTControllerNodeStatus } from "~/types/ztController";
import { NetworkAndMemberResponse } from "~/types/network";
import { execSync } from "child_process";
import fs from "fs";
import { WorldConfig } from "~/types/worldConfig";
import axios from "axios";
import { updateLocalConf } from "~/utils/planet";
import jwt from "jsonwebtoken";
import { networkRouter } from "./networkRouter";
import { decrypt, encrypt, generateInstanceSecret } from "~/utils/encryption";
import { SMTP_SECRET } from "~/utils/encryption";
import { ZT_FOLDER } from "~/utils/ztApi";
import { isRunningInDocker } from "~/utils/docker";
import { getNetworkClassCIDR } from "~/utils/IPv4gen";
import { InvitationLinkType } from "~/types/invitation";
import { createMoon } from "../services/adminService";

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
			const url = `${process.env.NEXTAUTH_URL}/auth/register?invite=${token}`;

			// Store the token, email, createdBy, and expiration in the UserInvitation table
			await ctx.prisma.invitation.create({
				data: {
					token,
					url,
					secret,
					groupId,
					timesCanUse: parseInt(timesCanUse) || 1,
					expiresAt: new Date(Date.now() + parseInt(expireTime) * 60 * 1000),
					invitedById: ctx.session.user.id,
				},
			});

			return token;
		}),
	getInvitationLink: adminRoleProtectedRoute.query(async ({ ctx }) => {
		const invite = await ctx.prisma.invitation.findMany({
			where: {
				invitedById: ctx.session.user.id,
			},
		});

		// map over and check if groupId exists, and if so get the group name
		const invitationLinks: InvitationLinkType[] = await Promise.all(
			invite.map(async (inv) => {
				let groupName = null;
				if (inv.groupId) {
					const group = await ctx.prisma.userGroup.findUnique({
						where: {
							id: parseInt(inv.groupId, 10),
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
				type: z.string(),
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

			await sendMailWithTemplate(mailTemplateMap[type], {
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

				// Use upsert to either update or create a new userGroup
				return await ctx.prisma.userGroup.upsert({
					where: {
						id: input.id || -1,
					},
					create: {
						name: input.groupName,
						maxNetworks: parseInt(input.maxNetworks),
						isDefault: input.isDefault,
					},
					update: {
						name: input.groupName,
						maxNetworks: parseInt(input.maxNetworks),
						isDefault: input.isDefault,
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
						},
					});
				}

				const userGroup = await ctx.prisma.userGroup.findUnique({
					where: {
						id: parseInt(input.userGroupId),
					},
				});

				if (!user || !userGroup) {
					throw new Error("User or UserGroup not found");
				}

				// Assign the user to the user group
				return await ctx.prisma.user.update({
					where: {
						id: input.userid,
					},
					data: {
						userGroupId: parseInt(input.userGroupId), // Link the user to the userGroup
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
						isMoon: true,
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
							isMoon: z.boolean().default(false),
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
				const moonPath = `${ZT_FOLDER}/moon`;
				// binary path
				const ztmkworldBinPath = "/usr/local/bin/ztmkworld";

				// Ensure the moon identity is created if it doesn't exist
				const identityPath = `${ZT_FOLDER}/identity.secret`;

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
				if (!fs.existsSync(identityPath)) {
					throwError("identity.public file does NOT exist, cannot generate planet file.");
				}

				if (!fs.existsSync(ztmkworldBinPath)) {
					throwError("ztmkworld executable does not exist at the specified location.");
				}
				// Ensure /var/lib/zerotier-one/zt-mkworld directory exists
				if (!fs.existsSync(mkworldDir)) {
					fs.mkdirSync(mkworldDir);
				}

				// make sure the moon directory exists
				if (!fs.existsSync(moonPath)) {
					fs.mkdirSync(moonPath);
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
						isMoon: node.isMoon,
					})),
					signing: ["previous.c25519", "current.c25519"],
					output: "planet.custom",
					plID: input.plID || 0,
					plBirth: input.plBirth || 0,
					plRecommend: input.plRecommend,
				};

				// Process moons
				if (input.rootNodes.some((node) => node.isMoon)) {
					await createMoon(input.rootNodes, moonPath);
				}

				// Check if there are any non-moon roots
				const planetRoots = input.rootNodes.filter((node) => !node.isMoon);

				if (planetRoots.length > 0) {
					// Create planet file
					const config: WorldConfig = {
						rootNodes: planetRoots.map((node) => ({
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

					fs.writeFileSync(
						`${mkworldDir}/mkworld.config.json`,
						JSON.stringify(config, null, 2),
					);

					// Update local.conf with the port number from the first non-moon root
					const portNumbers = planetRoots[0].endpoints[0]
						.split(",")
						.map((endpoint) => parseInt(endpoint.split("/").pop() || "", 10));

					try {
						await updateLocalConf(portNumbers);
					} catch (error) {
						throwError(error);
					}

					// Generate planet file
					try {
						execSync(
							`cd ${mkworldDir} && ${ztmkworldBinPath} -c ${mkworldDir}/mkworld.config.json`,
						);
					} catch (_error) {
						throwError(
							"Could not create planet file. Please make sure your config is valid.",
						);
					}

					// Copy generated planet file
					fs.copyFileSync(`${mkworldDir}/planet.custom`, planetPath);
				}

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
			moonPath: `${ZT_FOLDER}/moon`,
			moonsDPath: `${ZT_FOLDER}/moons.d`,
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
			fs.rmSync(paths.moonPath, { recursive: true, force: true });
			fs.rmSync(paths.moonsDPath, { recursive: true, force: true });

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
});
