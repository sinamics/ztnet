#!/bin/bash
set -e
# cd into our workspace
cd workspace/ztnet

npm install && npm rebuild node-sass
# Prisma stuff
npx prisma generate
npx prisma migrate dev --name init --preview-feature
npx prisma db seed --preview-feature

# Start zerotier deamon
zerotier-one -d

# service zerotier-one restart

exec "$@"