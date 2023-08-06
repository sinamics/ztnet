/*
  Warnings:

  - You are about to drop the column `nwname` on the `network` table. All the data in the column will be lost.
  - You are about to drop the column `lastseen` on the `network_members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "ztCentralApiKey" TEXT DEFAULT '',
ADD COLUMN     "ztCentralApiUrl" TEXT DEFAULT 'https://api.zerotier.com/api',
ALTER COLUMN "showNotationMarkerInTableRow" SET DEFAULT true;

-- AlterTable
ALTER TABLE "network" DROP COLUMN "nwname",
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "network_members" DROP COLUMN "lastseen",
ADD COLUMN     "lastSeen" TIMESTAMP(3);
