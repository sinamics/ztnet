import { z } from "zod";
import {
	createTRPCRouter,
	publicProcedure,
	//   protectedProcedure,
} from "~/server/api/trpc";
import { throwError } from "~/server/helpers/errorHandler";
import jwt from "jsonwebtoken";
import { createTransporter, sendEmail, forgotPasswordTemplate } from "~/utils/mail";
import ejs from "ejs";
import { TOTP_MFA_TOKEN_SECRET, generateInstanceSecret } from "~/utils/encryption";
import { ErrorCode } from "~/utils/errorCode";
import rateLimit from "~/utils/rateLimit";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

// allow 15 requests per 10 minutes
const limiter = rateLimit({
	interval: 10 * 60 * 1000, // 600 seconds or 10 minutes
	uniqueTokenPerInterval: 1000,
});

const GENERAL_REQUEST_LIMIT = 5;

async function verifyRecoveryCode(
	providedCode: string,
	hashedCodes: string[],
): Promise<boolean> {
	for (const hashedCode of hashedCodes) {
		if (await bcrypt.compare(providedCode, hashedCode)) {
			return true;
		}
	}
	return false;
}

export const mfaAuthRouter = createTRPCRouter({
	mfaValidateToken: publicProcedure
		.input(
			z.object({
				token: z.string({ required_error: "Token is required!" }),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { token } = input;

			if (!token) return { error: ErrorCode.InvalidToken };
			let decoded: { id: string; email: string };

			try {
				const secret = generateInstanceSecret(TOTP_MFA_TOKEN_SECRET);
				decoded = jwt.verify(token, secret) as { id: string; email: string };
			} catch {
				return { error: ErrorCode.InvalidToken };
			}

			// add rate limit
			try {
				await limiter.check(ctx.res, GENERAL_REQUEST_LIMIT, "MFA_RESET_LINK");
			} catch {
				return { error: ErrorCode.TooManyRequests };
			}

			try {
				const user = await ctx.prisma.user.findFirst({
					where: {
						id: decoded.id,
						email: decoded.email,
					},
				});

				if (!user) return { error: ErrorCode.InvalidToken };

				// make sure user has MFA enabled
				if (!user.twoFactorEnabled) return { error: ErrorCode.InvalidToken };

				return { email: user.email };
			} catch (_error) {
				return { error: _error.message };
			}
		}),
	mfaResetLink: publicProcedure
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

			// add rate limit
			try {
				await limiter.check(ctx.res, GENERAL_REQUEST_LIMIT, "MFA_RESET_LINK");
			} catch {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded",
				});
			}

			if (!email) throwError("Email is required!");

			const user = await ctx.prisma.user.findFirst({
				where: {
					email: email.toLowerCase(),
				},
			});

			if (!user) return "Mail sent if email exist!";

			const secret = generateInstanceSecret(TOTP_MFA_TOKEN_SECRET);
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

			const forgotLink = `${process.env.NEXTAUTH_URL}/auth/mfaRecovery/reset?token=${validationToken}`;
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
	mfaResetValidation: publicProcedure
		.input(
			z.object({
				token: z.string({ required_error: "Token is required!" }),
				email: z.string({ required_error: "Email is required!" }),
				password: z.string({ required_error: "Password is required!" }),
				recoveryCode: z.string({ required_error: "Recovery code is required!" }),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { token, email, recoveryCode } = input;
			// add rate limit
			try {
				await limiter.check(ctx.res, GENERAL_REQUEST_LIMIT, "MFA_RESET_LINK");
			} catch {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded, please try again later",
				});
			}
			// Verify the token
			try {
				const secret = generateInstanceSecret(TOTP_MFA_TOKEN_SECRET);
				const decoded = jwt.verify(token, secret) as { id: string; email: string };

				if (decoded.email !== email) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Something went wrong, please try again",
					});
				}

				// Find the user
				const user = await ctx.prisma.user.findUnique({
					where: { id: decoded.id },
					select: {
						id: true,
						email: true,
						hash: true,
						twoFactorEnabled: true,
						twoFactorRecoveryCodes: true,
					},
				});

				if (!user || !user.twoFactorEnabled) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Something went wrong, please try again",
					});
				}

				// verify uesr password
				const isValidPassword = await bcrypt.compare(input.password, user.hash);
				if (!isValidPassword) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Something went wrong, please try again",
					});
				}

				// Verify the recovery code
				const isValidRecoveryCode = await verifyRecoveryCode(
					recoveryCode,
					user.twoFactorRecoveryCodes,
				);

				if (!isValidRecoveryCode) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Something went wrong, please try again",
					});
				}

				// Remove the used recovery code
				const updatedRecoveryCodes = user.twoFactorRecoveryCodes.filter(
					async (hashedCode) => !(await bcrypt.compare(recoveryCode, hashedCode)),
				);

				// Disable 2FA
				await ctx.prisma.user.update({
					where: { id: user.id },
					data: {
						twoFactorEnabled: false,
						twoFactorSecret: null,
						twoFactorRecoveryCodes: updatedRecoveryCodes,
					},
				});

				return {
					success: true,
					message: "2FA has been successfully disabled",
				};
			} catch (error) {
				if (error instanceof jwt.JsonWebTokenError) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid or expired token",
					});
				}
				throw error;
			}
		}),
	validateRecoveryToken: publicProcedure
		.input(
			z.object({
				token: z.string({ required_error: "Token is required!" }),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { token } = input;
			if (!token) throwError(ErrorCode.InvalidToken);

			// add rate limit
			try {
				await limiter.check(ctx.res, GENERAL_REQUEST_LIMIT, "MFA_RESET_LINK");
			} catch {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded",
				});
			}
			try {
				const secret = generateInstanceSecret(TOTP_MFA_TOKEN_SECRET);
				const decoded = jwt.verify(token, secret) as { id: string; email: string };

				const user = await ctx.prisma.user.findFirst({
					where: {
						id: decoded.id,
						email: decoded.email,
					},
				});

				if (!user) throwError(ErrorCode.InvalidToken);

				// make sure user has MFA enabled
				if (!user.twoFactorEnabled)
					throwError("Could not find MFA enabled for this user!");

				return { email: user.email };
			} catch (_error) {
				throwError(ErrorCode.InvalidToken);
			}
		}),
});
