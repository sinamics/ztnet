/*
  Warnings:

  - The `tags` column on the `network_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "network" ADD COLUMN     "capabilitiesByName" JSONB,
ADD COLUMN     "tagsByName" JSONB;

-- AlterTable
ALTER TABLE "network_members" ADD COLUMN     "capabilities" JSONB,
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB;
