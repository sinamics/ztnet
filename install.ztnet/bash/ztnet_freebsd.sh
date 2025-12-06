#!/bin/sh

# Copyright (c) 2023-2024 sinamics
# Author: sinamics (Bernt Christian Egeland)
# License: GPL-3.0
# https://github.com/sinamics/ztnet/blob/main/LICENSE
# FreeBSD Support

clear
set -e

# Colors
if [ -t 1 ]; then
  RED=$(printf '\033[31m')
  GREEN=$(printf '\033[32m')
  YELLOW=$(printf '\033[33m')
  BLUE=$(printf '\033[34m')
  BOLD=$(printf '\033[1m')
  NC=$(printf '\033[0m')
else
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  BOLD=""
  NC=""
fi

print_ztnet() {
    printf '%s  ______    ___________   _____  ___    _______  ___________ %s\n' "$BLUE" "$NC"
    printf '%s ("      "\ ("     _   ") ("   \ |"  \  /"     "| ("    _   ") %s\n' "$BLUE" "$NC"
    printf '%s  \___/   :))__/  \\__/  |.\\   \    | (: ______) )__/ \\__/  %s\n' "$BLUE" "$NC"
    printf '%s    /  ___/    \\_  /     |: \\   \\   |  \\/   |      \\_  /   %s\n' "$BLUE" "$NC"
    printf '%s   //  \\__     |.  |     |.  \\    \\. | // ___)_     |.  |   %s\n' "$BLUE" "$NC"
    printf '%s  (:   / "\\    \\:  |     |    \\    \\ | (:      "|   \\:  |   %s\n' "$BLUE" "$NC"
    printf '%s   \\_______)    \\__|      \\___|\\___\\) \\_______)    \\__|   %s\n' "$BLUE" "$NC"
    printf '\n'
    printf '%s         FreeBSD Installation Script %s\n' "$GREEN" "$NC"
    printf '\n\n'
}

print_ztnet

# Variables
ZEROTIER_VERSION="1.14.2"
NODE_MAJOR=20
TEMP_INSTALL_DIR="/tmp/ztnet"
TEMP_REPO_DIR="$TEMP_INSTALL_DIR/repo"
TARGET_DIR="/opt/ztnet"
SILENT_MODE="No"
UNINSTALL=0

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
  printf "${RED}This script must be run as root. Exiting.${NC}\n"
  exit 1
fi

# Check if this is FreeBSD
if [ "$(uname)" != "FreeBSD" ]; then
  printf "${RED}This script is only for FreeBSD. Exiting.${NC}\n"
  exit 1
fi

# Architecture detection
ARCH=$(uname -m)
case "$ARCH" in
    "amd64"|"x86_64")
        ARCH="amd64"
        ;;
    "aarch64"|"arm64")
        ARCH="arm64"
        ;;
    *)
        printf "${RED}Unsupported architecture: $ARCH${NC}\n"
        exit 1
        ;;
esac

FREEBSD_VERSION=$(freebsd-version | cut -d'-' -f1 | cut -d'.' -f1)
printf "Detected FreeBSD ${FREEBSD_VERSION} on ${ARCH}\n\n"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to ask a Yes/No question
ask_question() {
    local question=$1
    local default_answer=$2
    local varname=$3

    printf "${GREEN}?${NC}${YELLOW} $question (Yes/No) [Default: $default_answer]: ${NC}"
    read -r reply </dev/tty

    if [ -z "$reply" ]; then
        reply=$default_answer
    fi

    case "$reply" in
        [Yy]*)
            eval "$varname='Yes'"
            ;;
        *)
            eval "$varname='No'"
            ;;
    esac
}

ask_string() {
    local question=$1
    local default_value=$2
    local varname=$3

    printf "${GREEN}?${NC}${YELLOW} $question [Default: $default_value]: ${NC}"
    read -r input_value </dev/tty

    if [ -z "$input_value" ]; then
        input_value=$default_value
    fi

    eval "$varname='$input_value'"
}

print_status() {
    printf " ${GREEN}[*]${NC} $1\n"
}

print_error() {
    printf " ${RED}[!]${NC} $1\n"
}

# Cleanup function
cleanup() {
    printf "\nCleaning up...\n"
    rm -rf "$TEMP_INSTALL_DIR"
}

trap 'cleanup; exit' INT TERM

# Parse command line arguments
while getopts "v:b:su" opt; do
    case $opt in
        v) CUSTOM_VERSION="$OPTARG" ;;
        b) BRANCH="$OPTARG" ;;
        s) SILENT_MODE="Yes" ;;
        u) UNINSTALL=1 ;;
    esac
done

# Uninstall
if [ "$UNINSTALL" = 1 ]; then
    printf "\n\n${YELLOW}ZTNET uninstallation script for FreeBSD.${NC}\n"
    printf "This script will perform the following actions:\n"
    printf "  1. Stop the ZTnet service.\n"
    printf "  2. Remove the ZTnet rc.d service.\n"
    printf "  3. Remove the ZTnet directory.\n"
    printf "  4. Remove ZeroTier package\n\n"
    printf "NOTE! PostgreSQL, Git and Node.js will not be removed.\n\n"

    ask_question "Do you want to uninstall ZTnet?" "No" UNINSTALL_ZTNET

    if [ "$UNINSTALL_ZTNET" = "No" ]; then
        exit 1
    fi

    print_status "Stopping ZTnet service..."
    service ztnet stop 2>/dev/null || true

    print_status "Removing ZeroTier..."
    pkg remove -y zerotier 2>/dev/null || true

    print_status "Removing ZTnet directory..."
    rm -rf /opt/ztnet

    print_status "Removing ZTnet rc.d service..."
    rm -f /usr/local/etc/rc.d/ztnet

    printf "\n${GREEN}ZTnet has been completely removed.${NC}\n"
    exit 0
fi

# Welcome info
printf "\n${YELLOW}ZTNET installation script for FreeBSD.${NC}\n"
printf "This script will perform the following actions:\n"
printf "  1. Install PostgreSQL if it's not already present.\n"
printf "  2. Ensure Node.js version %s is installed.\n" "$NODE_MAJOR"
printf "  3. Install ZeroTier if it's missing.\n"
printf "  4. Clone the ZTnet repository and build.\n"
printf "  5. Transfer the artifacts to ${YELLOW}${TARGET_DIR}${NC}.\n\n"

# Detect local IP
local_ip=$(ifconfig | grep -E 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)

# Auto generate postgres password
POSTGRES_PASSWORD=$(openssl rand -hex 10)
POSTGRES_USER="ztnet"
POSTGRES_DB="ztnet"

TARGET_ENV_FILE="$TARGET_DIR/.env"
TEMP_ENV_FILE="$TEMP_REPO_DIR/.env"

# Ask for server IP
if [ ! -f "$TARGET_ENV_FILE" ]; then
    ask_string "Enter the ZTnet server IP address or domain name" "$local_ip" input_ip
fi

# Ask for PostgreSQL password if not installed
if ! command_exists psql; then
    ask_string "Set a custom password for PostgreSQL user 'ztnet'" "$POSTGRES_PASSWORD" POSTGRES_PASSWORD
fi

ask_question "Use silent (non-verbose) installation?" "Yes" SILENT_MODE

printf "\n"
print_status "Starting installation..."

# Create temp directory
rm -rf "$TEMP_INSTALL_DIR"
mkdir -p "$TEMP_INSTALL_DIR"
mkdir -p "$TARGET_DIR"

# Update pkg (ignore OS version mismatch)
print_status "Updating pkg repositories..."
env IGNORE_OSVERSION=yes pkg update -f

# Upgrade existing packages to avoid library mismatches
print_status "Upgrading existing packages..."
env IGNORE_OSVERSION=yes pkg upgrade -y

# Install required packages
print_status "Installing required packages..."
PACKAGES="git curl jq openssl"
for pkg_name in $PACKAGES; do
    if ! command_exists "$pkg_name"; then
        print_status "Installing $pkg_name..."
        env IGNORE_OSVERSION=yes pkg install -y "$pkg_name"
    fi
done

# Install libnghttp2 (required for Node.js)
env IGNORE_OSVERSION=yes pkg install -y libnghttp2

# Install PostgreSQL
if ! command_exists psql; then
    print_status "Installing PostgreSQL..."
    env IGNORE_OSVERSION=yes pkg install -y postgresql16-server postgresql16-client

    # Enable and initialize PostgreSQL
    sysrc postgresql_enable="YES"

    if [ ! -d "/var/db/postgres/data16" ]; then
        service postgresql initdb
    fi

    service postgresql start

    # Wait for PostgreSQL to start
    sleep 3
fi

# Setup PostgreSQL user and database
print_status "Setting up PostgreSQL database..."
cd /tmp
if ! su -m postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='$POSTGRES_USER'\"" | grep -q 1; then
    su -m postgres -c "psql -c \"CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';\""
fi

if ! su -m postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'\"" | grep -q 1; then
    su -m postgres -c "psql -c \"CREATE DATABASE $POSTGRES_DB;\""
fi

su -m postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;\""
su -m postgres -c "psql -d $POSTGRES_DB -c \"GRANT ALL PRIVILEGES ON SCHEMA public TO $POSTGRES_USER;\""
cd /

# Install Node.js
if ! command_exists node || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt "$NODE_MAJOR" ]; then
    print_status "Installing Node.js $NODE_MAJOR..."
    env IGNORE_OSVERSION=yes pkg install -y node${NODE_MAJOR} npm
fi

# Install ZeroTier
if ! command_exists zerotier-cli; then
    print_status "Installing ZeroTier..."
    env IGNORE_OSVERSION=yes pkg install -y zerotier

    sysrc zerotier_enable="YES"
    service zerotier start

    # Wait for identity generation
    print_status "Waiting for ZeroTier identity generation..."
    while [ ! -f /var/db/zerotier-one/identity.secret ]; do
        sleep 1
    done

    if [ -f /var/db/zerotier-one/identity.public ]; then
        ZT_ADDRESS=$(cat /var/db/zerotier-one/identity.public | cut -d: -f1)
        print_status "ZeroTier installed! Address: $ZT_ADDRESS"
    fi
fi

# Set server IP
server_ip=${input_ip:-$local_ip}
if echo "$server_ip" | grep -qvE '^https?://'; then
    server_ip="http://${server_ip}"
fi

# Clone and build ZTnet
print_status "Cloning ZTnet repository..."
cd "$TEMP_INSTALL_DIR"

if [ ! -d "$TEMP_REPO_DIR/.git" ]; then
    git clone --depth 1 --no-single-branch https://github.com/sinamics/ztnet.git "$TEMP_REPO_DIR"
fi

cd "$TEMP_REPO_DIR"

# Checkout version
if [ -z "$BRANCH" ]; then
    print_status "Fetching tags..."
    git fetch --unshallow --tags 2>/dev/null || git fetch --tags

    latestTag=$(git tag --sort=-committerdate | head -n 1)

    if [ -z "$latestTag" ]; then
        print_status "No tags found, using main branch"
        git checkout main
    else
        print_status "Checking out tag: ${CUSTOM_VERSION:-$latestTag}"
        git checkout "${CUSTOM_VERSION:-$latestTag}"
    fi
else
    print_status "Checking out branch: $BRANCH"
    git checkout "$BRANCH"
fi

# Create .env file
print_status "Creating environment file..."
NEXTAUTH_SECRET=$(openssl rand -hex 32)
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB?schema=public"

cat > "$TEMP_ENV_FILE" <<EOF
DATABASE_URL=$DATABASE_URL
NEXTAUTH_URL=${server_ip}:3000
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXT_PUBLIC_APP_VERSION=${CUSTOM_VERSION:-$latestTag}
EOF

# Export for Prisma
export DATABASE_URL

# Install dependencies
print_status "Installing npm dependencies..."
npm install

# Run Prisma migrations
print_status "Running database migrations..."
npx prisma migrate deploy

print_status "Seeding database..."
npx prisma db seed

# Build
print_status "Building ZTnet (this may take a while)..."
npm run build

# Copy files to target
print_status "Copying files to $TARGET_DIR..."
mkdir -p "$TARGET_DIR/.next/standalone"
mkdir -p "$TARGET_DIR/prisma"

cp "$TEMP_REPO_DIR/next.config.mjs" "$TARGET_DIR/"
cp -r "$TEMP_REPO_DIR/public" "$TARGET_DIR/"
cp "$TEMP_REPO_DIR/package.json" "$TARGET_DIR/"
cp -a "$TEMP_REPO_DIR/.next/standalone/." "$TARGET_DIR/"
cp -r "$TEMP_REPO_DIR/.next/static" "$TARGET_DIR/.next/static"
cp -r "$TEMP_REPO_DIR/prisma" "$TARGET_DIR/"
cp "$TEMP_ENV_FILE" "$TARGET_ENV_FILE"

# Copy mkworld binary if exists for FreeBSD
if [ -f "$TEMP_REPO_DIR/ztnodeid/build/freebsd_$ARCH/ztmkworld" ]; then
    cp "$TEMP_REPO_DIR/ztnodeid/build/freebsd_$ARCH/ztmkworld" /usr/local/bin/ztmkworld
fi

# Create rc.d service script
print_status "Creating rc.d service..."
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

# Enable and start service
print_status "Enabling and starting ZTnet service..."
sysrc ztnet_enable="YES"
service ztnet start

sleep 4

cleanup

# Final notes
printf "\n"
printf "${GREEN}Installation complete!${NC}\n\n"
printf "NOTE!\n"
printf "- ZTnet is installed in ${GREEN}/opt/ztnet${NC}\n"
printf "- Check service status: ${YELLOW}service ztnet status${NC}\n"
printf "- Stop service: ${YELLOW}service ztnet stop${NC}\n"
printf "- Disable autostart: ${YELLOW}sysrc ztnet_enable=NO${NC}\n"
printf "- Environment variables: ${YELLOW}/opt/ztnet/.env${NC}\n"
printf "\n"
printf "ZTnet is waiting for you at: ${YELLOW}${server_ip}:3000${NC}\n\n"
