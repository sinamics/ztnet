/*
  Warnings:

  - You are about to drop the column `nwname` on the `network` table. All the data in the column will be lost.
  - Added the required column `name` to the `network` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "ztCentralApiKey" TEXT DEFAULT '',
ADD COLUMN     "ztCentralApiUrl" TEXT DEFAULT 'https://api.zerotier.com/api',
ALTER COLUMN "showNotationMarkerInTableRow" SET DEFAULT true;

-- AlterTable
ALTER TABLE "network" DROP COLUMN "nwname",
ADD COLUMN     "name" TEXT NOT NULL;
