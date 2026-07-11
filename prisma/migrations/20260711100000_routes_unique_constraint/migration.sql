-- Collapse existing duplicate managed routes, then enforce uniqueness on
-- (networkId, target, via).
--
-- De-dup is NOTE-PRESERVING: within each (networkId, target, via) group we keep
-- the row that carries a user note (notes are user data and must never be
-- silently dropped); only if none has a note do we fall back to the lowest id.
-- NULL `via` values are grouped together by the window function, so duplicate
-- LAN routes (via = NULL) are collapsed as well.

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

-- CreateIndex
-- Note: a plain unique index treats NULL `via` as distinct, so it does not by
-- itself prevent duplicate LAN routes. Those are prevented in application code
-- (serialized route sync + in-transaction re-read); this index is the hard
-- guarantee for routes that have a `via`.
CREATE UNIQUE INDEX "Routes_networkId_target_via_key" ON "Routes"("networkId", "target", "via");
