-- Convert "User"."emailVerified" from next-auth's DateTime? to better-auth's
-- Boolean. better-auth writes a boolean to this column (on OIDC sign-up and on
-- account-link updates); the old timestamp column rejected it, breaking OIDC
-- login for both new and existing users (#948).
--
-- Existing state is preserved: a user who had a verification timestamp becomes
-- `true` (verified), a NULL becomes `false` (not verified). No data is lost.

ALTER TABLE "User" ALTER COLUMN "emailVerified" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "emailVerified" TYPE BOOLEAN
  USING ("emailVerified" IS NOT NULL);

ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;
