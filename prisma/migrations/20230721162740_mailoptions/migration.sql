-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "smtpEmail" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpIgnoreTLS" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpPassword" TEXT,
ADD COLUMN     "smtpPort" TEXT NOT NULL DEFAULT '587',
ADD COLUMN     "smtpRequireTLS" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpUseSSL" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpUsername" TEXT;
