-- Add a dedicated, rotatable planet download token. Used instead of a personal
-- API token when planet download protection is enabled, so it can be embedded
-- in the client installer for unattended installs.
ALTER TABLE "GlobalOptions" ADD COLUMN "planetDownloadToken" TEXT;
