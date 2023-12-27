---
id: freebsd
title: Standalone FreeBSD
slug: /installation/freebsd
description: FreeBSD installation instructions for ZTNET
sidebar_position: 3
---

## System Requirements

To build and run the application, your system should meet the following minimum requirements:

- **Memory**: At least 1GB of RAM
- **CPU**: At least 1 CPU Core

# Installation

### Install PostgreSQL and ZeroTier
First, make sure PostgreSQL and ZeroTier are installed and configured on your FreeBSD server.
```bash
pkg update
pkg install zerotier protobuf curl git node
pkg install postgresql15-server postgresql15-contrib
sysrc postgresql_enable=yes
service postgresql initdb
service postgresql start

# start zerotier as deamon
zerotier-one -d
```

### Build Prisma Binary
```bash
git clone https://github.com/prisma/prisma-engines.git
cd prisma-engines

# Build all workspace binaries
cargo build --release

# Set environment variables
setenv PRISMA_CLI_QUERY_ENGINE_TYPE "binary"
setenv PRISMA_QUERY_ENGINE_BINARY "/root/prisma-engines/target/release/query-engine"
setenv PRISMA_FMT_BINARY "/root/prisma-engines/target/release/prisma-fmt"
setenv PRISMA_SCHEMA_ENGINE_BINARY "/root/prisma-engines/target/release/schema-engine"

# Rename libquery_engine.so to libquery_engine.node
mv /root/prisma-engines/target/release/libquery_engine.so ./target/release/libquery_engine.node

# set environment variable
setenv PRISMA_QUERY_ENGINE_LIBRARY /root/prisma-engines/target/release/libquery_engine.node
```


### Setup Ztnet

1. Clone the Ztnet repository:

    ```bash
    git clone https://github.com/sinamics/ztnet.git
    ```

2. Navigate into the directory:
    ```bash
    cd ztnet
    ```

3. Checkout latest version:
    
    Latest version can be found here: https://github.com/sinamics/ztnet/releases

    ```bash
    git checkout tags/vx.x.x
    ```

4. Install the Node.js dependencies:
    ```bash
    npm install
    ```

5. Create a `.env` file in the root directory and populate it with the necessary environment variables. Make sure these match what you've set up in your PostgreSQL database.
    ```
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ztnet?schema=public
    ZT_ADDR=http://127.0.0.1:9993
    NEXT_PUBLIC_SITE_NAME=ZTnet
    NEXTAUTH_URL="http://ZTNET_Controller_Web_UI_IP_ADDRESS:3000"
    NEXTAUTH_SECRET="random_secret"
    ```

6. Populate the PostgreSQL database with the necessary tables:
    ```bash
    npx prisma migrate deploy
    npx prisma db seed
    ```

7. Build Next.js production:
    ```bash
    npm run build
    cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
    ```

8. Copy mkworld binary:
    ```bash
    cp ztnodeid/build/freebsd_amd64/ztmkworld /usr/local/bin/ztmkworld
    ```
9. Run server:
    ```bash
    node .next/standalone/server.js
    ```

## Ztnet Environment Variables
See [Environment Variables](/installation/options#environment-variables) for more information.
