import type { PrismaClient } from "@prisma/client";
import type { Server } from "socket.io";
import { userRoom } from "~/utils/socketChannels";

/**
 * Send an organization chat message to the sockets of the organization's
 * current members only. The members are read from the database for every
 * message, so someone who was removed, or whose account was deleted, stops
 * receiving messages at once, and a new member receives them without
 * reconnecting. The event name stays the organization id, which is what the
 * client listens on.
 */
export const emitOrganizationMessage = async (
	io: Pick<Server, "to"> | null | undefined,
	db: Pick<PrismaClient, "userOrganizationRole">,
	organizationId: string,
	message: unknown,
) => {
	if (!io) return;
	const members = await db.userOrganizationRole.findMany({
		where: { organizationId },
		select: { userId: true },
	});
	if (members.length === 0) return;
	io.to(members.map(({ userId }) => userRoom(userId))).emit(organizationId, message);
};
