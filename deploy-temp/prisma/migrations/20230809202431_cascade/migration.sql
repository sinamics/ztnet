-- DropForeignKey
ALTER TABLE "NetworkMemberNotation" DROP CONSTRAINT "NetworkMemberNotation_nodeid_fkey";

-- DropForeignKey
ALTER TABLE "Notation" DROP CONSTRAINT "Notation_nwid_fkey";

-- DropForeignKey
ALTER TABLE "network_members" DROP CONSTRAINT "network_members_nwid_fkey";

-- AddForeignKey
ALTER TABLE "network_members" ADD CONSTRAINT "network_members_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "network"("nwid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "network"("nwid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_nodeid_fkey" FOREIGN KEY ("nodeid") REFERENCES "network_members"("nodeid") ON DELETE CASCADE ON UPDATE CASCADE;
