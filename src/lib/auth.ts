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
import { parseUA, DEVICE_SALT_COOKIE_NAME } from "~/utils/devices";
import { sendMailWithTemplate } from "~/utils/mail";
import { MailTemplateKey } from "~/utils/enums";
import { parse } from "cookie";
import { randomBytes } from "crypto";

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 1 * 60 * 1000; // 1 minute

// Backwards-compat callback URL.
// Pre-better-auth ztnet docs (https://ztnet.network/authentication/oauth) instructed
// users to register `${NEXTAUTH_URL}/api/auth/callback/oauth` with their IdP.
// better-auth's genericOAuth plugin defaults to `${baseURL}/oauth2/callback/:providerId`,
// which would break every existing install. We pin redirectURI to the legacy path here
// and rely on a Next.js rewrite (see next.config.mjs) to forward the legacy path into
// better-auth's actual callback handler.
export const OAUTH_PROVIDER_ID = "oauth";
export function legacyOAuthRedirectURI(): string | undefined {
	const base = process.env.NEXTAUTH_URL;
	if (!base) return undefined;
	return `${base.replace(/\/$/, "")}/api/auth/callback/${OAUTH_PROVIDER_ID}`;
}

export function isOAuthExclusiveLogin(): boolean {
	return process.env.OAUTH_EXCLUSIVE_LOGIN?.toLowerCase() === "true";
}

export function isOAuthAllowNewUsers(): boolean {
	// Default true (matches pre-migration behavior in publicRouter/settingsRouter).
	return process.env.OAUTH_ALLOW_NEW_USERS?.toLowerCase() !== "false";
}

function buildGenericOAuthPlugin() {
	if (!process.env.OAUTH_ID || !process.env.OAUTH_SECRET) {
		return [];
	}

	return [
		genericOAuth({
			config: [
				{
					providerId: OAUTH_PROVIDER_ID,
					clientId: process.env.OAUTH_ID,
					clientSecret: process.env.OAUTH_SECRET,
					discoveryUrl: process.env.OAUTH_WELLKNOWN || undefined,
					authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL || undefined,
					tokenUrl: process.env.OAUTH_ACCESS_TOKEN_URL || undefined,
					userInfoUrl: process.env.OAUTH_USER_INFO || undefined,
					scopes: (process.env.OAUTH_SCOPE || "openid profile email").split(" "),
					// PKCE was enforced under next-auth (`checks: ["state","pkce"]`).
					// better-auth's genericOAuth plugin defaults pkce to false, so we re-enable it.
					pkce: true,
					// Pin redirect URI to the legacy path so existing IdP registrations keep working.
					// See `legacyOAuthRedirectURI` and the rewrite in `next.config.mjs`.
					redirectURI: legacyOAuthRedirectURI(),
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

// ── Before hook: cooldown + 2FA enforcement for credential sign-in only ──
// Active/expiry checks live in `databaseHooks.session.create.before` so they cover
// OAuth sign-in too. Password verification is delegated to better-auth (Account.password).
const beforeHook = createAuthMiddleware(async (ctx) => {
	// Defense-in-depth: if OAUTH_EXCLUSIVE_LOGIN is on, refuse credential endpoints
	// even if the UI fails to hide them.
	if (
		isOAuthExclusiveLogin() &&
		(ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email")
	) {
		throw new APIError("FORBIDDEN", {
			message: "Email/password authentication is disabled. Please use OAuth.",
		});
	}

	if (ctx.path !== "/sign-in/email") return;

	const email = (ctx.body as Record<string, unknown>)?.email as string;
	if (!email) return;

	const user = await prisma.user.findFirst({
		where: { email },
	});

	if (!user) return; // let better-auth handle "user not found"

	// 1. Cooldown check (custom, not provided by better-auth)
	if (user.lastFailedLoginAttempt && user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
		const timeSinceLastFailed = Date.now() - user.lastFailedLoginAttempt.getTime();
		if (timeSinceLastFailed < COOLDOWN_PERIOD) {
			throw new APIError("TOO_MANY_REQUESTS", {
				message: "Too many failed attempts. Please try again later.",
			});
		}
	}

	// 2. Track failed-password attempts (better-auth checks the password but doesn't
	// persist failure counters). We compare against User.hash here purely to detect
	// the failure so we can increment the counter; better-auth re-verifies against
	// Account.password and is the authoritative check.
	const password = (ctx.body as Record<string, unknown>)?.password as string;
	if (password && user.hash) {
		const isValid = await compare(password, user.hash);
		if (!isValid) {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					failedLoginAttempts: { increment: 1 },
					lastFailedLoginAttempt: new Date(),
				},
			});
			// Don't throw — let better-auth produce its standard "invalid credentials"
			// error so the response shape is identical to a missing-account error.
			return;
		}
	}

	// 3. Ensure credential Account record exists (one-time backfill for users
	// migrated from next-auth before the Prisma migration ran). The migration
	// SQL also does this; this is a safety net for race conditions.
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

function getIpFromHeaders(headers: Headers | null | undefined): string {
	if (!headers) return "Unknown";
	const forwardedFor = headers.get("x-forwarded-for");
	const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "Unknown";
	return ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)?.[1] || ip;
}

// Runs for every newly-created session (email sign-in AND OAuth callback). This is
// where we enforce the active/expiry rules and persist device + login bookkeeping.
// Exported for unit testing — the production wiring is via `databaseHooks.session.create.before`.
export async function onSessionCreated(
	userId: string,
	// biome-ignore lint/suspicious/noExplicitAny: better-auth's GenericEndpointContext
	ctx: any | null,
): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { userGroup: true },
	});
	if (!user) {
		throw new APIError("UNAUTHORIZED", { message: "user-not-found" });
	}

	// Active/expiry enforcement (covers credential AND OAuth sign-ins).
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

	// Reset failed login attempts + update lastLogin
	await prisma.user.update({
		where: { id: userId },
		data: {
			failedLoginAttempts: 0,
			lastFailedLoginAttempt: null,
			lastLogin: new Date(),
			firstTime: false,
		},
	});

	// Device tracking
	const headers: Headers | null = ctx?.headers ?? null;
	const userAgent = headers?.get("x-user-agent") || headers?.get("user-agent") || "";
	if (!userAgent) return;

	const cookieHeader = headers?.get("cookie") || "";
	const cookies = parse(cookieHeader);
	let deviceId = cookies[DEVICE_SALT_COOKIE_NAME];
	let isNewCookie = false;

	if (!deviceId) {
		deviceId = randomBytes(16).toString("hex");
		isNewCookie = true;
	}

	const ipAddress = getIpFromHeaders(headers);
	const deviceInfo = {
		...parseUA(userAgent),
		userAgent,
		deviceId,
		ipAddress,
		userId,
		lastActive: new Date(),
	};

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

	// Persist the device cookie via better-auth's cookie helper. Setting it AFTER
	// the upsert ensures a row exists before the cookie is observed by /api/auth/me.
	if (isNewCookie && typeof ctx?.setCookie === "function") {
		ctx.setCookie(DEVICE_SALT_COOKIE_NAME, deviceId, {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 365, // 1 year
		});
	}

	// New-device / IP-change email notification (only after the user's first login;
	// `firstTime=true` is reset above before this query, so re-read).
	const refreshed = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true, id: true },
	});

	try {
		if (refreshed && !user.firstTime) {
			const templateKey = !existingDevice
				? MailTemplateKey.NewDeviceNotification
				: existingDevice.ipAddress !== ipAddress
					? MailTemplateKey.DeviceIpChangeNotification
					: null;

			if (templateKey) {
				await sendMailWithTemplate(templateKey, {
					to: refreshed.email,
					userId: refreshed.id,
					templateData: {
						toEmail: refreshed.email,
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
}

// User-creation hook. Enforces OAUTH_ALLOW_NEW_USERS / global registration toggle
// when the create is triggered by the OAuth callback flow, and stamps the standard
// ztnet defaults onto the new row (role, group, firstTime, etc.).
// Exported for unit testing.
export async function onUserCreateBefore(
	user: Record<string, unknown>,
	// biome-ignore lint/suspicious/noExplicitAny: better-auth's GenericEndpointContext
	ctx: any | null,
): Promise<{ data: Record<string, unknown> }> {
	const path: string | undefined = ctx?.path;
	const isOAuthFlow =
		typeof path === "string" &&
		(path.startsWith("/oauth2/callback/") || path === "/sign-in/oauth2");

	if (isOAuthFlow) {
		// Honour OAUTH_ALLOW_NEW_USERS — block OAuth account creation when off.
		if (!isOAuthAllowNewUsers()) {
			throw new APIError("FORBIDDEN", {
				message: "registration_disabled",
			});
		}

		// Outside of exclusive-OAuth mode, also respect the global registration toggle.
		if (!isOAuthExclusiveLogin()) {
			const settings = await prisma.globalOptions.findFirst({
				where: { id: 1 },
				select: { enableRegistration: true },
			});
			if (!settings?.enableRegistration) {
				throw new APIError("FORBIDDEN", {
					message: "registration_disabled",
				});
			}
		}
	}

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
			// Disabled: better-auth's cookie cache returns the cached user object
			// (including `isActive`, `requestChangePassword`, `role`) without hitting
			// the DB until `maxAge` elapses. For ztnet we explicitly need an admin
			// disabling a user (or a cron job expiring an account) to take effect on
			// the user's NEXT request, not minutes later. The DB hit per request is
			// cheap and worth the consistency.
			enabled: false,
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
			trustedProviders: [OAUTH_PROVIDER_ID],
		},
	},

	plugins: [...buildGenericOAuthPlugin()],

	hooks: {
		before: beforeHook,
	},

	databaseHooks: {
		user: {
			create: {
				before: onUserCreateBefore,
			},
		},
		session: {
			create: {
				before: async (session, ctx) => {
					// Fires for every newly-created session (credential + OAuth).
					// Throws abort the session creation so the user is never logged in
					// when their account is disabled or expired.
					await onSessionCreated(session.userId as string, ctx);
				},
			},
		},
	},
});

export type Auth = typeof auth;
