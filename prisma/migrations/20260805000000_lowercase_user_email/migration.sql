-- Normalize existing User.email values to lowercase.
--
-- next-auth looked users up with the raw string the user typed, so an account
-- registered as "John@Example.com" worked for as long as the same casing was
-- typed at login. better-auth lowercases the address before querying
-- (internalAdapter.findUserByEmail), and Postgres string equality is case
-- sensitive, so every user whose stored email contains an uppercase character
-- was locked out after the better-auth upgrade with "User not found".
--
-- "User".email is UNIQUE, so rows that would collide when lowercased (e.g. both
-- "Bob@x.com" and "bob@x.com" exist) are deliberately left untouched — the
-- migration must not fail and block startup for everyone else. Those instances
-- get a warning in the migration output and need a manual merge.

DO $$
DECLARE
  collisions TEXT;
BEGIN
  SELECT string_agg(DISTINCT lower(email), ', ')
  INTO collisions
  FROM "User"
  WHERE lower(email) IN (
    SELECT lower(email) FROM "User" GROUP BY lower(email) HAVING count(*) > 1
  );

  UPDATE "User"
  SET email = lower(email)
  WHERE email <> lower(email)
    AND lower(email) NOT IN (
      SELECT lower(email) FROM "User" GROUP BY lower(email) HAVING count(*) > 1
    );

  IF collisions IS NOT NULL THEN
    RAISE WARNING 'ztnet: these addresses exist more than once when lowercased and were left unchanged: %. Merge or delete the duplicate User rows, then re-run: UPDATE "User" SET email = lower(email) WHERE email <> lower(email);', collisions;
  END IF;
END $$;
