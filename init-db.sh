#!/bin/bash

set -e

cmd="$@"

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

# set the correct permissions for the zerotier-one identity file
chown -R nextjs:sudo /var/lib/zerotier-one/authtoken.secret
chmod 770 /var/lib/zerotier-one/authtoken.secret

# apply migrations to the database
echo "Applying migrations to the database..."
npx prisma migrate deploy
echo "Migrations applied successfully!"

>&2 echo "Executing command"
exec $cmd