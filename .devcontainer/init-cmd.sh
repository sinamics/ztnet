#!/bin/bash

set -e

# Create .env file
# cat << EOF > .env
# DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
# ZT_ADDR=${ZT_ADDR}
# NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
# EOF

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

# Install openssl
wget http://security.debian.org/debian-security/pool/updates/main/o/openssl/libssl1.1_1.1.1n-0+deb10u6_amd64.deb
sudo dpkg -i libssl1.1_1.1.1n-0+deb10u6_amd64.deb

# Check architecture and copy the corresponding file if it exists
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ] && [ -f "/workspaces/ztnodeid/build/linux_amd64/ztmkworld" ]; then
    cp /workspaces/ztnodeid/build/linux_amd64/ztmkworld /usr/local/bin/ztmkworld
    cp /workspaces/bin/zerotier-idtool_amd64 /usr/local/bin/zerotier-idtool
elif [ "$ARCH" = "aarch64" ] && [ -f "/workspaces/ztnodeid/build/linux_arm64/ztmkworld" ]; then
    cp /workspaces/ztnodeid/build/linux_arm64/ztmkworld /usr/local/bin/ztmkworld
fi
chmod +x /usr/local/bin/ztmkworld

# apply migrations to the database
echo "Applying migrations to the database..."
npx prisma migrate deploy
echo "Migrations applied successfully!"

while sleep 1000; do :; done