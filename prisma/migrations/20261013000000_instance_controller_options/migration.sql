-- CreateTable
CREATE TABLE "ControllerOptions" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "localControllerUrl" TEXT,
    "localControllerSecret" TEXT,

    CONSTRAINT "ControllerOptions_pkey" PRIMARY KEY ("id")
);

-- The local controller used to be configured per user, so two users could
-- address different controllers for the same network. It is now one instance
-- setting. Carry over what an admin had configured: the admin that customised
-- the URL or secret wins, otherwise the oldest admin. The URL is copied as is,
-- so the controller this admin reached before the upgrade stays the same.
INSERT INTO "ControllerOptions" ("id", "localControllerUrl", "localControllerSecret")
SELECT
    1,
    NULLIF(o."localControllerUrl", ''),
    NULLIF(o."localControllerSecret", '')
FROM "UserOptions" o
JOIN "User" u ON u."id" = o."userId"
WHERE u."role" = 'ADMIN'
ORDER BY
    (
        COALESCE(o."localControllerUrl", '') NOT IN ('', 'http://zerotier:9993', 'http://127.0.0.1:9993')
        OR COALESCE(o."localControllerSecret", '') <> ''
    ) DESC,
    u."createdAt" ASC
LIMIT 1;
