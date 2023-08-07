/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { type GetServerSidePropsContext } from "next";
import {
	getServerSession,
	type NextAuthOptions,
	type DefaultSession,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "~/server/db";
import { compare } from "bcryptjs";
import { type User as IUser } from "@prisma/client";
// import { type User } from ".prisma/client";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: IUser;
		update: {
			name?: string;
			email?: string;
		};
	}

	interface User {
		id?: number;
		name: string;
		role: string;
		// ...other properties
		// role: UserRole;
		//   email: string;
		//   password: string;
	}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma),
	providers: [
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

				const isValid = await compare(_credentials?.password ?? "", user.hash);

				if (!isValid) {
					throw new Error("email or password is wrong!");
				}

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
		maxAge: 30 * 24 * 60 * 60, // 30 Days
	},
	callbacks: {
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
						// if (!session.update.email.includes("@")) {
						//   throw new Error("Email must be a valid email address.");
						// }
						token.email = session.update.email;
					}

					// update user with new values
					await prisma.user.update({
						where: {
							id: token.id as number,
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
			if (account) {
				token.accessToken = account.accessToken;
			}
			if (user) {
				// token.id = user.id;
				// token.name = user.name;
				// token.role = user.role;
				token = { ...user };
			}
			return token;
		},
		session: ({ session, token }) => {
			if (!token.id) return null;

			session.user = { ...token } as IUser;
			return session;
		},
		redirect({ url, baseUrl }) {
			// Allows relative callback URLs
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			// Allows callback URLs on the same origin
			else if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
	},
	pages: {
		signIn: "/",
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
