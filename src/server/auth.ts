import { type GetServerSidePropsContext } from "next";
import { getServerSession, type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "~/server/db";
import { compare } from "bcryptjs";
import { type User as IUser } from "@prisma/client";
import { isRunningInDocker } from "~/utils/docker";
import { ErrorCode } from "~/utils/errorCode";
import {
	decrypt,
	generateInstanceSecret,
	TOTP_MFA_TOKEN_SECRET,
} from "~/utils/encryption";
import { authenticator } from "otplib";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 1 * 60 * 1000; // 1 minute in milliseconds

declare module "next-auth" {
	interface Session extends DefaultSession {
		user: IUser;
		error: string;
		update: {
			name?: string;
			email?: string;
		};
	}

	interface User {
		id?: string;
		name: string;
		role: string;
		// ...other properties
		// role: UserRole;
		//   email: string;
		//   password: string;
	}
}

const prismaAdapter = PrismaAdapter(prisma);

// fix for oauth
// https://github.com/nextauthjs/next-auth/issues/3823
const MyAdapter = {
	...prismaAdapter,
	linkAccount: (account) => {
		// biome-ignore lint/correctness/noUnusedVariables: <explanation>
		const { refresh_expires_in, "not-before-policy": _, ...rest } = account;
		return prismaAdapter.linkAccount(rest);
	},
};

function buildAuthorizationConfig(url: string, defaultScope: string) {
	const hasScopeInUrl = url?.includes("?scope=") || url?.includes("&scope=");

	if (hasScopeInUrl) {
		// If scope is already in the URL, return the URL as is
		return url;
	}
	if (url) {
		return {
			url: url,
			params: {
				scope: process.env.OAUTH_SCOPE || defaultScope,
			},
		};
	}
	// If scope is not in the URL, add it as a separate params object
	return {
		params: {
			scope: process.env.OAUTH_SCOPE || defaultScope,
		},
	};
}

const genericOAuthAuthorization = buildAuthorizationConfig(
	process.env.OAUTH_AUTHORIZATION_URL,
	"openid profile email",
);

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
	adapter: MyAdapter,
	providers: [
		{
			id: "oauth",
			name: "Oauth",
			type: "oauth",
			allowDangerousEmailAccountLinking:
				Boolean(process.env.OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING) || true,
			clientId: process.env.OAUTH_ID,
			clientSecret: process.env.OAUTH_SECRET,
			wellKnown: process.env.OAUTH_WELLKNOWN,
			checks: ["state", "pkce"], // Include 'pkce' if required for your custom OAuth
			authorization: genericOAuthAuthorization,
			token: process.env.OAUTH_ACCESS_TOKEN_URL,
			userinfo: process.env.OAUTH_USER_INFO,
			profile(profile) {
				return Promise.resolve({
					id: profile.sub || profile.id.toString(), // Handle ID based on provider
					name: profile.name || profile.login || profile.username,
					email: profile.email,
					image: profile.picture || profile.avatar_url || profile.image_url,
					lastLogin: new Date().toISOString(),
					role: "USER",
				});
			},
		},
		CredentialsProvider({
			// The name to display on the sign in form (e.g. "Sign in with...")
			name: "Credentials",
			// `credentials` is used to generate a form on the sign in page.
			// You can specify which fields should be submitted, by adding keys to the `credentials` object.
			// e.g. domain, username, password, 2FA token, etc.
			// You can pass any HTML attribute to the <input> tag through the object.
			credentials: {
				email: {
					label: "Email",
					type: "text",
					placeholder: "mail@example.com",
				},
				password: { label: "Password", type: "password" },
				totpCode: {
					label: "Two-factor Code",
					type: "input",
					placeholder: "Code from authenticator app",
				},
			},
			async authorize(_credentials, _req) {
				// if (!_credentials?.email) return;
				// Add logic here to look up the user from the credentials supplied
				// const user = { id: "1", name: "J Smith", email: "jsmith@example.com" };
				const user = await prisma.user.findFirst({
					where: {
						email: _credentials?.email,
					},
				});

				if (!user || !user.email || !user.hash)
					//  return a nextauth error message
					throw new Error("User does not exist!");

				// Check if the user is in a cooldown period
				if (
					user.lastFailedLoginAttempt &&
					user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS
				) {
					const timeSinceLastFailedAttempt =
						Date.now() - user.lastFailedLoginAttempt.getTime();
					if (timeSinceLastFailedAttempt < COOLDOWN_PERIOD) {
						const remainingCooldown = Math.ceil(
							(COOLDOWN_PERIOD - timeSinceLastFailedAttempt) / 60000,
						);
						throw new Error(
							`Too many failed attempts. Please try again in ${remainingCooldown} minutes.`,
						);
					}
				}
				const isValid = await compare(_credentials?.password ?? "", user.hash);

				if (!isValid) {
					// Increment failed login attempts
					await prisma.user.update({
						where: { id: user.id },
						data: {
							failedLoginAttempts: {
								increment: 1,
							},
							lastFailedLoginAttempt: new Date(),
						},
					});
					throw new Error("email or password is wrong!");
				}

				if (!user.isActive) {
					throw new Error(
						"Account has been disabled. Contact an administrator to reactivate your account.",
					);
				}

				if (user.twoFactorEnabled) {
					if (!_credentials.totpCode) {
						throw new Error(ErrorCode.SecondFactorRequired);
					}

					if (!user.twoFactorSecret) {
						console.error(
							`Two factor is enabled for user ${user.email} but they have no secret`,
						);
						throw new Error(ErrorCode.InternalServerError);
					}

					if (!process.env.NEXTAUTH_SECRET) {
						console.error(
							`"Missing encryption key; cannot proceed with two factor login."`,
						);
						throw new Error(ErrorCode.InternalServerError);
					}

					const secret = decrypt<string>(
						user.twoFactorSecret,
						generateInstanceSecret(TOTP_MFA_TOKEN_SECRET),
					);
					if (secret.length !== 32) {
						console.error(
							`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`,
						);
						throw new Error(ErrorCode.InternalServerError);
					}

					const isValidToken = authenticator.check(_credentials.totpCode, secret);
					if (!isValidToken) {
						await prisma.user.update({
							where: { id: user.id },
							data: {
								failedLoginAttempts: {
									increment: 1,
								},
								lastFailedLoginAttempt: new Date(),
							},
						});
						throw new Error(ErrorCode.IncorrectTwoFactorCode);
					}
				}

				// Reset failed login attempts on successful login
				await prisma.user.update({
					where: { id: user.id },
					data: {
						failedLoginAttempts: 0,
						lastFailedLoginAttempt: null,
					},
				});
				return {
					...user,
					hash: null,
				};
			},
		}),

		/**
		 * ...add more providers here.
		 *
		 * Most other providers require a bit more work than the Discord provider. For example, the
		 * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
		 * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
		 *
		 * @see https://next-auth.js.org/providers/github
		 */
	],
	session: {
		strategy: "jwt",
		maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE, 10) || 30 * 24 * 60 * 60, // 30 Days
	},
	callbacks: {
		/**
		 * @see https://next-auth.js.org/configuration/callbacks#sign-in-callback
		 */
		async signIn({ user, account }) {
			if (account.provider === "credentials") {
				// Check if the user already exists
				const existingUser = await prisma.user.findUnique({
					where: {
						email: user.email,
					},
				});

				if (existingUser) {
					// User exists, update last login or other fields as necessary
					await prisma.user.update({
						where: {
							id: existingUser.id,
						},
						data: {
							lastLogin: new Date().toISOString(),
						},
					});
				}
				return true;
			}
			if (account.provider === "oauth") {
				// Check if the user already exists
				const existingUser = await prisma.user.findUnique({
					where: {
						email: user.email,
					},
				});

				if (existingUser) {
					// User exists, update last login or other fields as necessary
					await prisma.user.update({
						where: {
							id: existingUser.id,
						},
						data: {
							lastLogin: new Date().toISOString(),
						},
					});
				} else {
					// User does not exist, create new user
					const userCount = await prisma.user.count();
					const defaultUserGroup = await prisma.userGroup.findFirst({
						where: {
							isDefault: true,
						},
					});

					await prisma.user.create({
						data: {
							name: user.name,
							email: user.email,
							lastLogin: new Date().toISOString(),
							role: userCount === 0 ? "ADMIN" : "USER",
							image: user.image,
							userGroupId: defaultUserGroup?.id,
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
						},
					});
				}
				return true;
			}
		},
		async jwt({ token, user, trigger, account, session }) {
			if (trigger === "update") {
				if (session.update) {
					const user = await prisma.user.findFirst({
						where: {
							id: token.id,
						},
						select: {
							id: true,
							name: true,
							email: true,
							role: true,
							emailVerified: true,
							lastLogin: true,
							lastseen: true,
						},
					});

					// Number(user.id.trim()) checks if the user session has the old int as the User id
					if (Number.isInteger(Number(token.id))) {
						return undefined;
					}

					// session update => https://github.com/nextauthjs/next-auth/discussions/3941
					// verify that name has at least one character
					if (typeof session.update.name === "string") {
						// TODO throwing error will logout user.
						// if (session.update.name.length < 1) {
						//   throw new Error("Name must be at least one character long.");
						// }
						token.name = session.update.name;
					}

					// verify that email is valid
					if (typeof session.update.email === "string") {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call

						token.email = session.update.email;
					}

					// update user with new values
					await prisma.user.update({
						where: {
							id: token.id as string,
						},
						data: {
							email: session.update.email || user.email,
							name: session.update.name || user.name,
						},
					});
				}
				return token;
			}

			// Persist the OAuth access_token to the token right after signin
			// Handle OAuth login
			if (account && user) {
				// Persist OAuth token to the JWT
				token.accessToken = account.accessToken;

				// Update token with user information
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;
				token.role = user.role; // Add other relevant properties as needed
			}
			if (user) {
				// token.id = user.id;
				// token.name = user.name;
				// token.role = user.role;
				token = { ...user };
			}
			return token;
		},
		session: async ({ session, token }) => {
			if (!token.id) return null;

			// Check the user exists in the database
			const user = await prisma.user.findFirst({
				where: { id: token.id },
			});

			// Number(user.id.trim()) checks if the user session has the old int as the User id
			if (!user || !user.isActive || Number.isInteger(Number(token.id))) {
				// If the user does not exist, set user to null
				return { ...session, user: null };
			}

			// update users lastseen in the database
			await prisma.user.update({
				where: {
					id: user.id,
				},
				data: {
					lastseen: new Date(),
				},
			});
			session.user = { ...token } as IUser;
			return session;
		},
		redirect({ url, baseUrl }) {
			// Allows relative callback URLs
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
	},
	pages: {
		signIn: "/auth/login",
		error: "/auth/error",
	},
	debug: false,
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
	req: GetServerSidePropsContext["req"];
	res: GetServerSidePropsContext["res"];
}) => {
	return getServerSession(ctx.req, ctx.res, authOptions);
};
