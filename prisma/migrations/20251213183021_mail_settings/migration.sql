-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "smtpEncryption" TEXT NOT NULL DEFAULT 'STARTTLS',
ADD COLUMN     "smtpUseAuthentication" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "smtpFromName" SET DEFAULT 'ZTNET';
