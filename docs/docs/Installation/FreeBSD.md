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
- **FreeBSD**: Version 13 or later recommended

## Automatic Installation (Recommended)

The easiest way to install ZTnet on FreeBSD is using the official installer script:

```bash
curl -fsSL http://install.ztnet.network | sh
```

This script will:
1. Install PostgreSQL if not present
2. Install Node.js 20
3. Install ZeroTier
4. Clone, build, and configure ZTnet
5. Set up an rc.d service for automatic startup

### Installer Options

```bash
# Install a specific version
curl -fsSL http://install.ztnet.network | sh -s -- -v v1.0.0

# Install from a specific branch
curl -fsSL http://install.ztnet.network | sh -s -- -b main

# Uninstall ZTnet
curl -fsSL http://install.ztnet.network | sh -s -- -u
```

### Managing the Service

```bash
# Check service status
service ztnet status

# Stop service
service ztnet stop

# Start service
service ztnet start

# Disable autostart
sysrc ztnet_enable=NO
```

---

## Manual Installation

If you prefer to install manually, follow these steps:

### 1. Install Dependencies

```bash
pkg update
pkg upgrade -y
pkg install -y postgresql16-server postgresql16-client node20 npm git curl openssl libnghttp2 zerotier
```

### 2. Configure PostgreSQL

```bash
# Enable and initialize PostgreSQL
sysrc postgresql_enable=YES
service postgresql initdb
service postgresql start

# Create database and user
su -m postgres -c "psql -c \"CREATE USER ztnet WITH PASSWORD 'your_password';\""
su -m postgres -c "psql -c \"CREATE DATABASE ztnet;\""
su -m postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ztnet TO ztnet;\""
su -m postgres -c "psql -d ztnet -c \"GRANT ALL PRIVILEGES ON SCHEMA public TO ztnet;\""
```

### 3. Configure ZeroTier

```bash
sysrc zerotier_enable=YES
service zerotier start

# Wait for identity generation
sleep 5

# Verify ZeroTier is running
zerotier-cli status
```

### 4. Clone and Build ZTnet

```bash
# Clone the repository
git clone https://github.com/sinamics/ztnet.git /tmp/ztnet
cd /tmp/ztnet

# Checkout the latest release
git fetch --tags
latestTag=$(git tag --sort=-committerdate | head -n 1)
git checkout "$latestTag"

# Create environment file
cat > .env <<EOF
DATABASE_URL=postgresql://ztnet:your_password@127.0.0.1:5432/ztnet?schema=public
NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_APP_VERSION=$latestTag
EOF

# Export DATABASE_URL for Prisma
export DATABASE_URL="postgresql://ztnet:your_password@127.0.0.1:5432/ztnet?schema=public"

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy
npx prisma db seed

# Build the application
npm run build
```

### 5. Install ZTnet

```bash
# Create target directory
mkdir -p /opt/ztnet/.next

# Copy files
cp -a /tmp/ztnet/.next/standalone/. /opt/ztnet/
cp -r /tmp/ztnet/.next/static /opt/ztnet/.next/static
cp -r /tmp/ztnet/public /opt/ztnet/
cp -r /tmp/ztnet/prisma /opt/ztnet/
cp /tmp/ztnet/.env /opt/ztnet/.env
cp /tmp/ztnet/next.config.mjs /opt/ztnet/
cp /tmp/ztnet/package.json /opt/ztnet/

# Copy mkworld binary (optional, for custom planets)
if [ -f /tmp/ztnet/ztnodeid/build/freebsd_amd64/ztmkworld ]; then
    cp /tmp/ztnet/ztnodeid/build/freebsd_amd64/ztmkworld /usr/local/bin/ztmkworld
fi
```

### 6. Create rc.d Service

Create the file `/usr/local/etc/rc.d/ztnet`:

```bash
cat > /usr/local/etc/rc.d/ztnet <<'EOF'
#!/bin/sh

# PROVIDE: ztnet
# REQUIRE: LOGIN postgresql zerotier
# KEYWORD: shutdown

. /etc/rc.subr

name="ztnet"
rcvar="ztnet_enable"

load_rc_config $name

: ${ztnet_enable:="NO"}
: ${ztnet_user:="root"}
: ${ztnet_dir:="/opt/ztnet"}
: ${ztnet_env_file:="/opt/ztnet/.env"}

pidfile="/var/run/${name}.pid"
command="/usr/sbin/daemon"
command_args="-P ${pidfile} -r -f /usr/local/bin/node ${ztnet_dir}/server.js"

start_precmd="ztnet_prestart"

ztnet_prestart()
{
    if [ -f "${ztnet_env_file}" ]; then
        set -a
        . "${ztnet_env_file}"
        set +a
    fi
    cd "${ztnet_dir}"
}

run_rc_command "$1"
EOF

chmod +x /usr/local/etc/rc.d/ztnet
```

### 7. Enable and Start ZTnet

```bash
sysrc ztnet_enable=YES
service ztnet start
```

ZTnet should now be accessible at `http://YOUR_SERVER_IP:3000`

---

## Troubleshooting

### Package Version Mismatch

If you see errors about package repository version mismatch, prefix pkg commands with:

```bash
env IGNORE_OSVERSION=yes pkg install -y <package>
```

### Library Errors (nghttp2)

If you encounter `Undefined symbol "nghttp2_..."` errors, upgrade all packages:

```bash
pkg upgrade -y
```

### PostgreSQL Permission Errors

If PostgreSQL commands show "could not change directory" warnings, run them from `/tmp`:

```bash
cd /tmp
su -m postgres -c "psql -c \"...\""
```

### Check Logs

```bash
# Check if ZTnet is running
service ztnet status

# View system logs
tail -f /var/log/messages
```

## Ztnet Environment Variables

See [Environment Variables](/installation/options#environment-variables) for more information.
