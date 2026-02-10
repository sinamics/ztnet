/*
  Warnings:

  - The primary key for the `APIToken` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "APIToken" DROP CONSTRAINT "APIToken_pkey",
ADD COLUMN     "apiAuthorizationType" JSONB NOT NULL DEFAULT '["PERSONAL"]',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "APIToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "APIToken_id_seq";
