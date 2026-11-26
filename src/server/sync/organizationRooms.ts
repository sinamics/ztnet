import type { PrismaClient } from "@prisma/client";
import type { Server, Socket } from "socket.io";
import { organizationRoom, userRoom } from "~/utils/socketChannels";

/**
 * Join a freshly connected socket to its user room and to the room of every
 * organization the user is a member of. Membership is read from the database,
 * never taken from the client.
 */
export const joinOrganizationRooms = async (
	socket: Pick<Socket, "join">,
	userId: string,
	db: Pick<PrismaClient, "userOrganizationRole">,
) => {
	await socket.join(userRoom(userId));
	const memberships = await db.userOrganizationRole.findMany({
		where: { userId },
		select: { organizationId: true },
	});
	for (const { organizationId } of memberships) {
		await socket.join(organizationRoom(organizationId));
	}
};

/** Take every socket of a user out of an organization's room. */
export const leaveOrganizationRoom = (
	io: Pick<Server, "in"> | null | undefined,
	userId: string,
	organizationId: string,
) => {
	io?.in(userRoom(userId)).socketsLeave(organizationRoom(organizationId));
};
