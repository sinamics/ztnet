/*
  Warnings:

  - A unique constraint covering the columns `[id,nwid]` on the table `network_members` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "network_members_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "network_members_id_nwid_key" ON "network_members"("id", "nwid");
