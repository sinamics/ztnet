/*
  Warnings:

  - You are about to drop the column `expirationDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `licenseKey` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `licenseStatus` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `orderStatus` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "expirationDate",
DROP COLUMN "licenseKey",
DROP COLUMN "licenseStatus",
DROP COLUMN "orderId",
DROP COLUMN "orderStatus",
DROP COLUMN "product_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
