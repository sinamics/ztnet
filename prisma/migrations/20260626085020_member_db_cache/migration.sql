-- AlterTable
ALTER TABLE "network_members" ADD COLUMN     "activeBridge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ipAssignments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "noAutoAssignIps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revision" INTEGER;
