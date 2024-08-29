import { IncomingMessage } from "http";
import { prisma } from "../db";

export function sessionCallback(
	_req: IncomingMessage & { cookies: Partial<{ [key: string]: string }> },
) {
	return async function authSession({ session, token }) {
		if (!token.id) return null;
		if (!token.deviceId) {
			return { ...session, user: null };
		}
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

		return {
			...session,
			user: {
				...token,
			},
		};
	};
}
