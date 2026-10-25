-- CreateTable
CREATE TABLE "NetworkMemberNote" (
    "nodeid" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "NetworkMemberNote_pkey" PRIMARY KEY ("nodeid")
);

-- AddForeignKey
ALTER TABLE "NetworkMemberNote" ADD CONSTRAINT "NetworkMemberNote_nodeid_fkey" FOREIGN KEY ("nodeid") REFERENCES "network_members"("nodeid") ON DELETE CASCADE ON UPDATE CASCADE;
