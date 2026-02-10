import { updateUserId } from "./seeds/update-user-id";
import { seedUserOptions } from "./seeds/user-option.seed";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	await seedUserOptions();
	await updateUserId();
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
