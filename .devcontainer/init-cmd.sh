#!/bin/bash

set -e

# Create .env file
# cat << EOF > .env
# DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
# ZT_ADDR=${ZT_ADDR}
# EOF

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

while sleep 1000; do :; done