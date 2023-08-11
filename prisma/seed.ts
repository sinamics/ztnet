import { seedUserOptions } from "./user-option.seed";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	await seedUserOptions();
	// rome-ignore lint/nursery/noConsoleLog: <explanation>
	console.log("Seeding User Options complete!");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
