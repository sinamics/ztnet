-- The controller secret now lives encrypted in "ControllerOptions", and the old
-- per user column is no longer read. Stop keeping plaintext copies in it. The
-- column itself stays for one more release so a downgrade still finds it; an
-- install that had typed in a secret has to enter it again after a downgrade.
UPDATE "UserOptions"
SET "localControllerSecret" = ''
WHERE COALESCE("localControllerSecret", '') <> '';
