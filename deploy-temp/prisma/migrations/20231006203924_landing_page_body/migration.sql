-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "welcomeMessageBody" TEXT,
ADD COLUMN     "welcomeMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "welcomeMessageTitle" TEXT;
