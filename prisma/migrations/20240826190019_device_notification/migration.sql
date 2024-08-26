-- AlterTable
ALTER TABLE "UserOptions" ADD COLUMN     "deviceIpChangeNotification" BOOLEAN DEFAULT true,
ADD COLUMN     "newDeviceNotification" BOOLEAN DEFAULT true;
