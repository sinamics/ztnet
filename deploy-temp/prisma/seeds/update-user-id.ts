/*
Change user ID in database from int to 25char id
https://github.com/sinamics/ztnet/pull/191
*/

import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

export async function updateUserId() {
	const users = await prisma.user.findMany({
		include: {
			network: true,
			options: true,
			userGroup: true,
		},
	});

	for (const user of users) {
		if (Number.isInteger(Number(user.id.trim()))) {
			const newId = createId();

			// Create temporary unique email
			const newEmail = `${user.email}_temp`;

			// Create a new user record with new ID
			// Create new user
			const { options, network, userGroup, ...otherUserFields } = user;
			await prisma.user.create({
				data: {
					...otherUserFields,
					id: newId,
					email: newEmail,
				},
			});

			// Transfer networks to the new user
			for (const net of network) {
				await prisma.network.update({
					where: { nwid: net.nwid },
					data: { authorId: newId },
				});
			}

			// Transfer UserOptions to the new user, if they exist
			if (options) {
				// rome-ignore lint/correctness/noUnusedVariables: <explanation>
				const { id, userId, ...otherOptionsFields } = options; // Exclude id and userId
				await prisma.userOptions.create({
					data: { ...otherOptionsFields, userId: newId },
				});
			}
			// Transfer UserGroup to the new user, if it exists
			if (userGroup) {
				await prisma.user.update({
					where: { id: newId },
					data: { userGroupId: user.userGroupId },
				});
			}

			// Delete the old user record
			await prisma.user.delete({
				where: { id: user.id },
			});

			// Update back to original email
			await prisma.user.update({
				where: { id: newId },
				data: { email: user.email },
			});
		}
	}
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log("Seeding:: Updating user ID complete!");
}
