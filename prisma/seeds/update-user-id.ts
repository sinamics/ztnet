import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

export async function updateUserId() {
	const users = await prisma.user.findMany();

	for (const user of users) {
		if (Number.isInteger(Number(user.id))) {
			const newId = createId();
			// Create temporary unique email
			const newEmail = `${user.email}_temp`;

			// Create new user with new id and temporary email
			await prisma.user.create({
				data: { ...user, id: newId, email: newEmail },
			});

			// Delete original user
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
}
