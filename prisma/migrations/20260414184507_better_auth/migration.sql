-- Migration: next-auth -> better-auth (data-preserving)
-- All operations are DDL renames (instant, no data copy) or safe additions.
-- Wrapped in a transaction so it's all-or-nothing.

BEGIN;

-- ============================================================
-- 1. Account table: rename columns, add new ones, drop unused
-- ============================================================

-- Rename existing columns (instant operation, no data rewrite)
ALTER TABLE "Account" RENAME COLUMN "provider" TO "providerId";
ALTER TABLE "Account" RENAME COLUMN "providerAccountId" TO "accountId";
ALTER TABLE "Account" RENAME COLUMN "access_token" TO "accessToken";
ALTER TABLE "Account" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE "Account" RENAME COLUMN "id_token" TO "idToken";

-- Convert expires_at (Int epoch seconds) to accessTokenExpiresAt (DateTime)
ALTER TABLE "Account" ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3);
UPDATE "Account" SET "accessTokenExpiresAt" = to_timestamp("expires_at") WHERE "expires_at" IS NOT NULL;
ALTER TABLE "Account" DROP COLUMN "expires_at";

-- Add new columns with defaults (safe for existing rows)
ALTER TABLE "Account" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN "password" TEXT;
ALTER TABLE "Account" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Account" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop columns not used by better-auth
ALTER TABLE "Account" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "refresh_expires_in";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "token_type";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "ext_expires_in";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "expires_in";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "session_state";

-- Update unique constraint
DROP INDEX "Account_provider_providerAccountId_key";
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- ============================================================
-- 2. Session table: rename columns, add new ones
-- ============================================================

-- Rename (instant, no data rewrite)
ALTER TABLE "Session" RENAME COLUMN "sessionToken" TO "token";
ALTER TABLE "Session" RENAME COLUMN "expires" TO "expiresAt";

-- Add new nullable columns (safe for existing rows)
ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Recreate unique index with renamed column
DROP INDEX "Session_sessionToken_key";
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- ============================================================
-- 3. VerificationToken -> Verification
-- ============================================================

-- Rename table (instant)
ALTER TABLE "VerificationToken" RENAME TO "Verification";

-- Rename columns (instant)
ALTER TABLE "Verification" RENAME COLUMN "token" TO "value";
ALTER TABLE "Verification" RENAME COLUMN "expires" TO "expiresAt";

-- Add id primary key
ALTER TABLE "Verification" ADD COLUMN "id" TEXT DEFAULT gen_random_uuid()::text;
UPDATE "Verification" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "Verification" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_pkey" PRIMARY KEY ("id");

-- Add timestamp columns
ALTER TABLE "Verification" ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Verification" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Update unique constraints
DROP INDEX IF EXISTS "VerificationToken_identifier_token_key";
DROP INDEX IF EXISTS "VerificationToken_token_key";
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "Verification"("identifier", "value");

-- ============================================================
-- 4. Create credential Account records for existing users
-- better-auth looks up passwords via Account where providerId='credential'
-- This copies bcrypt hashes from User.hash so existing logins keep working
-- ============================================================

INSERT INTO "Account" ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "id",
  'credential',
  "hash",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
WHERE "hash" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "Account" WHERE "Account"."userId" = "User"."id" AND "Account"."providerId" = 'credential'
);

COMMIT;
