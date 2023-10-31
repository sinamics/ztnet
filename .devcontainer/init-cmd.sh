#!/usr/bin/env bash

set -e

cmd="$@"

./.devcontainer/init-postgres.sh postgres

# # Read environment variables
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-}
POSTGRES_DB=${POSTGRES_DB:-$POSTGRES_USER}

# # Start PostgreSQL
service postgresql start

# Create .env file
cat << EOF > .env
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
ZT_ADDR=${ZT_ADDR}
NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
EOF

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

# Check architecture and copy the corresponding file if it exists
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ] && [ -f "/workspaces/ztnodeid/build/linux_amd64/ztmkworld" ]; then
		cp /workspaces/ztnodeid/build/linux_amd64/ztmkworld /usr/local/bin/ztmkworld
elif [ "$ARCH" = "aarch64" ] && [ -f "/workspaces/ztnodeid/build/linux_arm64/ztmkworld" ]; then
		cp /workspaces/ztnodeid/build/linux_arm64/ztmkworld /usr/local/bin/ztmkworld
fi
chmod +x /usr/local/bin/ztmkworld


# apply migrations to the database
echo "Applying migrations to the database..."
npx prisma migrate deploy
echo "Migrations applied successfully!"

# seed the database
echo "Seeding the database..."
npx prisma db seed
echo "Database seeded successfully!"

while sleep 1000; do :; done