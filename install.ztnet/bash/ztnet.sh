#!/bin/bash

# Check if the script is run as root (sudo)
if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo). Exiting."
  exit 1
fi

# exit if any command fails
set -e

INSTALL_DIR="/tmp/ztnet"
TARGET_DIR="/opt/ztnet"
NODE_MAJOR=18

ARCH=$(dpkg --print-architecture)
OS=$(grep -Eoi 'Debian|Ubuntu' /etc/issue)

RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
NC=$(tput sgr0) # No Color

# Detect local IP address
local_ip=$(hostname -I | awk '{print $1}')

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ARCH="$(uname -m)"
case "$ARCH" in
    "x86_64")
        ARCH="amd64"
        ;;
    "aarch64")
        ARCH="arm64"
        ;;
    *)
        echo ">>> Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

while getopts v:b: option 
do 
 case "${option}" 
 in 
 v) CUSTOM_VERSION=${OPTARG};;
 b) BRANCH=${OPTARG};;
 esac 
done

if [[ "$(lsb_release -is)" != "Debian" && "$(lsb_release -is)" != "Ubuntu" ]]; then
  echo "This script is only for Debian and Ubuntu. Exiting."
  exit 1
fi

# Show info text to user
printf "\n\n${YELLOW}Welcome to the installation script.${NC}\n"
printf "${YELLOW}This script will perform the following actions:${NC}\n"
printf "  1. Check if PostgreSQL is installed. If not, it will be installed.\n"
printf "  2. Check if Node.js version "$NODE_MAJOR" is installed. If not, it will be installed.\n"
printf "  3. Check if Zerotier is installed, If not, it will be installed.\n"
printf "  4. Clone ztnet repo into /tmp folder and build artifacts from latest tag version.\n"
printf "  5. Copy artifacts to /opt/ztnet folder.\n\n"
printf "Press space to proceed with the installation..." >&2
read -n1 -s < /dev/tty

# Inform the user about the default IP and ask if they want to change it
printf "\nThe current default server IP address is ${YELLOW}$local_ip${NC}.\n"
printf "Press Enter to use this default IP, or enter a new IP address or domain name pointing to this installation, then press Enter:\n"
printf "You can change this value later in the ${YELLOW}/opt/ztnet/.env${NC} file. If you make changes, restart the server with '${YELLOW}systemctl restart ztnet${NC}'.\n"
printf "==> " >&2
# Read the user input
read input_ip < /dev/tty

# update apt
sudo apt update

# Use the default local_ip if the user pressed Enter without typing anything
server_ip=${input_ip:-$local_ip}

# Check if the input already starts with http:// or https://
if [[ $server_ip != http://* && $server_ip != https://* ]]; then
    server_ip="http://${server_ip}"
fi

POSTGRES_PASSWORD="postgres"

# Install PostgreSQL
if ! command_exists psql; then
    sudo apt install postgresql postgresql-contrib -y
    # Ask user if they want to set a custom password for PostgreSQL
    printf "${YELLOW}Do you want to set a custom password for the PostgreSQL user 'postgres'? (Default is 'postgres'):${NC}\n"
    printf "yes / no ==> " >&2
    read setCustomPassword < /dev/tty

    if [[ "$setCustomPassword" == "yes" || "$setCustomPassword" == "y" ]]; then
    printf "Enter the custom password: " >&2
    read POSTGRES_PASSWORD < /dev/tty
    echo "ALTER USER postgres WITH PASSWORD '$POSTGRES_PASSWORD';" | sudo -u postgres psql
    else
    echo "ALTER USER postgres WITH PASSWORD 'postgres';" | sudo -u postgres psql
    fi
fi

# install git curl openssl
if ! command_exists git; then
    sudo apt install git -y
fi

if ! command_exists curl; then
    sudo apt install curl -y
fi

if ! command_exists openssl; then
    sudo apt install openssl -y
fi


# Remove directories and then recreate the target directory
rm -rf "$INSTALL_DIR" "$TARGET_DIR/.next" "$TARGET_DIR/prisma" "$TARGET_DIR/src"
mkdir -p "$TARGET_DIR"

# Install Node.js if it's not installed or if installed version is not the number defined in 'NODE_MAJOR' variable
if ! command_exists node; then
  INSTALL_NODE=true
else
  NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
  if [ $NODE_VERSION -lt $NODE_MAJOR ]; then
    INSTALL_NODE=true
  fi
fi

if [ "$INSTALL_NODE" = true ]; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
  sudo apt-get update
  sudo apt-get install nodejs -y
fi

# Install ZeroTier
if ! command_exists zerotier-cli; then
    echo "ZeroTier not found, installing..."
    curl -s https://install.zerotier.com | sudo bash
else
    echo "ZeroTier is already installed."
fi


# Setup Ztnet
# Clone Ztnet repository into /opt folder
if [[ ! -d "$INSTALL_DIR" ]]; then
  git clone https://github.com/sinamics/ztnet.git $INSTALL_DIR
  echo "Cloned Ztnet repository."
else
  echo "$INSTALL_DIR already exists. Updating the repository."
  cd $INSTALL_DIR
  git pull origin main
fi

cd $INSTALL_DIR
if [[ -z "$BRANCH" ]]; then
  # If BRANCH is empty or not set, checkout the latest tag or a custom version
  git fetch --tags
  latestTag=$(git describe --tags $(git rev-list --tags --max-count=1))
  echo "Checking out tag: ${CUSTOM_VERSION:-$latestTag}"
  git checkout "${CUSTOM_VERSION:-$latestTag}"
else
  # If BRANCH is not empty, checkout the specified branch
  echo "Checking out branch: $BRANCH"
  git checkout "$BRANCH"
fi

npm install

# Copy mkworld binary
cp "$INSTALL_DIR/ztnodeid/build/linux_$ARCH/ztmkworld" /usr/local/bin/ztmkworld

# File path to the .env file
env_file="$INSTALL_DIR/.env"

# A function to set or update an environment variable in .env file
set_env_var() {
  local key="$1"
  local value="$2"
  if grep -qE "^$key=" "$env_file"; then
    # If key exists, update it
    sed -i "s|^$key=.*|$key=$value|" "$env_file"
  else
    # If key doesn't exist, append it
    echo "$key=$value" >> "$env_file"
  fi
}

# Check if .env file exists, if not create it
[[ ! -f "$env_file" ]] && touch "$env_file" && echo "Created new .env file"

# Variables with default values
DATABASE_URL="postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/ztnet?schema=public"
ZT_ADDR=
ZT_SECRET=
NEXT_PUBLIC_SITE_NAME="ZTnet"
NEXTAUTH_URL="${server_ip}:3000"
NEXT_PUBLIC_APP_VERSION="${CUSTOM_VERSION:-$latestTag}"

# Set or update environment variables
set_env_var "DATABASE_URL" "$DATABASE_URL"
set_env_var "ZT_ADDR" "$ZT_ADDR"
set_env_var "NEXT_PUBLIC_SITE_NAME" "$NEXT_PUBLIC_SITE_NAME"
set_env_var "NEXTAUTH_URL" "$NEXTAUTH_URL"
set_env_var "NEXT_PUBLIC_APP_VERSION" "$NEXT_PUBLIC_APP_VERSION"

# Handle NEXTAUTH_SECRET specifically to retain value
if ! grep -q "NEXTAUTH_SECRET" "$env_file"; then
  randomSecret=$(openssl rand -hex 32)
  set_env_var "NEXTAUTH_SECRET" "$randomSecret"
  echo "Generated and saved a new NEXTAUTH_SECRET"
fi

# Populate PostgreSQL and build Next.js
npx prisma migrate deploy
npx prisma db seed
npm run build

# Ensure the target directories exist
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/.next/standalone"
mkdir -p "$TARGET_DIR/prisma"

# Copy relevant files and directories
cp "$INSTALL_DIR/next.config.mjs" "$TARGET_DIR/"
cp -r "$INSTALL_DIR/public" "$TARGET_DIR/public"
cp "$INSTALL_DIR/package.json" "$TARGET_DIR/package.json"

# Copy .next and prisma directories
cp -a "$INSTALL_DIR/.next/standalone/." "$TARGET_DIR/"
cp -r "$INSTALL_DIR/.next/static" "$TARGET_DIR/.next/static"
cp -r "$INSTALL_DIR/prisma" "$TARGET_DIR/prisma"

# Setup systemd service for Ztnet
cat > /etc/systemd/system/ztnet.service <<EOL
[Unit]
Description=ZTnet Service
After=network.target

[Service]
ExecStart=/usr/bin/node "$TARGET_DIR/server.js"
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable ztnet
sudo systemctl restart ztnet

# Note for the user regarding systemd service management
echo -e "Note: You can check the status of the service with ${YELLOW}systemctl status ztnet${NC}."
echo -e "To stop the ZTnet service, use ${YELLOW}sudo systemctl stop ztnet${NC}."
echo -e "If you do not want ZTnet to start on boot, you can disable it with ${YELLOW}sudo systemctl disable ztnet${NC}."




rm -rf "$INSTALL_DIR"

printf "\n\nYou can now open ZTnet at: ${YELLOW}${server_ip}:3000${NC}\n"
