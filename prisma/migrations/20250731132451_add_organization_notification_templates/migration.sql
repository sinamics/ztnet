-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "networkCreatedTemplate" JSONB,
ADD COLUMN     "networkDeletedTemplate" JSONB,
ADD COLUMN     "nodeAddedTemplate" JSONB,
ADD COLUMN     "nodeDeletedTemplate" JSONB,
ADD COLUMN     "permissionChangedTemplate" JSONB,
ADD COLUMN     "userAddedTemplate" JSONB,
ADD COLUMN     "userRemovedTemplate" JSONB;
