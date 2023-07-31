-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "ztCentralApiKey" TEXT DEFAULT '',
ADD COLUMN     "ztCentralApiUrl" TEXT DEFAULT 'https://api.zerotier.com/api',
ALTER COLUMN "showNotationMarkerInTableRow" SET DEFAULT true;
