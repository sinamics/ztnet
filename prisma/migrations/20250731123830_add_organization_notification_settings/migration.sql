-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN DEFAULT true,
ADD COLUMN     "networkCreatedNotification" BOOLEAN DEFAULT false,
ADD COLUMN     "networkDeletedNotification" BOOLEAN DEFAULT false,
ADD COLUMN     "nodeAddedNotification" BOOLEAN DEFAULT false,
ADD COLUMN     "nodeDeletedNotification" BOOLEAN DEFAULT false,
ADD COLUMN     "permissionChangedNotification" BOOLEAN DEFAULT false,
ADD COLUMN     "userAddedNotification" BOOLEAN DEFAULT false,
ADD COLUMN     "userRemovedNotification" BOOLEAN DEFAULT false;
