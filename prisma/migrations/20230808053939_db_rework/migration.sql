/*
  Warnings:

  - You are about to drop the column `ipAssignments` on the `network` table. All the data in the column will be lost.
  - You are about to drop the column `activeBridge` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `authorized` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `capabilities` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `conStatus` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `identity` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `ipAssignments` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `lastAuthorizedTime` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `lastDeauthorizedTime` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `noAutoAssignIps` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `objtype` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `revision` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `network_members` table. All the data in the column will be lost.
  - You are about to drop the column `vRev` on the `network_members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "network" DROP COLUMN "ipAssignments";

-- AlterTable
ALTER TABLE "network_members" DROP COLUMN "activeBridge",
DROP COLUMN "authorized",
DROP COLUMN "capabilities",
DROP COLUMN "conStatus",
DROP COLUMN "identity",
DROP COLUMN "ipAssignments",
DROP COLUMN "lastAuthorizedTime",
DROP COLUMN "lastDeauthorizedTime",
DROP COLUMN "noAutoAssignIps",
DROP COLUMN "objtype",
DROP COLUMN "revision",
DROP COLUMN "tags",
DROP COLUMN "vRev";
