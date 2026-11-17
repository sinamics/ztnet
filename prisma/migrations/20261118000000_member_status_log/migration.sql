-- CreateEnum
CREATE TYPE "MemberConnectionStatus" AS ENUM ('OFFLINE', 'DIRECT', 'RELAY');

-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN "memberStatusLogEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "memberStatusLogRetentionDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "memberStatusLogSampleInterval" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "MemberStatusEvent" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "fromStatus" "MemberConnectionStatus" NOT NULL,
    "toStatus" "MemberConnectionStatus" NOT NULL,
    "physicalAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberStatusState" (
    "address" TEXT NOT NULL,
    "status" "MemberConnectionStatus" NOT NULL,
    "physicalAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberStatusState_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE INDEX "MemberStatusEvent_address_createdAt_idx" ON "MemberStatusEvent"("address", "createdAt");

-- CreateIndex
CREATE INDEX "MemberStatusEvent_createdAt_idx" ON "MemberStatusEvent"("createdAt");
