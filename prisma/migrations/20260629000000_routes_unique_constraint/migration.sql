-- De-duplicate existing rows in "Routes" before adding the unique constraint.
-- Keep the lowest id per (networkId, target, via) group. NULL `via` values are
-- grouped together by PARTITION BY (window functions treat NULLs as one group),
-- so duplicate LAN routes (via = NULL) are collapsed as well.
DELETE FROM "Routes" r
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "networkId", "target", "via"
        ORDER BY "id"
      ) AS rn
    FROM "Routes"
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE r."id" = dupes."id";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Routes_networkId_target_via_key" ON "Routes"("networkId", "target", "via");
