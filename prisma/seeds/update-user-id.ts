import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

export async function updateUserId() {
	// Fetch all users from the database
	const users = await prisma.user.findMany();

	if (users.length > 0) {
		// Check if the first user's id is an integer
		if (typeof users[0].id === "number") {
			for (const user of users) {
				// Generate a new cuid
				const newId = createId();

				// Update the user's id in the database
				await prisma.user.update({
					where: { id: user.id },
					data: { id: newId },
				});
			}
			// rome-ignore lint/nursery/noConsoleLog: <explanation>
			console.log("Updating User IDs complete!");
		} else {
		}
	}
}
