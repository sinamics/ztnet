/*
  Warnings:

  - Added the required column `apiAuthorizationType` to the `APIToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "APIToken" ADD COLUMN     "apiAuthorizationType" JSONB NOT NULL;
