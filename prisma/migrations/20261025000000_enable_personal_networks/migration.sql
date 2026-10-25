-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN "enablePersonalNetworks" BOOLEAN NOT NULL DEFAULT true;

-- Keep personal networks on for instances that already use them. An instance
-- without any personal network (only organization networks, or a fresh
-- install) starts with them off.
UPDATE "GlobalOptions"
SET "enablePersonalNetworks" = EXISTS (
    SELECT 1 FROM "network" WHERE "organizationId" IS NULL
);
