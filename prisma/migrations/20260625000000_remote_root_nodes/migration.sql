-- CreateEnum
CREATE TYPE "RemoteRootStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'OFFLINE', 'ERROR');

-- CreateEnum
CREATE TYPE "RemoteRootEndpointSource" AS ENUM ('MANUAL_IP', 'DOMAIN');

-- CreateEnum
CREATE TYPE "RemoteRootCredentialAuthType" AS ENUM ('MANAGED_KEY');

-- CreateEnum
CREATE TYPE "RemoteRootTaskType" AS ENUM ('CHECK', 'INSTALL_ZEROTIER', 'UPGRADE_ZEROTIER', 'READ_CONFIG', 'GENERATE_PLANET_ENTRY', 'RESTART_ZEROTIER', 'CHANGE_PORT', 'SAVE_CONFIG', 'DISTRIBUTE_PLANET', 'RESTORE_OFFICIAL_PLANET');

-- CreateEnum
CREATE TYPE "RemoteRootTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "RemoteRootNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "sshPort" INTEGER NOT NULL DEFAULT 22,
    "sshUser" TEXT NOT NULL DEFAULT 'root',
    "status" "RemoteRootStatus" NOT NULL DEFAULT 'UNKNOWN',
    "zerotierVersion" TEXT,
    "zerotierInstalled" BOOLEAN NOT NULL DEFAULT false,
    "serviceStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "startupStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "sshStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "panelStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "sshLastError" TEXT,
    "panelLastError" TEXT,
    "identity" TEXT,
    "primaryPort" INTEGER NOT NULL DEFAULT 9993,
    "secondaryPort" INTEGER,
    "allowSecondaryPort" BOOLEAN,
    "portMappingEnabled" BOOLEAN,
    "interfacePrefixBlacklist" JSONB DEFAULT '[]',
    "bindAddresses" JSONB DEFAULT '[]',
    "allowManagementFrom" JSONB DEFAULT '[]',
    "defaultBondingPolicy" TEXT,
    "multithreaded" BOOLEAN,
    "linuxKernelMode" BOOLEAN,
    "identityMode" TEXT NOT NULL DEFAULT 'REMOTE',
    "endpointSource" "RemoteRootEndpointSource" NOT NULL DEFAULT 'MANUAL_IP',
    "domainName" TEXT,
    "selectedIp" TEXT,
    "selectedIps" JSONB DEFAULT '[]',
    "resolvedIps" JSONB DEFAULT '[]',
    "endpointCandidates" JSONB DEFAULT '[]',
    "remotePlanetHash" TEXT,
    "remoteOfficialPlanetHash" TEXT,
    "planetStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastReadAt" TIMESTAMP(3),
    "lastPlanetSyncAt" TIMESTAMP(3),
    "lastCheckAt" TIMESTAMP(3),
    "lastPanelCheckAt" TIMESTAMP(3),
    "lastError" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemoteRootNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteRootCredential" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "authType" "RemoteRootCredentialAuthType" NOT NULL DEFAULT 'MANAGED_KEY',
    "encryptedPrivateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemoteRootCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteRootTask" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "RemoteRootTaskType" NOT NULL,
    "status" "RemoteRootTaskStatus" NOT NULL DEFAULT 'PENDING',
    "logs" JSONB DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemoteRootTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemoteRootNode_enabled_idx" ON "RemoteRootNode"("enabled");

-- CreateIndex
CREATE INDEX "RemoteRootNode_status_idx" ON "RemoteRootNode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteRootCredential_nodeId_key" ON "RemoteRootCredential"("nodeId");

-- CreateIndex
CREATE INDEX "RemoteRootTask_nodeId_createdAt_idx" ON "RemoteRootTask"("nodeId", "createdAt");

-- CreateIndex
CREATE INDEX "RemoteRootTask_status_idx" ON "RemoteRootTask"("status");

-- AddForeignKey
ALTER TABLE "RemoteRootCredential" ADD CONSTRAINT "RemoteRootCredential_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "RemoteRootNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteRootTask" ADD CONSTRAINT "RemoteRootTask_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "RemoteRootNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "GlobalOptions"
    ADD COLUMN "planetDownloadAuthMode" TEXT NOT NULL DEFAULT 'PUBLIC';
