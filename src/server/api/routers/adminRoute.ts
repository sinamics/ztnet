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
import { Role } from "@prisma/client";
import { throwError } from "~/server/helpers/errorHandler";
import { type ZTControllerNodeStatus } from "~/types/ztController";
import { NetworkAndMemberResponse } from "~/types/network";
import { execSync } from "child_process";
import fs from "fs";
import axios from "axios";

export const adminRouter = createTRPCRouter({
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
				},

				where: input.isAdmin ? { role: "ADMIN" } : undefined,
			});
			return users;
		}),

	getControllerStats: adminRoleProtectedRoute.query(async ({ ctx }) => {
		try {
			const isCentral = false;
			const networks = await ztController.get_controller_networks(
				ctx,
				isCentral,
			);

			const networkCount = networks.length;
			let totalMembers = 0;
			for (const network of networks) {
				const members = await ztController.network_members(
					ctx,
					network as string,
				);
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
		return await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
		});
	}),
	// Set global options
	changeRole: adminRoleProtectedRoute
		.input(
			z.object({
				role: z
					.string()
					.refine((value) => Object.values(Role).includes(value as Role), {
						message: "Role is not valid",
						path: ["role"],
					}),
				id: z.number(),
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

				const parsedTemplate = JSON.parse(renderedTemplate) as Record<
					string,
					string
				>;

				const transporter: nodemailer.Transporter =
					createTransporter(globalOptions);

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
			const ztNetworks = (await ztController.get_controller_networks(
				ctx,
			)) as string[];
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
						id: input.id || -1, // If no ID is provided, it assumes -1 which likely doesn't exist (assuming positive autoincrementing IDs)
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
					throwError(
						"Could not process user group operation! Please try again",
					);
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
				userid: z.number(),
				userGroupId: z.string().nullable(), // Allow null value for userGroupId
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.id === input.userid) {
				throwError("You can't change your own Group");
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

				// Check if the user and the user group exist
				const user = await ctx.prisma.user.findUnique({
					where: {
						id: input.userid,
					},
				});

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

	getWorld: adminRoleProtectedRoute.query(async () => {
		try {
			// Using ip.sb as an example service to get the public IP
			const response = await axios.get("https://api.ip.sb/ip");
			return { ip: response.data.trim() };
		} catch (err) {
			if (err instanceof Error) {
				throw new Error(`Failed to retrieve public IP: ${err.message}`);
			} else {
				throw new Error("An unknown error occurred while retrieving public IP");
			}
		}
	}),
	makeWorld: adminRoleProtectedRoute
		.input(
			z.object({
				domain: z.string().optional(),
				endpoints: z.string(),
				comment: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Check if identity.public exists
				if (!fs.existsSync("/var/lib/zerotier-one/identity.public")) {
					throwError(
						"identity.public file does NOT exist, cannot generate planet file.",
					);
				}
				const ztmkworldPath = "/usr/local/bin/ztmkworld";
				if (!fs.existsSync(ztmkworldPath)) {
					throwError(
						"ztmkworld executable does not exist at the specified location.",
					);
				}
				// Ensure /etc/zt-mkworld directory exists
				const mkworldDir = "/etc/zt-mkworld";
				if (!fs.existsSync(mkworldDir)) {
					fs.mkdirSync(mkworldDir);
				}

				// Backup existing planet file if it exists
				const planetPath = "/var/lib/zerotier-one/planet";
				if (fs.existsSync(planetPath)) {
					const backupFolder = "/var/lib/zerotier-one/planet_backup";
					if (!fs.existsSync(backupFolder)) {
						fs.mkdirSync(backupFolder);
					}
					const timestamp = new Date()
						.toISOString()
						.replace(/[^a-zA-Z0-9]/g, "_");
					fs.copyFileSync(
						planetPath,
						`${backupFolder}/planet.bak.${timestamp}`,
					);
				}

				const config = {
					rootNodes: [
						{
							comments: `custom planet - ${
								input.domain || "default.domain"
							} - ${input.endpoints}`,
							identity: fs
								.readFileSync("/var/lib/zerotier-one/identity.public", "utf-8")
								.trim(),
							endpoints: [input.endpoints],
						},
					],
					signing: ["previous.c25519", "current.c25519"],
					output: "planet.custom",
					plID: 0,
					plBirth: 0,
					plRecommend: true,
				};
				fs.writeFileSync(
					"/etc/zt-mkworld/mkworld.config.json",
					JSON.stringify(config),
				);

				// Run ztmkworld command
				execSync(
					"cd /etc/zt-mkworld && /usr/local/bin/ztmkworld -c /etc/zt-mkworld/mkworld.config.json",
				);

				// Copy generated planet file
				// fs.copyFileSync(
				// 	"/etc/zt-mkworld/planet.custom",
				// 	"/var/lib/zerotier-one/planet",
				// );

				return { success: true };
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
});
