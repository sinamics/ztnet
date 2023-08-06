/*
  Warnings:

  - You are about to drop the `network` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `network_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NetworkMemberNotation" DROP CONSTRAINT "NetworkMemberNotation_nodeid_fkey";

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

-- DropTable
DROP TABLE "network";

-- DropTable
DROP TABLE "network_members";

-- CreateTable
CREATE TABLE "NetworkMembers" (
    "nodeid" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "nwid" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3),
    "online" BOOLEAN DEFAULT false,
    "conStatus" INTEGER DEFAULT 0,
    "deleted" BOOLEAN DEFAULT false,
    "name" TEXT,
    "activeBridge" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT DEFAULT '',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "creationTime" TIMESTAMP(3) NOT NULL,
    "identity" TEXT,
    "lastAuthorizedTime" INTEGER,
    "lastDeauthorizedTime" INTEGER,
    "objtype" TEXT,
    "revision" INTEGER,
    "tags" JSONB,
    "capabilities" JSONB,
    "vRev" INTEGER,
    "ipAssignments" TEXT[],
    "noAutoAssignIps" BOOLEAN DEFAULT false,

    CONSTRAINT "NetworkMembers_pkey" PRIMARY KEY ("nodeid")
);

-- CreateTable
CREATE TABLE "Network" (
    "nwid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creationTime" TIMESTAMP(3),
    "lastModifiedTime" TIMESTAMP(3),
    "flowRule" TEXT,
    "autoAssignIp" BOOLEAN DEFAULT true,
    "ipAssignments" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "tagsByName" JSONB,
    "capabilitiesByName" JSONB,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("nwid")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkMembers_id_nwid_key" ON "NetworkMembers"("id", "nwid");

-- AddForeignKey
ALTER TABLE "NetworkMembers" ADD CONSTRAINT "NetworkMembers_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "Network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Network" ADD CONSTRAINT "Network_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "Network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_nodeid_fkey" FOREIGN KEY ("nodeid") REFERENCES "NetworkMembers"("nodeid") ON DELETE RESTRICT ON UPDATE CASCADE;
