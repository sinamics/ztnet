/*
  Warnings:

  - Added the required column `ipAssignments` to the `network` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "network" ADD COLUMN     "autoAssignIp" BOOLEAN DEFAULT true,
ADD COLUMN     "ipAssignments" TEXT NOT NULL;
