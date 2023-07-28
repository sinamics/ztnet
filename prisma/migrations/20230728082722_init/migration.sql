-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "showNotationMarkerInTableRow" BOOLEAN DEFAULT false,
ADD COLUMN     "useNotationColorAsBg" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "Notation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
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
    "nodeid" INTEGER NOT NULL,

    CONSTRAINT "NetworkMemberNotation_pkey" PRIMARY KEY ("notationId","nodeid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notation_name_nwid_key" ON "Notation"("name", "nwid");

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_notationId_fkey" FOREIGN KEY ("notationId") REFERENCES "Notation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_nodeid_fkey" FOREIGN KEY ("nodeid") REFERENCES "network_members"("nodeid") ON DELETE RESTRICT ON UPDATE CASCADE;
