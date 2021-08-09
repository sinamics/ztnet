import { settings } from './settings-seeds';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.settings.findMany();
  if (row.length) throw 'Data row exists in settings';

  for (let setting of settings) {
    await prisma.settings.create({
      data: setting,
    });
  }
}

main()
  .catch((e) => {
    prisma.$disconnect();
    return console.log(e);
    // process.exit(1);
  })
  .finally(() => prisma.$disconnect());
