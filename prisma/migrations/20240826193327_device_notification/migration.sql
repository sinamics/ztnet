-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "deviceIpChangeNotificationTemplate" JSONB,
ADD COLUMN     "newDeviceNotificationTemplate" JSONB;

-- AlterTable
ALTER TABLE "UserOptions" ADD COLUMN     "deviceIpChangeNotification" BOOLEAN DEFAULT true,
ADD COLUMN     "newDeviceNotification" BOOLEAN DEFAULT true;
