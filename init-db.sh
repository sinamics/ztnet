#!/bin/bash

set -e

cmd="$@"

# Create .env file
cat << EOF > .env
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
ZT_ADDR=${ZT_ADDR}
NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
EOF

# config
envFilename='.env'
nextFolder='/app'
function apply_path {
  # read all config file  
  while read line; do
    # no comment or not empty
    if [ "${line:0:1}" == "#" ] || [ "${line}" == "" ]; then
      continue
    fi
    
    # split
    configName="$(cut -d'=' -f1 <<<"$line")"
    configValue="$(cut -d'=' -f2 <<<"$line")"
    # get system env
    envValue=$(env | grep "^$configName=" | grep -oe '[^=]*$');
    
    # if config found
    if [ -n "$configValue" ] && [ -n "$envValue" ]; then
      # replace all
      echo "Replace: ${configValue} with: ${envValue}"
      find $nextFolder \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s#$configValue#$envValue#g"
    fi
  done < $envFilename
}

apply_path

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
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

>&2 echo "Executing command"
exec $cmd