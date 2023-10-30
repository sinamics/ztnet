import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedUserOptions() {
	// Fetch all users from the database
	const users = await prisma.user.findMany();

	for (const user of users) {
		// Check if UserOptions exist for each user
		const userOptionExists = await prisma.userOptions.findUnique({
			where: { userId: user.id },
		});
		// If UserOptions do not exist for a user, create them
		if (!userOptionExists) {
			await prisma.userOptions.create({
				data: {
					userId: user.id,
					useNotationColorAsBg: false,
					showNotationMarkerInTableRow: true,
					ztCentralApiKey: "",
					ztCentralApiUrl: "https://api.zerotier.com/api/v1",
					localControllerUrl: "http://zerotier:9993",
					localControllerSecret: "",
				},
			});
		}
	}
	// rome-ignore lint/nursery/noConsoleLog: <explanation>
	console.log("Seeding:: User Options complete!");
}
