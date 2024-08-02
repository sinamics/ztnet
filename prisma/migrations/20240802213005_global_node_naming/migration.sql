-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "renameNodeGlobally" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "UserOptions" ADD COLUMN     "renameNodeGlobally" BOOLEAN DEFAULT true;
