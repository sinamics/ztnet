/*
  Warnings:

  - You are about to drop the column `routes` on the `network` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "network" DROP COLUMN "routes";

-- CreateTable
CREATE TABLE "Routes" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "via" TEXT,
    "networkId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Routes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Routes" ADD CONSTRAINT "Routes_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "network"("nwid") ON DELETE CASCADE ON UPDATE CASCADE;
