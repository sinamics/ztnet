-- CreateTable
CREATE TABLE "Notation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "useTableBackground" BOOLEAN DEFAULT false,
    "description" TEXT,
    "creationTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nwid" TEXT NOT NULL,
    "icon" TEXT,
    "orderIndex" INTEGER,
    "visibility" TEXT,

    CONSTRAINT "Notation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkMemberNotation" (
    "notationId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,

    CONSTRAINT "NetworkMemberNotation_pkey" PRIMARY KEY ("notationId","memberId")
);

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_notationId_fkey" FOREIGN KEY ("notationId") REFERENCES "Notation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "network_members"("nodeid") ON DELETE RESTRICT ON UPDATE CASCADE;
