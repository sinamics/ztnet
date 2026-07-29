-- Collapse existing duplicate managed routes, then enforce uniqueness on
-- (networkId, target, via) at the database layer.

-- 1. Preserve notes: fold every distinct non-empty note in a duplicate group
--    into the row we keep, so no note is ever lost — even if multiple duplicates
--    were separately annotated. `via IS NOT DISTINCT FROM` groups NULL vias
--    together (LAN routes).
WITH ranked AS (
  SELECT
    id,
    "networkId",
    "target",
    "via",
    ROW_NUMBER() OVER (
      PARTITION BY "networkId", "target", "via"
      ORDER BY
        (CASE WHEN "notes" IS NOT NULL AND btrim("notes") <> '' THEN 0 ELSE 1 END),
        "id"
    ) AS rn
  FROM "Routes"
),
merged AS (
  SELECT
    keep.id AS keep_id,
    string_agg(DISTINCT NULLIF(btrim(r."notes"), ''), E'\n') AS notes
  FROM ranked keep
  JOIN "Routes" r
    ON r."networkId" = keep."networkId"
   AND r."target" = keep."target"
   AND r."via" IS NOT DISTINCT FROM keep."via"
  WHERE keep.rn = 1
  GROUP BY keep.id
)
UPDATE "Routes" x
SET "notes" = merged.notes
FROM merged
WHERE x.id = merged.keep_id
  AND merged.notes IS NOT NULL
  AND merged.notes IS DISTINCT FROM x."notes";

-- 2. Delete the duplicate rows, keeping the first of each group (the note-bearing
--    row is ordered first, and its notes now carry the whole group's notes).
DELETE FROM "Routes" r
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "networkId", "target", "via"
        ORDER BY
          (CASE WHEN "notes" IS NOT NULL AND btrim("notes") <> '' THEN 0 ELSE 1 END),
          "id"
      ) AS rn
    FROM "Routes"
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE r.id = dupes.id;

-- 3a. Uniqueness for routes that have a `via` (gateway routes). A plain unique
--     index treats NULL as distinct, so it covers only non-NULL vias.
CREATE UNIQUE INDEX IF NOT EXISTS "Routes_networkId_target_via_key" ON "Routes"("networkId", "target", "via");

-- 3b. Uniqueness for LAN routes (`via IS NULL`), which the index above cannot
--     cover. A partial unique index closes that gap at the DB layer.
CREATE UNIQUE INDEX "Routes_networkId_target_lan_key" ON "Routes"("networkId", "target")
  WHERE "via" IS NULL;
