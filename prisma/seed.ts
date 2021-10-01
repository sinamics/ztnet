import { settings } from './settings-seeds';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  for (let setting of settings) {
    await prisma.settings.create({
      data: setting,
    });
  }
}

main()
  .catch((e) => {
    console.log(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

  // npx prisma db seed --preview-feature --schema=./prisma/schema.prisma