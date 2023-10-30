import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
import { z } from "zod";
import * as ztController from "~/utils/ztApi";
import ejs from "ejs";
import {
	forgotPasswordTemplate,
	inviteUserTemplate,
	notificationTemplate,
} from "~/utils/mail";
import { createTransporter, sendEmail } from "~/utils/mail";
import type nodemailer from "nodemailer";
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
import {
	API_TOKEN_SECRET,
	decrypt,
	encrypt,
	generateInstanceSecret,
} from "~/utils/encryption";
import { SMTP_SECRET } from "~/utils/encryption";
import { ZT_FOLDER } from "~/utils/ztApi";
import { isRunningInDocker } from "~/utils/docker";

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
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { secret, expireTime, timesCanUse } = input;
			const token = jwt.sign({ secret }, process.env.NEXTAUTH_SECRET, {
				expiresIn: `${expireTime}m`,
			});
			const url = `${process.env.NEXTAUTH_URL}/auth/register?invite=${token}`;
			// Store the token, email, createdBy, and expiration in the UserInvitation table
			await ctx.prisma.userInvitation.create({
				data: {
					token,
					url,
					secret,
					timesCanUse: parseInt(timesCanUse) || 1,
					expires: new Date(Date.now() + parseInt(expireTime) * 60 * 1000),
					createdBy: ctx.session.user.id,
				},
			});

			return token;
		}),
	getInvitationLink: adminRoleProtectedRoute.query(async ({ ctx }) => {
		return await ctx.prisma.userInvitation.findMany({
			where: {
				createdBy: ctx.session.user.id,
			},
		});
	}),
	deleteInvitationLink: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.userInvitation.delete({
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
			for (const network of networks) {
				const members = await ztController.network_members(ctx, network as string);
				totalMembers += Object.keys(members).length;
			}

			const controllerStatus = (await ztController.get_controller_status(
				ctx,
				isCentral,
			)) as ZTControllerNodeStatus;
			return {
				networkCount,
				totalMembers,
				controllerStatus,
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
			options.smtpPassword = decrypt(
				options.smtpPassword,
				generateInstanceSecret(SMTP_SECRET),
			);
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

			switch (input.template) {
				case "inviteUserTemplate":
					return templates?.inviteUserTemplate ?? inviteUserTemplate();
				case "forgotPasswordTemplate":
					return templates?.forgotPasswordTemplate ?? forgotPasswordTemplate();
				case "notificationTemplate":
					return templates?.notificationTemplate ?? notificationTemplate();
				default:
					return {};
			}
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
			const templateObj = JSON.parse(input.template) as string;
			switch (input.type) {
				case "inviteUserTemplate":
					return await ctx.prisma.globalOptions.update({
						where: {
							id: 1,
						},
						data: {
							inviteUserTemplate: templateObj,
						},
					});
				case "forgotPasswordTemplate":
					return await ctx.prisma.globalOptions.update({
						where: {
							id: 1,
						},
						data: {
							forgotPasswordTemplate: templateObj,
						},
					});
				case "notificationTemplate":
					return await ctx.prisma.globalOptions.update({
						where: {
							id: 1,
						},
						data: {
							notificationTemplate: templateObj,
						},
					});
				default:
					break;
			}
		}),
	getDefaultMailTemplate: adminRoleProtectedRoute
		.input(
			z.object({
				template: z.string(),
			}),
		)
		.mutation(({ input }) => {
			switch (input.template) {
				case "inviteUserTemplate":
					return inviteUserTemplate();
				case "forgotPasswordTemplate":
					return forgotPasswordTemplate();
				case "notificationTemplate":
					return notificationTemplate();
				default:
					break;
			}
		}),
	sendTestMail: adminRoleProtectedRoute
		.input(
			z.object({
				type: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const globalOptions = await ctx.prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			async function sendTemplateEmail(template) {
				const renderedTemplate = await ejs.render(
					JSON.stringify(template),
					{
						toEmail: ctx.session.user.email,
						toName: ctx.session.user.name,
						fromName: ctx.session.user.name,
						forgotLink: "https://example.com",
						notificationMessage: "Test notification message",
						nwid: "123456789",
					},
					{ async: true },
				);

				const parsedTemplate = JSON.parse(renderedTemplate) as Record<string, string>;

				const transporter: nodemailer.Transporter = createTransporter(globalOptions);

				// Define mail options
				const mailOptions = {
					from: globalOptions.smtpEmail,
					to: ctx.session.user.email,
					subject: parsedTemplate.subject,
					html: parsedTemplate.body,
				};

				// Send test mail to user
				await sendEmail(transporter, mailOptions);
			}

			switch (input.type) {
				case "inviteUserTemplate": {
					const defaultInviteTemplate = inviteUserTemplate();
					const inviteTemplate =
						globalOptions?.inviteUserTemplate ?? defaultInviteTemplate;
					await sendTemplateEmail(inviteTemplate);
					break;
				}

				case "forgotPasswordTemplate": {
					const defaultForgotTemplate = forgotPasswordTemplate();
					const forgotTemplate =
						globalOptions?.forgotPasswordTemplate ?? defaultForgotTemplate;
					await sendTemplateEmail(forgotTemplate);
					break;
				}
				case "notificationTemplate": {
					const defaultNotificationTemplate = notificationTemplate();
					const notifiyTemplate =
						globalOptions?.notificationTemplate ?? defaultNotificationTemplate;
					await sendTemplateEmail(notifiyTemplate);
					break;
				}
				default:
					break;
			}
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
	unlinkedNetwork: adminRoleProtectedRoute.query(async ({ ctx }) => {
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

			const unlinkArr: NetworkAndMemberResponse[] = await Promise.all(
				unlinkedNetworks.map((unlinked) =>
					ztController.local_network_detail(ctx, unlinked, false),
				),
			);

			return unlinkArr;
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
	makeWorld: adminRoleProtectedRoute
		.input(
			z
				.object({
					plID: z.number().optional(),
					plRecommend: z.boolean().default(true),
					plBirth: z.number().optional(),
					comment: z.string().nullable().optional(),
					identity: z.string().optional(),
					endpoints: z.string(),
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
				const identity =
					input.identity ||
					fs.readFileSync(`${ZT_FOLDER}/identity.public`, "utf-8").trim();

				/*
				 *
				 * Mock the mkworld.config.json file and write it to the file system
				 *
				 */
				const config: WorldConfig = {
					rootNodes: [
						{
							comments: `${input.comment || "default.domain"}`,
							identity,
							endpoints: input.endpoints.split(","),
						},
					],
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
				// Extract the port numbers from the endpoint string
				const portNumbers = input.endpoints
					.split(",")
					.map((endpoint) => parseInt(endpoint.split("/").pop() || "", 10));
				// if (portNumbers.length > 1 && portNumbers[0] !== portNumbers[1]) {
				// 	throwError("Error: Port numbers are not equal in the provided endpoints");
				// }

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
				await ctx.prisma.globalOptions.update({
					where: {
						id: 1,
					},
					data: {
						customPlanetUsed: true,
						plBirth: config.plBirth,
						plID: config.plID,
						plEndpoints: Array.isArray(config.rootNodes[0]?.endpoints)
							? config.rootNodes[0].endpoints.join(",")
							: null,
						plComment: config.rootNodes[0].comments,
						plRecommend: config.plRecommend,
						plIdentity: config.rootNodes[0].identity,
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
			await ctx.prisma.globalOptions.update({
				where: { id: 1 },
				data: {
					customPlanetUsed: false,
					plBirth: 0,
					plID: 0,
					plEndpoints: "",
					plComment: "",
					plRecommend: true,
					plIdentity: "",
				},
			});
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

			if (backups.length === 0) {
				throw new Error("No backup files found.");
			}

			// Restore from the latest backup
			const latestBackup = backups.at(-1);
			fs.copyFileSync(`${paths.backupDir}/${latestBackup}`, paths.planetPath);

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
	getApiToken: adminRoleProtectedRoute.query(async ({ ctx }) => {
		return await ctx.prisma.aPIToken.findMany({
			where: {
				userId: ctx.session.user.id,
			},
		});
	}),
	addApiToken: adminRoleProtectedRoute
		.input(
			z.object({
				name: z.string().min(5).max(50),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const token_content: string = JSON.stringify({
				name: input.name,
				userId: ctx.session.user.id,
			});

			const token_hash = encrypt(token_content, generateInstanceSecret(API_TOKEN_SECRET));
			const token = await ctx.prisma.aPIToken.create({
				data: {
					token: token_hash,
					name: input.name,
					userId: ctx.session.user.id,
				},
			});
			return token;
		}),

	deleteApiToken: adminRoleProtectedRoute
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.aPIToken.delete({
				where: {
					id: input.id,
					userId: ctx.session.user.id,
				},
			});
		}),
});
