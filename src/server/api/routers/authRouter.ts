import { z } from "zod";
import bcrypt from "bcryptjs";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
	//   protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { throwError } from "~/server/helpers/errorHandler";
import jwt from "jsonwebtoken";
import {
	createTransporter,
	sendEmail,
	forgotPasswordTemplate,
	notificationTemplate,
} from "~/utils/mail";
import ejs from "ejs";
import * as ztController from "~/utils/ztApi";
import {
	API_TOKEN_SECRET,
	PASSWORD_RESET_SECRET,
	encrypt,
	generateInstanceSecret,
} from "~/utils/encryption";
import { isRunningInDocker } from "~/utils/docker";
import { Invitation, User, UserDevice, UserOptions } from "@prisma/client";
import { validateOrganizationToken } from "../services/organizationAuthService";
import rateLimit from "~/utils/rateLimit";
import { ErrorCode } from "~/utils/errorCode";

// This regular expression (regex) is used to validate a password based on the following criteria:
// - The password must be at least 6 characters long.
// - The password must contain at least two of the following three character types:
//  - Lowercase letters (a-z)
//  - Uppercase letters (A-Z)
//  - Digits (0-9)
const mediumPassword = new RegExp(
	"^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})",
);

// allow 15 requests per 10 minutes
const limiter = rateLimit({
	interval: 10 * 60 * 1000, // 600 seconds or 10 minutes
	uniqueTokenPerInterval: 1000,
});

const GENERAL_REQUEST_LIMIT = 60;
const SHORT_REQUEST_LIMIT = 5;

// create a zod password schema
const passwordSchema = (errorMessage: string) =>
	z
		.string()
		.max(40)
		.refine((val) => {
			if (!mediumPassword.test(val)) {
				throw new Error(errorMessage);
			}
			return true;
		})
		.optional();

export const authRouter = createTRPCRouter({
	register: publicProcedure
		.input(
			z.object({
				email: z
					.string()
					.email()
					.transform((val) => val.trim()),
				password: passwordSchema("password does not meet the requirements!"),
				name: z.string().min(3, "Name must contain at least 3 character(s)").max(40),
				expiresAt: z.string().optional(),
				ztnetInvitationCode: z.string().optional(),
				ztnetOrganizationToken: z.string().optional(),
				token: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// add rate limit
			try {
				await limiter.check(ctx.res, GENERAL_REQUEST_LIMIT, "REGISTER_USER");
			} catch {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded",
				});
			}

			const {
				email,
				password,
				name,
				ztnetInvitationCode,
				ztnetOrganizationToken,
				token,
				expiresAt,
			} = input;
			const settings = await ctx.prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			// Validate the organization token if it exists
			const decryptedOrgToken = await validateOrganizationToken(
				ztnetOrganizationToken,
				email,
			);
			const invitationToken = ztnetInvitationCode?.trim() || token?.trim();

			// ztnet user invitation
			let invitation: Invitation | null = null;

			// ztnet user invitation
			const hasValidCode =
				invitationToken &&
				(await (async () => {
					if (!ztnetInvitationCode.trim()) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "No invitation code provided",
						});
					}
					invitation = await ctx.prisma.invitation.findUnique({
						where: { token: token.trim(), secret: ztnetInvitationCode.trim() },
					});

					if (
						!invitation ||
						invitation.used ||
						invitation.timesUsed >= invitation.timesCanUse
					) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: invitation
								? "Code has already been used"
								: "Invitation has expired or is invalid",
						});
					}

					// Validate the token using jwt
					try {
						jwt.verify(token.trim(), process.env.NEXTAUTH_SECRET);
					} catch (_e) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Invitation has expired or is invalid",
						});
					}

					await ctx.prisma.invitation.update({
						where: { token: token.trim() },
						data: {
							used: invitation.timesUsed + 1 >= invitation.timesCanUse,
							timesUsed: {
								increment: 1,
							},
						},
					});

					return true;
				})());

			// check if enableRegistration is true
			if (!settings.enableRegistration && !hasValidCode && !decryptedOrgToken) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Registration is disabled! Please contact the administrator.",
				});
			}

			// Email validation
			if (!email) return new Error("Email required!");
			if (!z.string().nonempty().parse(email)) return new Error("Email not supported!");

			// Fecth from database
			// const user = await client.query(`SELECT * FROM users WHERE email = $1 FETCH FIRST ROW ONLY`, [email]);
			const registerUser = await ctx.prisma.user.findFirst({
				where: {
					email: email,
				},
			});

			// validate
			if (registerUser) {
				// eslint-disable-next-line no-throw-literal
				// throw new AuthenticationError(`email "${email}" already taken`);
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `email "${email}" already taken`,
					// optional: pass the original error to retain stack trace
					// cause: theError,
				});
			}

			// hash password
			if (password) {
				if (!mediumPassword.test(password))
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Password does not meet the requirements!",
						// optional: pass the original error to retain stack trace
						// cause: theError,
					});
			}

			const hash = bcrypt.hashSync(password, 10);

			// TODO send validation link to user by mail
			// sendMailValidationLink(i);

			// Check the total number of users in the database
			const userCount = await ctx.prisma.user.count();

			// Fetch the default user group if any.
			const defaultUserGroup = await ctx.prisma.userGroup.findFirst({
				where: {
					isDefault: true,
				},
			});

			// create new user
			const newUser = await ctx.prisma.user.create({
				data: {
					name,
					email,
					expiresAt,
					lastLogin: new Date().toISOString(),
					role: userCount === 0 ? "ADMIN" : "USER",
					hash,

					// Conditionally assign user to a group
					...(invitation?.groupId
						? {
								userGroup: {
									connect: {
										id: parseInt(invitation.groupId, 10),
									},
								},
						  }
						: defaultUserGroup
						  ? {
									userGroup: {
										connect: {
											id: defaultUserGroup.id,
										},
									},
							  }
						  : {}),
					// add user to organizationRoles if the token is valid
					organizationRoles: decryptedOrgToken
						? {
								create: {
									organizationId: decryptedOrgToken.organizationId,
									role: decryptedOrgToken.invitation.role,
								},
						  }
						: undefined,
					// add the user to the organization if the token is valid
					memberOfOrgs: decryptedOrgToken
						? {
								connect: {
									id: decryptedOrgToken.organizationId,
								},
						  }
						: undefined,
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
					expiresAt: true,
					role: true,
					memberOfOrgs: {
						select: {
							id: true,
							orgName: true,
						},
					},
				},
			});

			// Send admin notification
			const globalOptions = await ctx.prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			if (globalOptions?.userRegistrationNotification) {
				const defaultTemplate = notificationTemplate();
				const template = globalOptions?.notificationTemplate ?? defaultTemplate;

				const adminUsers = await ctx.prisma.user.findMany({
					where: {
						role: "ADMIN",
					},
				});

				// create transporter
				const transporter = createTransporter(globalOptions);

				for (const adminEmail of adminUsers) {
					const renderedTemplate = await ejs.render(
						JSON.stringify(template),
						{
							toName: adminEmail.name,
							notificationMessage: `A new user with the name ${name} and email ${email} has just registered!`,
						},
						{ async: true },
					);

					const parsedTemplate = JSON.parse(renderedTemplate) as Record<string, string>;

					// define mail options
					const mailOptions = {
						from: globalOptions.smtpEmail,
						to: adminEmail.email,
						subject: parsedTemplate.subject,
						html: parsedTemplate.body,
					};
					// we dont want to show any error related to sending emails when user signs up
					try {
						await sendEmail(transporter, mailOptions);
					} catch (error) {
						console.error(error);
					}
				}
			}
			// add log if hasValidOrganizationToken is true
			if (decryptedOrgToken) {
				// Log the action
				await ctx.prisma.activityLog.create({
					data: {
						action: `User ${newUser.name} has registered with email ${newUser.email} and has been added to the organization ${decryptedOrgToken.organizationId} with the role ${decryptedOrgToken?.invitation.role}!`,
						performedById: decryptedOrgToken?.invitation?.invitedById,
						organizationId: decryptedOrgToken?.organizationId,
					},
				});

				// delete the organization token
				await ctx.prisma.invitation.delete({
					where: {
						token: ztnetOrganizationToken,
					},
				});
			}
			return {
				user: newUser,
			};
		}),
	me: protectedProcedure.query(async ({ ctx }) => {
		// add type that extend the user type with urlFromEnv
		const user = (await ctx.prisma.user.findFirst({
			where: {
				id: ctx.session.user.id,
			},
			include: {
				options: true,
				memberOfOrgs: true,
				UserDevice: true,
			},
		})) as User & {
			options?: UserOptions & {
				urlFromEnv?: boolean;
				secretFromEnv?: boolean;
				localControllerUrlPlaceholder?: string;
			};
			memberOfOrgs?: {
				id: string;
				ownerId: string;
				orgName: string;
				description: string | null;
				isActive: boolean;
			}[];
			UserDevice?: UserDevice[];
		};
		user.options.localControllerUrlPlaceholder = isRunningInDocker()
			? "http://zerotier:9993"
			: "http://127.0.0.1:9993";

		// Set secret environment status
		user.options.urlFromEnv = !!process.env.ZT_ADDR;
		user.options.secretFromEnv = !!process.env.ZT_SECRET;
		return user;
	}),
	update: protectedProcedure
		.input(
			z.object({
				email: z
					.string()
					.email()
					.transform((val) => val.trim())
					.optional(),
				password: z.string().optional(),
				newPassword: passwordSchema("New Password does not meet the requirements!")
					.transform((val) => val.trim())
					.optional(),
				repeatNewPassword: passwordSchema(
					"Repeat NewPassword does not meet the requirements!",
				)
					.transform((val) => val.trim())
					.optional(),
				name: z.string().nonempty().max(40).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.prisma.user.findFirst({
				where: {
					id: ctx.session.user.id,
				},
				include: {
					accounts: true,
				},
			});

			// validate
			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found!",
				});
			}

			if (input.newPassword || input.repeatNewPassword || input.password) {
				// Check if user is OAuth user (no existing password)
				const isOAuthUser = user.accounts && !user.hash;

				// For setting new password, all fields are required
				if (
					!input.newPassword ||
					!input.repeatNewPassword ||
					(!input.password && !isOAuthUser)
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Please fill all required fields!",
					});
				}

				if (!mediumPassword.test(input.newPassword))
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Password does not meet the requirements!",
						// optional: pass the original error to retain stack trace
						// cause: theError,
					});

				// check if old password is correct
				if (!isOAuthUser && !bcrypt.compareSync(input.password, user.hash)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Old password is incorrect!",
						// optional: pass the original error to retain stack trace
						// cause: theError,
					});
				}
				// make sure both new passwords are the same
				if (input.newPassword !== input.repeatNewPassword) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Passwords do not match!",
						// optional: pass the original error to retain stack trace
						// cause: theError,
					});
				}
			}

			// update user with new values
			await ctx.prisma.user.update({
				where: {
					id: user.id,
				},
				data: {
					email: input.email || user.email,
					name: input.name || user.name,
					hash: input.newPassword ? bcrypt.hashSync(input.newPassword, 10) : user.hash,
				},
			});
		}),
	validateResetPasswordToken: publicProcedure
		.input(
			z.object({
				token: z.string({ required_error: "Token is required!" }),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { token } = input;
			if (!token) return { error: ErrorCode.InvalidToken };
			try {
				const secret = generateInstanceSecret(PASSWORD_RESET_SECRET);
				const decoded = jwt.verify(token, secret) as { id: string; email: string };

				// add rate limit
				try {
					await limiter.check(ctx.res, GENERAL_REQUEST_LIMIT, "PASSWORD_RESET_LINK");
				} catch {
					throw new TRPCError({
						code: "TOO_MANY_REQUESTS",
						message: "Rate limit exceeded",
					});
				}

				const user = await ctx.prisma.user.findFirst({
					where: {
						id: decoded.id,
						email: decoded.email,
					},
				});

				if (!user) return { error: ErrorCode.InvalidToken };

				return { email: user.email };
			} catch (_error) {
				return { error: ErrorCode.InvalidToken };
			}
		}),
	passwordResetLink: publicProcedure
		.input(
			z.object({
				email: z
					.string({ required_error: "Email is required!" })
					.email()
					.transform((val) => val.trim()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { email } = input;
			try {
				await limiter.check(ctx.res, SHORT_REQUEST_LIMIT, "PASSWORD_RESET_LINK");
			} catch {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded, please try again later",
				});
			}
			if (!email) throwError("Email is required!");

			const user = await ctx.prisma.user.findFirst({
				where: {
					email: email.toLowerCase(),
				},
			});

			if (!user) return "Mail sent if email exist!";

			const secret = generateInstanceSecret(PASSWORD_RESET_SECRET);
			const validationToken = jwt.sign(
				{
					id: user.id,
					email: user.email,
				},
				secret,
				{
					expiresIn: "15m",
				},
			);

			const forgotLink = `${process.env.NEXTAUTH_URL}/auth/forgotPassword/reset?token=${validationToken}`;
			const globalOptions = await ctx.prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			const defaultTemplate = forgotPasswordTemplate();
			const template = globalOptions?.forgotPasswordTemplate ?? defaultTemplate;

			const renderedTemplate = await ejs.render(
				JSON.stringify(template),
				{
					toEmail: email,
					forgotLink,
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

	changePasswordFromJwt: publicProcedure
		.input(
			z.object({
				token: z.string({ required_error: "Token is required!" }),
				password: passwordSchema("password does not meet the requirements!"),
				newPassword: passwordSchema("password does not meet the requirements!"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { token, password, newPassword } = input;
			try {
				await limiter.check(ctx.res, SHORT_REQUEST_LIMIT, "PASSWORD_RESET_LINK");
			} catch {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded, please try again later",
				});
			}

			if (!token) throwError("token is required!");

			if (password !== newPassword) throwError("Passwords does not match!");

			try {
				interface IJwt {
					id: string;
					token: string;
				}
				const { id } = jwt.decode(token) as IJwt;

				if (!id) throwError("This link is not valid!");

				const user = await ctx.prisma.user.findFirst({
					where: {
						id,
					},
				});

				if (!user) throwError("Something went wrong!");
				const secret = generateInstanceSecret(PASSWORD_RESET_SECRET);
				jwt.verify(token, secret);

				// hash password
				return await ctx.prisma.user.update({
					where: {
						id,
					},
					data: {
						hash: bcrypt.hashSync(password, 10),
					},
				});
			} catch (error) {
				console.error(error);
				throwError("token is not valid, please try again!");
			}
		}),
	/**
	 * Update the specified NetworkMemberNotation instance.
	 *
	 * This protectedProcedure takes an input of object type with properties: notationId, nodeid,
	 * useAsTableBackground, and showMarkerInTable. It updates the fields showMarkerInTable and
	 * useAsTableBackground in the NetworkMemberNotation model for the specified notationId and nodeid.
	 *
	 * @input An object with properties:
	 * - notationId: a number representing the unique ID of the notation
	 * - nodeid: a number representing the ID of the node to which the notation is linked
	 * - useAsTableBackground: an optional boolean that determines whether the notation is used as a background in the table
	 * - showMarkerInTable: an optional boolean that determines whether to show a marker in the table for the notation
	 * @returns A Promise that resolves with the updated NetworkMemberNotation instance.
	 */
	updateUserOptions: protectedProcedure
		.input(
			z.object({
				useNotationColorAsBg: z.boolean().optional(),
				showNotationMarkerInTableRow: z.boolean().optional(),
				deAuthorizeWarning: z.boolean().optional(),
				addMemberIdAsName: z.boolean().optional(),
				renameNodeGlobally: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.user.update({
				where: { id: ctx.session.user.id },
				data: {
					options: {
						upsert: {
							create: input,
							update: input,
						},
					},
				},
			});
		}),
	setZtApi: protectedProcedure
		.input(
			z.object({
				ztCentralApiKey: z.string().optional(),
				ztCentralApiUrl: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// we use upsert in case the user has no options yet
			const updated = await ctx.prisma.user.update({
				where: {
					id: ctx.session.user.id,
				},
				data: {
					options: {
						upsert: {
							create: {
								ztCentralApiKey: input.ztCentralApiKey,
								ztCentralApiUrl: input.ztCentralApiUrl,
							},
							update: {
								ztCentralApiKey: input.ztCentralApiKey,
								ztCentralApiUrl: input.ztCentralApiUrl,
							},
						},
					},
				},
				include: {
					options: true,
				},
			});

			if (updated.options?.ztCentralApiKey) {
				try {
					await ztController.ping_api({ ctx });
					return { status: "success" };
				} catch (error) {
					throw new TRPCError({
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
						message: error.message,
						code: "FORBIDDEN",
					});
				}
			}

			return updated;
		}),
	setLocalZt: protectedProcedure
		.input(
			z.object({
				localControllerUrl: z.string().optional(),
				localControllerSecret: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input?.localControllerUrl && process.env.ZT_ADDR) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Remove the ZT_ADDR environment variable to use this feature!",
				});
			}

			const defaultLocalZtUrl = isRunningInDocker()
				? "http://zerotier:9993"
				: "http://127.0.0.1:9993";

			// we use upsert in case the user has no options yet
			const updated = await ctx.prisma.user.update({
				where: {
					id: ctx.session.user.id,
				},
				data: {
					options: {
						upsert: {
							create: {
								localControllerUrl: input.localControllerUrl || defaultLocalZtUrl,
								localControllerSecret: input.localControllerSecret,
							},
							update: {
								localControllerUrl: input.localControllerUrl || defaultLocalZtUrl,
								localControllerSecret: input.localControllerSecret,
							},
						},
					},
				},
				include: {
					options: true,
				},
			});

			return updated;
		}),
	getApiToken: protectedProcedure.query(async ({ ctx }) => {
		const tokens = await ctx.prisma.aPIToken.findMany({
			where: {
				userId: ctx.session.user.id,
			},
			orderBy: {
				createdAt: "asc",
			},
		});

		// if expiresAt is < now, set isActive to false. use for of loop to avoid async issues
		for (const token of tokens) {
			if (token.expiresAt) {
				await ctx.prisma.aPIToken.update({
					where: {
						id: token.id,
					},
					data: {
						isActive: token.expiresAt > new Date(),
					},
				});
			}
		}
		return tokens;
	}),
	addApiToken: protectedProcedure
		.input(
			z.object({
				name: z.string().min(3).max(50),
				daysToExpire: z.string(),
				apiAuthorizationType: z.array(z.enum(["PERSONAL", "ORGANIZATION"])),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				// generate daysToExpire date. If "never" is selected or an empty string, the token will never expire.
				const daysToExpire = parseInt(input.daysToExpire);
				let expiresAt: Date | null = new Date();
				if (!Number.isNaN(daysToExpire) && daysToExpire > 0) {
					expiresAt.setDate(expiresAt.getDate() + daysToExpire);
				} else {
					expiresAt = null; // Token never expires
				}

				// token factory
				const tokenContent = JSON.stringify({
					userId: ctx.session.user.id,
					apiAuthorizationType: input.apiAuthorizationType,
				});

				// hash token
				const tokenHash = encrypt(tokenContent, generateInstanceSecret(API_TOKEN_SECRET));

				// store token in database with tokenHash
				const token = await ctx.prisma.aPIToken.create({
					data: {
						token: tokenHash,
						name: input.name,
						apiAuthorizationType: input.apiAuthorizationType,
						userId: ctx.session.user.id,
						expiresAt,
					},
				});

				// Add the database token ID to the token hash for reference
				const tokenId = token.id.toString(); // Just in case the token id is not a string ( old db structure )
				const tokenWithIdContent = JSON.stringify({
					...JSON.parse(tokenContent),
					tokenId,
				});

				// hash token with token id
				const tokenWithIdHash = encrypt(
					tokenWithIdContent,
					generateInstanceSecret(API_TOKEN_SECRET),
				);

				// Update the token in the database with the new hash that includes the tokenId
				const updatedToken = await ctx.prisma.aPIToken.update({
					where: { id: token.id },
					data: { token: tokenWithIdHash },
				});

				return updatedToken;
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}
		}),

	deleteApiToken: protectedProcedure
		.input(
			z.object({
				id: z.union([z.string(), z.number()]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.aPIToken.delete({
				where: {
					id: input.id.toString(),
					userId: ctx.session.user.id,
				},
			});
		}),
	deleteUserDevice: protectedProcedure
		.input(
			z.object({
				deviceId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.userDevice.delete({
				where: {
					deviceId: input.deviceId,
				},
			});

			return input.deviceId;
		}),
});
