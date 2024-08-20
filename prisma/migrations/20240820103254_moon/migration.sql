-- AlterTable
ALTER TABLE "Planet" ADD COLUMN     "isMoon" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RootNodes" ADD COLUMN     "isMoon" BOOLEAN NOT NULL DEFAULT false;
