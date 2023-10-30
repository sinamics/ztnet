import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

export async function updateUserId() {
	const users = await prisma.user.findMany({
		include: {
			network: true,
			options: true,
		},
	});

	for (const user of users) {
		if (Number.isInteger(Number(user.id.trim()))) {
			const newId = createId();

			// Create a new user record with new ID
			// Create new user
			const { options, network, ...otherUserFields } = user;
			await prisma.user.create({
				data: {
					...otherUserFields,
					id: newId,
				},
			});

			// Transfer networks to the new user
			for (const net of network) {
				await prisma.network.update({
					where: { nwid: net.nwid },
					data: { authorId: newId },
				});
			}

			// Transfer UserOptions to the new user
			if (options) {
				await prisma.userOptions.create({
					data: { ...options, userId: newId },
				});
			}

			// Delete the old user record
			await prisma.user.delete({
				where: { id: user.id },
			});
		}
	}
	// rome-ignore lint/nursery/noConsoleLog: <explanation>
	console.log("Seeding:: Updating user ID complete!");
}
