import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

export async function updateUserId() {
	const users = await prisma.user.findMany();

	for (const user of users) {
		if (Number.isInteger(user.id)) {
			const newId = createId();
			// Steps to update primary key
			// 1. Insert a new row with a new id
			// 2. Delete the old row
			// 3. Note that related tables will also need their foreign keys updated

			// For the sake of this example, we are not dealing with foreign keys
			await prisma.user.create({
				data: { ...user, id: newId },
			});

			await prisma.user.delete({
				where: { id: user.id },
			});
		}
	}
}
