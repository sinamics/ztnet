#!/bin/bash

# Enable error handling and debug tracing
set -e
# set -x  ( DEBUG )

error_handling() {
    echo "An error occurred. Exiting..."
    exit 1
}
# trap errors
trap error_handling ERR

cmd="$@"

# Create .env file
echo "Creating .env file..."
cat << EOF > .env
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
ZT_ADDR=${ZT_ADDR}
NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
EOF

# config
envFilename='.env'
nextFolder='.next'

function apply_path {
  # echo "Applying path..."
  while read line; do
    if [ "${line:0:1}" == "#" ] || [ "${line}" == "" ]; then
      continue
    fi
    configName="$(cut -d'=' -f1 <<<"$line")"
    configValue="$(cut -d'=' -f2 <<<"$line")"
    envValue="${!configName}";

    # echo "Debug: configName=$configName, configValue=$configValue, envValue=$envValue"

    if [ -n "$configValue" ] && [ -n "$envValue" ]; then
      echo "Replace: ${configValue} with: ${envValue}"
      find $nextFolder \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s#$configValue#$envValue#g"
    fi
  done < $envFilename
}

apply_path
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c '\q'; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done

# apply migrations to the database
echo "Applying migrations to the database..."
npx prisma migrate deploy
echo "Migrations applied successfully!"

# seed the database
echo "Seeding the database..."
npx prisma db seed
echo "Database seeded successfully!"

echo "Executing command"
exec $cmd
