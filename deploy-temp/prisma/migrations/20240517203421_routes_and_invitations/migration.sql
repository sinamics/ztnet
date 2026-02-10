/*
  Warnings:

  - You are about to drop the column `email` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `invitedById` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `mailSentAt` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the `UserInvitation` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `invitationId` to the `OrganizationInvitation` table without a default value. This is not possible if the table is not empty.

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
ALTER TABLE "network" ADD COLUMN     "routes" JSONB;

-- DropTable
DROP TABLE "UserInvitation";

-- CreateTable
CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "secret" TEXT,
    "groupId" TEXT,
    "userGroupId" INTEGER,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "mailSentAt" TIMESTAMP(3),
    "timesCanUse" INTEGER NOT NULL DEFAULT 1,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL DEFAULT 'READ_ONLY',

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
