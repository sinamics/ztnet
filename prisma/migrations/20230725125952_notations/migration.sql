-- CreateTable
CREATE TABLE "Notation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "useTableBackground" BOOLEAN DEFAULT false,
    "description" TEXT,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_time" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "network_id" TEXT NOT NULL,
    "icon" TEXT,
    "order_index" INTEGER,
    "visibility" TEXT,

    CONSTRAINT "Notation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkMemberNotation" (
    "notationId" INTEGER NOT NULL,
    "nodeId" INTEGER NOT NULL,

    CONSTRAINT "NetworkMemberNotation_pkey" PRIMARY KEY ("notationId","nodeId")
);

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_notationId_fkey" FOREIGN KEY ("notationId") REFERENCES "Notation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberNotation" ADD CONSTRAINT "NetworkMemberNotation_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "network_members"("nodeid") ON DELETE RESTRICT ON UPDATE CASCADE;
