-- better-auth's user schema requires an `updatedAt` column, and its Prisma
-- adapter sets it on every user create. The original better-auth migration
-- added `updatedAt` to Account and Session but missed User, which broke user
-- creation via the OAuth flow (e.g. Azure AD/Entra ID). Add it here, matching
-- the sibling tables. Existing rows default to the current timestamp.
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
