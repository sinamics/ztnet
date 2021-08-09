-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "userid" SERIAL NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "role" "Role" NOT NULL DEFAULT E'USER',
    "licenseKey" TEXT DEFAULT E'',
    "email" TEXT NOT NULL,
    "hash" TEXT,
    "tempPassword" TEXT,
    "lastlogin" TEXT,
    "firstTime" BOOLEAN NOT NULL DEFAULT true,
    "licenseStatus" TEXT DEFAULT E'',
    "orderStatus" TEXT DEFAULT E'',
    "expirationDate" TEXT NOT NULL DEFAULT E'',
    "orderId" INTEGER NOT NULL DEFAULT 0,
    "max_instance_number" TEXT NOT NULL DEFAULT E'',
    "product_id" INTEGER DEFAULT 0,

    PRIMARY KEY ("userid")
);

-- CreateTable
CREATE TABLE "network" (
    "nwid" TEXT NOT NULL,
    "nwname" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,

    PRIMARY KEY ("nwid")
);

-- CreateTable
CREATE TABLE "network_members" (
    "nodeid" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "nwid" TEXT NOT NULL,
    "lastseen" TIMESTAMP(3),
    "online" BOOLEAN DEFAULT false,
    "deleted" BOOLEAN DEFAULT false,
    "name" TEXT,
    "ip" TEXT[],
    "activeBridge" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT DEFAULT E'',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "capabilities" TEXT,
    "creationTime" TIMESTAMP(3),
    "identity" TEXT,
    "lastAuthorizedTime" INTEGER,
    "lastDeauthorizedTime" INTEGER,
    "objtype" TEXT,
    "revision" INTEGER,
    "tags" TEXT,
    "vRev" INTEGER,
    "ipAssignments" TEXT,
    "noAutoAssignIps" BOOLEAN DEFAULT false,

    PRIMARY KEY ("nodeid")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "enableRegistration" BOOLEAN NOT NULL DEFAULT true,
    "firstUserRegistration" BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users.email_unique" ON "users"("email");

-- AddForeignKey
ALTER TABLE "network" ADD FOREIGN KEY ("authorId") REFERENCES "users"("userid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_members" ADD FOREIGN KEY ("nwid") REFERENCES "network"("nwid") ON DELETE CASCADE ON UPDATE CASCADE;
