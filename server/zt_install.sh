#!/bin/bash

cd /tmp

# If the file not exists, mean we need to initialize
if [ ! -f /var/lib/zerotier-one/identity.secret ] ; then 
    echo "Zerotier-One Configuration is **NOT** initialized."
    usermod -aG zerotier-one root
    mkdir -p /var/lib/zerotier-one
    rm -rf /var/lib/zerotier-one/*
    ln -sf /usr/sbin/zerotier-one /var/lib/zerotier-one/zerotier-cli
    ln -sf /usr/sbin/zerotier-one /var/lib/zerotier-one/zerotier-idtool
    ln -sf /usr/sbin/zerotier-one /var/lib/zerotier-one/zerotier-one
    chown zerotier-one:zerotier-one /var/lib/zerotier-one    # zerotier-one user home
    #chown -R zerotier-one:zerotier-one /var/lib/zerotier-one  # zerotier-one will change this at runtime. 
else
    echo "Zerotier-One Configuration is initialized."
fi

npx prisma generate --schema=/app/src/prisma/schema.prisma
npx prisma migrate dev --schema=/app/src/prisma/schema.prisma --name init --preview-feature
npx prisma db seed --schema=/app/src/prisma/schema.prisma --preview-feature

cd /app
# zt1 must run as root.
sudo /usr/sbin/zerotier-one -d
