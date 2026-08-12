-- AlterTable
ALTER TABLE "network_members" ADD COLUMN     "controllerConfig" JSONB,
ADD COLUMN     "vMajor" INTEGER,
ADD COLUMN     "vMinor" INTEGER,
ADD COLUMN     "vProto" INTEGER,
ADD COLUMN     "vRev" INTEGER;
