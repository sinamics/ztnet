import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { compare, hash } from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "~/server/db";
import {
	decrypt,
	generateInstanceSecret,
	TOTP_MFA_TOKEN_SECRET,
} from "~/utils/encryption";
import { parseUA, DEVICE_SALT_COOKIE_NAME, createDeviceCookie } from "~/utils/devices";
import { sendMailWithTemplate } from "~/utils/mail";
import { MailTemplateKey } from "~/utils/enums";
import { parse } from "cookie";
import { randomBytes } from "crypto";

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 1 * 60 * 1000; // 1 minute

function buildGenericOAuthPlugin() {
	if (!process.env.OAUTH_ID || !process.env.OAUTH_SECRET) {
		return [];
	}

	return [
		genericOAuth({
			config: [
				{
					providerId: "oauth",
					clientId: process.env.OAUTH_ID,
					clientSecret: process.env.OAUTH_SECRET,
					discoveryUrl: process.env.OAUTH_WELLKNOWN || undefined,
					authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL || undefined,
					tokenUrl: process.env.OAUTH_ACCESS_TOKEN_URL || undefined,
					userinfoUrl: process.env.OAUTH_USER_INFO || undefined,
					scopes: (process.env.OAUTH_SCOPE || "openid profile email").split(" "),
					mapProfileToUser: (profile) => ({
						name:
							profile.name ||
							profile.login ||
							profile.username ||
							profile.email?.split("@")[0] ||
							"OAuth User",
						email: profile.email,
						image: profile.picture || profile.avatar_url || profile.image_url,
					}),
				},
			],
		}),
	];
}

// ── Before hook: runs before sign-in to enforce cooldown, expiration, TOTP ──
const beforeHook = createAuthMiddleware(async (ctx) => {
	if (ctx.path !== "/sign-in/email") return;

	const email = ctx.body?.email;
	if (!email) return;

	const user = await prisma.user.findFirst({
		where: { email },
		include: { userGroup: true },
	});

	if (!user) return; // let better-auth handle "user not found"

	// 1. Cooldown check
	if (user.lastFailedLoginAttempt && user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
		const timeSinceLastFailed = Date.now() - user.lastFailedLoginAttempt.getTime();
		if (timeSinceLastFailed < COOLDOWN_PERIOD) {
			throw new APIError("TOO_MANY_REQUESTS", {
				message: "Too many failed attempts. Please try again later.",
			});
		}
	}

	// 2. Account active/expiry checks
	if (!user.isActive) {
		throw new APIError("FORBIDDEN", { message: "account-expired" });
	}
	if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
		throw new APIError("FORBIDDEN", { message: "account-expired" });
	}
	if (
		user.role !== "ADMIN" &&
		user.userGroup?.expiresAt &&
		new Date(user.userGroup.expiresAt) < new Date()
	) {
		throw new APIError("FORBIDDEN", { message: "account-expired" });
	}

	// 3. Ensure credential Account record exists (migration from next-auth)
	const existingAccount = await prisma.account.findFirst({
		where: { userId: user.id, providerId: "credential" },
	});
	if (!existingAccount && user.hash) {
		await prisma.account.create({
			data: {
				userId: user.id,
				accountId: user.id,
				providerId: "credential",
				password: user.hash,
			},
		});
	}

	// 4. TOTP 2FA check
	if (user.twoFactorEnabled) {
		const totpCode = ctx.headers?.get("x-totp-code");

		if (!totpCode) {
			throw new APIError("FORBIDDEN", { message: "second-factor-required" });
		}

		if (!user.twoFactorSecret) {
			console.error(
				`Two factor is enabled for user ${user.email} but they have no secret`,
			);
			throw new APIError("INTERNAL_SERVER_ERROR", {
				message: "Internal server error",
			});
		}

		if (!process.env.NEXTAUTH_SECRET) {
			console.error("Missing encryption key; cannot proceed with two factor login.");
			throw new APIError("INTERNAL_SERVER_ERROR", {
				message: "Internal server error",
			});
		}

		const secret = decrypt<string>(
			user.twoFactorSecret,
			generateInstanceSecret(TOTP_MFA_TOKEN_SECRET),
		);

		if (secret.length !== 32) {
			console.error(
				`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`,
			);
			throw new APIError("INTERNAL_SERVER_ERROR", {
				message: "Internal server error",
			});
		}

		const isValidToken = authenticator.check(totpCode, secret);
		if (!isValidToken) {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					failedLoginAttempts: { increment: 1 },
					lastFailedLoginAttempt: new Date(),
				},
			});
			throw new APIError("UNAUTHORIZED", { message: "incorrect-two-factor-code" });
		}
	}
});

// ── After hook: runs after sign-in for device tracking, login tracking ──
const afterHook = createAuthMiddleware(async (ctx) => {
	if (!ctx.path.startsWith("/sign-in")) return;

	const newSession = ctx.context?.newSession;
	if (!newSession) return;

	const userId = newSession.user.id;

	// 1. Reset failed login attempts + update lastLogin
	await prisma.user.update({
		where: { id: userId },
		data: {
			failedLoginAttempts: 0,
			lastFailedLoginAttempt: null,
			lastLogin: new Date(),
			firstTime: false,
		},
	});

	// 2. Device tracking
	const userAgent =
		ctx.headers?.get("x-user-agent") || ctx.headers?.get("user-agent") || "";
	if (!userAgent) return;

	const cookieHeader = ctx.headers?.get("cookie") || "";
	const cookies = parse(cookieHeader);
	let deviceId = cookies[DEVICE_SALT_COOKIE_NAME];

	if (!deviceId) {
		deviceId = randomBytes(16).toString("hex");
		// Set cookie via the response context if available
		try {
			if (ctx.context?.responseHeaders) {
				const cookieValue = `${DEVICE_SALT_COOKIE_NAME}=${deviceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
				ctx.context.responseHeaders.append("set-cookie", cookieValue);
			}
		} catch (_e) {
			// Cookie setting may not be available in all contexts
		}
	}

	const ipAddress = getIpFromHeaders(ctx.headers);
	const deviceInfo = {
		...parseUA(userAgent),
		userAgent,
		deviceId,
		ipAddress,
		userId,
		lastActive: new Date(),
	};

	// Upsert device info
	const existingDevice = await prisma.userDevice.findUnique({
		where: { deviceId },
		select: { ipAddress: true },
	});

	await prisma.userDevice.upsert({
		where: { deviceId },
		update: {
			lastActive: new Date(),
			ipAddress,
			isActive: true,
		},
		create: deviceInfo,
	});

	// Send device notification email
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true, id: true, firstTime: true },
	});

	try {
		if (user && !user.firstTime) {
			const templateKey = !existingDevice
				? MailTemplateKey.NewDeviceNotification
				: existingDevice.ipAddress !== ipAddress
					? MailTemplateKey.DeviceIpChangeNotification
					: null;

			if (templateKey) {
				await sendMailWithTemplate(templateKey, {
					to: user.email,
					userId: user.id,
					templateData: {
						toEmail: user.email,
						accessTime: new Date().toISOString(),
						ipAddress,
						browserInfo: userAgent,
						accountPageUrl: `${process.env.NEXTAUTH_URL}/user-settings/?tab=account`,
					},
				});
			}
		}
	} catch (_e) {
		console.error(
			"Failed to send email notification for new device, check your mail settings.",
		);
	}
});

function getIpFromHeaders(headers: Headers | null): string {
	if (!headers) return "Unknown";
	const forwardedFor = headers.get("x-forwarded-for");
	const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "Unknown";
	return ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)?.[1] || ip;
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),

	// Backward compat: use existing NEXTAUTH_SECRET and NEXTAUTH_URL env vars
	secret: process.env.NEXTAUTH_SECRET,
	baseURL: process.env.NEXTAUTH_URL,

	session: {
		expiresIn:
			Number.parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE, 10) || 30 * 24 * 60 * 60,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minute cache
		},
	},

	emailAndPassword: {
		enabled: true,
		password: {
			hash: async (password: string) => {
				return hash(password, 10);
			},
			verify: async ({ hash: storedHash, password }) => {
				return compare(password, storedHash);
			},
		},
	},

	user: {
		additionalFields: {
			lastLogin: { type: "date", required: false },
			lastseen: { type: "date", required: false },
			online: { type: "boolean", required: false, defaultValue: false },
			role: { type: "string", defaultValue: "USER", required: false },
			hash: { type: "string", required: false },
			tempPassword: { type: "string", required: false },
			firstTime: { type: "boolean", required: false, defaultValue: true },
			twoFactorEnabled: { type: "boolean", required: false, defaultValue: false },
			twoFactorSecret: { type: "string", required: false },
			failedLoginAttempts: { type: "number", required: false, defaultValue: 0 },
			requestChangePassword: {
				type: "boolean",
				required: false,
				defaultValue: false,
			},
			userGroupId: { type: "number", required: false },
			expiresAt: { type: "date", required: false },
			isActive: { type: "boolean", required: false, defaultValue: true },
		},
	},

	account: {
		accountLinking: {
			enabled:
				(process.env.OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING ?? "true").toLowerCase() !==
				"false",
		},
	},

	plugins: [...buildGenericOAuthPlugin()],

	hooks: {
		before: beforeHook,
		after: afterHook,
	},

	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const userCount = await prisma.user.count();
					const defaultUserGroup = await prisma.userGroup.findFirst({
						where: { isDefault: true },
					});

					return {
						data: {
							...user,
							role: userCount === 0 ? "ADMIN" : "USER",
							lastLogin: new Date(),
							firstTime: true,
							isActive: true,
							userGroupId: defaultUserGroup?.id ?? undefined,
						},
					};
				},
			},
		},
	},
});

export type Auth = typeof auth;
