/*
  Warnings:

  - Added the required column `userAgent` to the `UserDevice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "deviceIpChangeNotificationTemplate" JSONB,
ADD COLUMN     "newDeviceNotificationTemplate" JSONB;

-- AlterTable
ALTER TABLE "UserDevice" ADD COLUMN     "userAgent" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserOptions" ADD COLUMN     "apiRateLimitNotification" BOOLEAN DEFAULT true,
ADD COLUMN     "deviceIpChangeNotification" BOOLEAN DEFAULT true,
ADD COLUMN     "failedLoginNotification" BOOLEAN DEFAULT true,
ADD COLUMN     "newDeviceNotification" BOOLEAN DEFAULT true;
