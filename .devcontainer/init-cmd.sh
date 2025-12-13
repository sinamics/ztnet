#!/bin/bash

set -e

# Export DATABASE_URL for Prisma (prisma.config.ts skips .env loading)
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

# Fix ZeroTier directory permissions for node user using shared group
if [ -d "/var/lib/zerotier-one" ]; then
  # Create shared group and add both root and node to it
  sudo groupadd -f ztnet
  sudo usermod -aG ztnet root
  sudo usermod -aG ztnet node
  # Set group ownership and permissions
  sudo chown -R root:ztnet /var/lib/zerotier-one
  sudo chmod -R 775 /var/lib/zerotier-one
  sudo chmod 660 /var/lib/zerotier-one/authtoken.secret 2>/dev/null || true
  echo "✓ ZeroTier permissions fixed (shared group: ztnet)"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "/workspaces/node_modules" ]; then
  echo "Installing dependencies..."
  cd /workspaces && npm install
fi

# Check architecture and copy the corresponding file if it exists
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ] && [ -f "/workspaces/ztnodeid/build/linux_amd64/ztmkworld" ]; then
    sudo cp /workspaces/ztnodeid/build/linux_amd64/ztmkworld /usr/local/bin/ztmkworld
elif [ "$ARCH" = "aarch64" ] && [ -f "/workspaces/ztnodeid/build/linux_arm64/ztmkworld" ]; then
    sudo cp /workspaces/ztnodeid/build/linux_arm64/ztmkworld /usr/local/bin/ztmkworld
fi
sudo chmod +x /usr/local/bin/ztmkworld 2>/dev/null || true

# apply migrations to the database
echo "Applying migrations to the database..."
npx prisma migrate deploy
echo "Migrations applied successfully!"

while sleep 1000; do :; done