/*
  Warnings:

  - You are about to drop the column `email` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `invitedById` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `mailSentAt` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `UserInvitation` table. All the data in the column will be lost.
  - Added the required column `invitationId` to the `OrganizationInvitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `UserInvitation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "OrganizationInvitation_token_key";

-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP COLUMN "email",
DROP COLUMN "expiresAt",
DROP COLUMN "invitedById",
DROP COLUMN "mailSentAt",
DROP COLUMN "role",
DROP COLUMN "token",
DROP COLUMN "updatedAt",
ADD COLUMN     "invitationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserInvitation" DROP COLUMN "createdBy",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "userGroupId" INTEGER;

-- AlterTable
ALTER TABLE "network" ADD COLUMN     "routes" JSONB;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "UserInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
