---
id: backup-restore
title: Backup & Restore
slug: /usage/backup-restore
description: Create backups of ZTNET (database and ZeroTier identity) and restore them, including manual disaster recovery when an upgrade goes wrong.
sidebar_position: 8
---

# Backup & Restore

ZTNET can back up and restore two things:

1. **Database**, a PostgreSQL dump containing all users, organizations, networks, members and settings.
2. **ZeroTier data folder**, the controller's identity and state (`ZT_FOLDER`, default `/var/lib/zerotier-one`). This is the most important thing to keep, because losing the controller identity means losing control of every network you created.

:::warning Always back up before upgrading
Before any version upgrade, and especially the next-auth to better-auth migration, create a backup and keep the downloaded file somewhere safe. If an upgrade fails to start the app, the in-app restore will not be available (see [Disaster recovery](#disaster-recovery-app-wont-start)).
:::

## What a backup contains

A backup is a single `.tar.gz` archive:

```
backup.tar.gz
├── database_dump.sql      # PostgreSQL dump (if "Include database" was checked)
├── zerotier/              # full copy of ZT_FOLDER (if "Include ZeroTier" was checked)
│   ├── identity.secret
│   ├── identity.public
│   ├── controller.d/
│   └── ...
└── backup_metadata.json
```

Only **PostgreSQL** databases are supported.

## Creating a backup

1. Go to **Admin, Backup & Restore** (`/admin?tab=backup-restore`).
2. Choose what to include: **Database** and/or **ZeroTier**.
3. (Optional) give it a name, then click **Create backup**.
4. The archive is created and downloaded to your browser. Keep that file somewhere safe, it is your backup.

## Restoring (from the app)

Use this when the app is running normally.

1. Go to **Admin, Backup & Restore**.
2. Either click **Restore** on a backup in the list, or upload a `.tar.gz` file.
3. Choose what to restore (**Database** / **ZeroTier**) and confirm.

The previous ZeroTier folder is moved aside to `ZT_FOLDER.backup.<timestamp>` before restoring, so nothing is destroyed in place. After a database restore, refresh the page (you may need to log in again).

The only difference between deployments is how ZeroTier is restarted afterwards:

- **Docker:** after the restore, restart the ZeroTier container yourself with `sudo docker restart zerotier` (a dialog reminds you).
- **Standalone:** the `zerotier-one` service is restarted automatically.

## Disaster recovery (app won't start) {#disaster-recovery-app-wont-start}

:::danger The in-app restore needs a running app
The UI restore is an admin action inside ZTNET. If an upgrade leaves ZTNET unable to start, restore manually using the steps below, from a backup `.tar.gz` you downloaded earlier.
:::

:::warning Order matters if the upgrade ran database migrations
A failed upgrade has usually **already applied its database migrations**, so the schema is now newer than your old version. Do **not** start the rolled-back app first, it would run against the migrated schema and fail again. Restore the database **before** starting the old version. Restoring the dump replaces the schema and the Prisma migration history with the pre-upgrade state, undoing those migrations.
:::

### 1. Stop ZTNET

Stop the running container or service so nothing touches the database while you restore.

```bash
docker compose stop ztnet          # Docker
# or, standalone: stop your ztnet service / process
```

### 2. Unpack your backup

```bash
mkdir restore && tar -xzf ztnet-backup-*.tar.gz -C restore
ls restore   # database_dump.sql  zerotier/  backup_metadata.json
```

### 3. Restore the database

The dump drops and recreates objects (including the migration history), so restore it onto the same database named in your `DATABASE_URL`.

**Docker** (replace `postgres` with your compose database service name, and use the user/db from `DATABASE_URL`):

```bash
docker compose cp restore/database_dump.sql postgres:/tmp/dump.sql
docker compose exec -T postgres sh -c 'psql -U <user> -d <database> < /tmp/dump.sql'
```

**Standalone** (uses your `DATABASE_URL` credentials):

```bash
PGPASSWORD=<password> psql -h <host> -p 5432 -U <user> -d <database> < restore/database_dump.sql
```

### 4. Restore the ZeroTier folder

Stop ZeroTier, copy the files back, fix ownership, then start it again.

**Docker:**

```bash
docker stop zerotier
docker cp restore/zerotier/. zerotier:/var/lib/zerotier-one/
docker exec zerotier sh -c 'chown -R 999:999 /var/lib/zerotier-one && chmod -R 700 /var/lib/zerotier-one'
docker start zerotier
```

**Standalone (host):**

```bash
sudo systemctl stop zerotier-one
sudo cp -a restore/zerotier/. /var/lib/zerotier-one/
sudo chown -R root:root /var/lib/zerotier-one
sudo chmod -R 700 /var/lib/zerotier-one
sudo systemctl start zerotier-one
```

On **FreeBSD**, the ZeroTier folder is `/var/db/zerotier-one` instead of `/var/lib/zerotier-one`.

### 5. Start the previous version

Now that the database matches the old schema, switch back to the version you were on before the upgrade and start it.

**Docker**, pin the previous image tag in `docker-compose.yml` (do not stay on `latest`):

```yaml
services:
  ztnet:
    image: sinamics/ztnet:<previous-version>   # e.g. v0.8.10
```

```bash
docker compose up -d
```

**Standalone**, check out the previous release tag and rebuild:

```bash
git checkout <previous-tag>
npm ci && npm run build && npm run start
```

### 6. Verify

Log in and confirm your networks, members and settings are present. Once everything checks out, you can remove the safety folders (`ZT_FOLDER.backup.*`) created during a restore.

## Notes

- **PostgreSQL only.** Backup and restore use `pg_dump` and `psql`. These ship in the official ZTNET image. For a standalone install, `postgresql-client` must be installed.
- A restore overwrites the current database and ZeroTier folder, but the prior ZeroTier folder is preserved as `ZT_FOLDER.backup.<timestamp>`.
- The ZeroTier identity is the single most critical asset. Keep at least one downloaded backup that includes it, stored somewhere off the server.
