-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "renameNodeGlobally" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "UserOptions" ADD COLUMN     "renameNodeGlobally" BOOLEAN DEFAULT false;
