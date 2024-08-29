import { prisma } from "../db";

export function jwtCallback() {
	return async function jwt({ token, user, trigger, account, session }) {
		if (trigger === "update") {
			if (session.update) {
				const updateObject: Record<string, string | Date> = {};

				const user = await prisma.user.findFirst({
					where: {
						id: token.id,
					},
					select: {
						email: true,
						emailVerified: true,
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
					updateObject.name = session.update.name;
				}

				// verify that email is valid
				if (typeof session.update.email === "string") {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call

					token.email = session.update.email;
					updateObject.email = session.update.email;
					updateObject.emailVerified =
						user?.email === session.update.email ? user.emailVerified : null;
				}

				// update user with new values
				await prisma.user.update({
					where: {
						id: token.id as string,
					},
					data: updateObject,
				});
			}
			return token;
		}

		if (user) {
			const { id, name, email, role } = user;
			Object.assign(token, { id, name, email, role });
			if (account?.provider === "oauth") {
				// set the device from sign in callback
				token.deviceId = account.deviceId;

				token.accessToken = account.accessToken;
			} else if (account?.provider === "credentials") {
				token.deviceId = user.deviceId;
			}
		}
		// Check if the device still exists and is valid
		if (token.id && token.deviceId && typeof token.deviceId === "string") {
			try {
				const userDevice = await prisma.userDevice.findUnique({
					where: {
						userId: token?.id,
						deviceId: token.deviceId,
					},
				});

				if (!userDevice) {
					// Device doesn't exist, invalidate the deviceId in the token
					token.deviceId = undefined;
					return token;
				}

				// Update lastActive field
				await prisma.userDevice.update({
					where: {
						userId: token?.id,
						deviceId: token.deviceId,
					},
					data: {
						lastActive: new Date(),
					},
				});
			} catch (error) {
				console.error("Error checking or updating user device:", error);
			}
		}
		return token;
	};
}
