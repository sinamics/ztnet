/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerAccountId` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "provider" TEXT NOT NULL,
ADD COLUMN     "providerAccountId" TEXT NOT NULL,
ADD COLUMN     "refresh_expires_in" INTEGER;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
