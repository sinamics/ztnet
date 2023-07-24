-- AlterTable
ALTER TABLE "network" ADD COLUMN     "creationTime" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastModifiedTime" TIMESTAMP(3);
