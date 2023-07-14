-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "GlobalOptions" (
    "id" SERIAL NOT NULL,
    "enableRegistration" BOOLEAN NOT NULL DEFAULT true,
    "firstUserRegistration" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GlobalOptions_pkey" PRIMARY KEY ("id")
);

-- Insert default row
INSERT INTO "GlobalOptions" ("enableRegistration", "firstUserRegistration")
VALUES (true, true);


-- CreateTable
CREATE TABLE "network_members" (
    "nodeid" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "nwid" TEXT NOT NULL,
    "lastseen" TIMESTAMP(3),
    "online" BOOLEAN DEFAULT false,
    "conStatus" INTEGER DEFAULT 0,
    "deleted" BOOLEAN DEFAULT false,
    "name" TEXT,
    "activeBridge" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT DEFAULT '',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "creationTime" TIMESTAMP(3) NOT NULL,
    "identity" TEXT,
    "lastAuthorizedTime" INTEGER,
    "lastDeauthorizedTime" INTEGER,
    "objtype" TEXT,
    "revision" INTEGER,
    "tags" TEXT[],
    "vRev" INTEGER,
    "ipAssignments" TEXT[],
    "noAutoAssignIps" BOOLEAN DEFAULT false,

    CONSTRAINT "network_members_pkey" PRIMARY KEY ("nodeid")
);

-- CreateTable
CREATE TABLE "network" (
    "nwid" TEXT NOT NULL,
    "nwname" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "network_pkey" PRIMARY KEY ("nwid")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3) NOT NULL,
    "lastseen" TIMESTAMP(3),
    "expirationDate" TEXT NOT NULL DEFAULT '',
    "online" BOOLEAN DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "image" TEXT,
    "hash" TEXT NOT NULL,
    "licenseStatus" TEXT,
    "orderStatus" TEXT,
    "orderId" INTEGER NOT NULL DEFAULT 0,
    "product_id" INTEGER DEFAULT 0,
    "licenseKey" TEXT DEFAULT '',
    "tempPassword" TEXT,
    "firstTime" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "network_members_id_key" ON "network_members"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "network_members" ADD CONSTRAINT "network_members_nwid_fkey" FOREIGN KEY ("nwid") REFERENCES "network"("nwid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network" ADD CONSTRAINT "network_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
