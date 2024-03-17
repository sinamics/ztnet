/*
  Warnings:

  - The primary key for the `OrganizationInvitation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `invitedById` to the `OrganizationInvitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP CONSTRAINT "OrganizationInvitation_pkey",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invitedById" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'READ_ONLY',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "OrganizationInvitation_id_seq";
