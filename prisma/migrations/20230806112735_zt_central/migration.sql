/*
  Warnings:

  - You are about to drop the column `lastseen` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the `network` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notation" DROP CONSTRAINT "Notation_nwid_fkey";

-- DropForeignKey
ALTER TABLE "network" DROP CONSTRAINT "network_authorId_fkey";

-- DropForeignKey
ALTER TABLE "network_members" DROP CONSTRAINT "network_members_nwid_fkey";

-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "ztCentralApiKey" TEXT DEFAULT '',
ADD COLUMN     "ztCentralApiUrl" TEXT DEFAULT 'https://api.zerotier.com/api',
ALTER COLUMN "showNotationMarkerInTableRow" SET DEFAULT true;

-- AlterTable
ALTER TABLE "network_members" DROP COLUMN "lastseen",
ADD COLUMN     "lastSeen" TIMESTAMP(3);

ALTER TABLE "network" RENAME TO "Network";

-- AddForeignKey
ALTER TABLE "network_members" ADD CONSTRAINT "network_members_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "Network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Network" ADD CONSTRAINT "Network_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "Network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;
