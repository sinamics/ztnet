#!/bin/bash

# Copyright (c) 2023-2024 sinamics
# Author: sinamics (Bernt Christian Egeland)
# License: GPL-3.0
# https://github.com/sinamics/ztnet/blob/main/LICENSE

clear
set -E -o functrace

if [ -t 1 ]; then
  is_tty() {
    true
  }
else
  is_tty() {
    false
  }
fi
supports_truecolor() {
  case "$COLORTERM" in
  truecolor|24bit) return 0 ;;
  esac

  case "$TERM" in
  iterm           |\
  tmux-truecolor  |\
  linux-truecolor |\
  xterm-truecolor |\
  screen-truecolor) return 0 ;;
  esac

  return 1
}

setup_color() {
  # Only use colors if connected to a terminal
  if ! is_tty; then
    FMT_RAINBOW=""
    FMT_RED=""
    FMT_GREEN=""
    FMT_YELLOW=""
    FMT_BLUE=""
    FMT_BOLD=""
    FMT_RESET=""
    return
  fi

  if supports_truecolor; then
    FMT_RAINBOW="
      $(printf '\033[38;2;255;0;0m')
      $(printf '\033[38;2;255;97;0m')
      $(printf '\033[38;2;247;255;0m')
      $(printf '\033[38;2;0;255;30m')
      $(printf '\033[38;2;77;0;255m')
      $(printf '\033[38;2;168;0;255m')
      $(printf '\033[38;2;245;0;172m')
    "
  else
    FMT_RAINBOW="
      $(printf '\033[38;5;196m')
      $(printf '\033[38;5;202m')
      $(printf '\033[38;5;226m')
      $(printf '\033[38;5;082m')
      $(printf '\033[38;5;021m')
      $(printf '\033[38;5;093m')
      $(printf '\033[38;5;163m')
    "
  fi

  FMT_RED=$(printf '\033[31m')
  FMT_GREEN=$(printf '\033[32m')
  FMT_YELLOW=$(printf '\033[33m')
  FMT_BLUE=$(printf '\033[34m')
  FMT_BOLD=$(printf '\033[1m')
  FMT_RESET=$(printf '\033[0m')
}

print_ztnet() {
    printf '%s  %s______    %s___________   %s_____  %s___    %s_______  %s___________  %s\n'      $FMT_RAINBOW $FMT_RESET
    printf '%s %s("      "\%s("     _   ") %s(\"   \ %s|\"  \  %s/\"     "| %s("    _   ") %s\n'  $FMT_RAINBOW $FMT_RESET
    printf '%s  %s\___/   :)%s))__/  \\__/  %s|.\\\   %s\    | %s(: ______) %s )__/ \\__/  %s\n'  $FMT_RAINBOW $FMT_RESET
    printf '%s    %s/  ___/    %s\\_  /     %s|: \   %s \   |  %s\/   |      %s\\_  /        %s\n'  $FMT_RAINBOW $FMT_RESET
    printf '%s   %s//  \__     %s|.  |     %s|.  \  %s  \. | %s// ___)_     %s|.  |        %s\n'  $FMT_RAINBOW $FMT_RESET
    printf '%s  %s(:   / "\    %s\:  |     %s|    \   %s \ | %s(:      "|   %s\:  |        %s\n'  $FMT_RAINBOW $FMT_RESET
    printf '%s   %s\_______)    %s\__|     %s \___|\ %s___\) %s\_______)    %s \__|         %s\n'  $FMT_RAINBOW $FMT_RESET
    printf '\n\n'
}


setup_color
print_ztnet



##     ##    ###    ########  ####    ###    ########  ##       ########  ######  
##     ##   ## ##   ##     ##  ##    ## ##   ##     ## ##       ##       ##    ## 
##     ##  ##   ##  ##     ##  ##   ##   ##  ##     ## ##       ##       ##       
##     ## ##     ## ########   ##  ##     ## ########  ##       ######    ######  
 ##   ##  ######### ##   ##    ##  ######### ##     ## ##       ##             ## 
  ## ##   ##     ## ##    ##   ##  ##     ## ##     ## ##       ##       ##    ## 
   ###    ##     ## ##     ## #### ##     ## ########  ######## ########  ######  

APT_PROGRAMS=("git" "curl" "jq" "postgresql" "postgresql-contrib")
HOST_OS=$(( lsb_release -ds || cat /etc/*release || uname -om ) 2>/dev/null | head -n1)
INSTALL_NODE=false
SILENT_MODE=No
TEMP_INSTALL_DIR="/tmp/ztnet"
TEMP_REPO_DIR="$TEMP_INSTALL_DIR/repo"
TARGET_DIR="/opt/ztnet"
NODE_MAJOR=18
UNINSTALL=0

# Architecture and OS
ARCH=$(dpkg --print-architecture)
OS=$(grep -Eoi 'Debian|Ubuntu' /etc/issue)

# Colors
RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
NC=$(tput sgr0) # No Color

# We need to use openssl at the beginning of the script, we need to check if it is installed
if ! command -v openssl >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install openssl -y
fi

# Auto generate 10char postgres password
POSTGRES_PASSWORD=$(openssl rand -hex 10)
POSTGRES_USER="ztnet"
POSTGRES_DB="ztnet"
POSTGRES_SUPER_USER="postgres"

# File path to the .env file
TARGET_ENV_FILE="$TARGET_DIR/.env"
TEMP_ENV_FILE="$TEMP_REPO_DIR/.env"


# trap errors
exec 3>&1 4>&2
trap 'cleanup; exit' SIGINT

# Remove directories and then recreate the target directory
rm -rf "$TEMP_INSTALL_DIR" "$TARGET_DIR/.next" "$TARGET_DIR/prisma" "$TARGET_DIR/src"
mkdir -p "$TARGET_DIR"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Create a temporary directory for the installation
mkdir -p "$TEMP_INSTALL_DIR"
# Change directory to the temporary installation directory
cd "$TEMP_INSTALL_DIR"

# Function to ask a Yes/No question
ask_question() {
    local question=$1
    local default_answer=$2
    local varname=$3

    # Display the question with a check mark
    echo -ne "\033[32m❔\033[0m${YELLOW} $question (Yes/No) [Default: $default_answer]: ${NC}"
    read -r reply < /dev/tty

    # If no response is given, use the default answer
    if [[ -z "$reply" ]]; then
        reply=$default_answer
        tput cuu1
        tput cuf $((${#question} + ${#default_answer} + 26))
        echo -n "$reply"
        echo 
    fi

    while true; do
        case "$reply" in
            [Yy]*)
                eval "$varname='Yes'"
                break
                ;;
            [Nn]* | "")
                eval "$varname='No'"
                break
                ;;
            *) 
                echo -n "Invalid response. Please answer Yes or No: "
                read -r reply
                ;;
        esac
    done
}

ask_string() {
    local question=$1
    local default_value=$2
    local varname=$3

    # Display the question with a colored checkmark and the default value
    echo -ne "\033[32m❔\033[0m${YELLOW} $question [Default: $default_value]:${NC}"
    read -r ask_string < /dev/tty
  
    # If the user did not enter a value, use and display the default
    if [ -z "$ask_string" ]; then
        ask_string=$default_value
        # Move cursor back to the start of the line
        tput cuu1
        tput cuf $((${#question} + ${#default_value} + 17))
        echo -n "$ask_string"
        echo    # Add a newline
    fi

    eval "$varname='$ask_string'"
}


silent() {
    local output
    local status
    local command="$@"
    
    if [ "$SILENT_MODE" = "Yes" ]; then
        output="$($command >/dev/null 2>&1)"
        status=$?
      if [ $status -ne 0 ]; then
          # An error occurred
          failure $BASH_LINENO "$command" "$status" "$output"
      fi
    fi
}


verbose() {
    local output
    local status
    local command="$@"
    $command 2>&1
    status=$?
    if [ $status -ne 0 ]; then
        # An error occurred
        failure $BASH_LINENO "$command" "$status" "$output"
    fi
}

# A function to set or update an environment variable in .env file
set_env_temp_var() {
  local key="$1"
  local value="$2"

  # Check if $TEMP_ENV_FILE exists, create it if it doesn't
  if [[ ! -f "$TEMP_ENV_FILE" ]]; then
    touch "$TEMP_ENV_FILE"
  fi

  if grep -qE "^$key=" "$TEMP_ENV_FILE" ; then
    # If key exists, update it
    sed -i "s|^$key=.*|$key=$value|" "$TEMP_ENV_FILE"
  else
    # If key doesn't exist, append it
    echo "$key=$value" >> "$TEMP_ENV_FILE"
  fi
}

set_env_target_var() {
  local key="$1"
  local value="$2"

  # Check if $TARGET_ENV_FILE exists, create it if it doesn't
  if [[ ! -f "$TARGET_ENV_FILE" ]]; then
    touch "$TARGET_ENV_FILE"
  fi

  if grep -qE "^$key=" "$TARGET_ENV_FILE" ; then
    # If key exists, update it
    sed -i "s|^$key=.*|$key=$value|" "$TARGET_ENV_FILE"
  else
    # If key doesn't exist, append it
    echo "$key=$value" >> "$TARGET_ENV_FILE"
  fi
}
# Global variable to keep track of the current ongoing task
CURRENT_TASK=""
print_status() {
    local message=$1

    # If there is an ongoing task, mark it as complete with a green checkmark
    if [ ! -z "$CURRENT_TASK" ]; then
        printf "\r\033[K ${GREEN}[✔]${NC} $CURRENT_TASK\n"
    fi

    # Print the new ongoing task with a simple dash
    printf "\r\033[K [-]  $message"
    CURRENT_TASK="$message"
}


# Check if the script is run as root (sudo)
if [[ $EUID -ne 0 ]]; then
  print_status "\nThis script must be run as root (sudo). Exiting.\n"
  exit 1
fi

########    ###    #### ##       ##     ## ########  ######## 
##         ## ##    ##  ##       ##     ## ##     ## ##       
##        ##   ##   ##  ##       ##     ## ##     ## ##       
######   ##     ##  ##  ##       ##     ## ########  ######   
##       #########  ##  ##       ##     ## ##   ##   ##       
##       ##     ##  ##  ##       ##     ## ##    ##  ##       
##       ##     ## #### ########  #######  ##     ## ######## 


function failure() {
  cleanup

  local _bash_lineno=$1
  local _last_command=$2
  local _exitcode=$3
  local _output=$4

  local uname=$(uname -a | sed -e 's/"//g')

  printf "\n${RED}An error occurred! ${NC}\n" >&2

  # Check if jq is installed
  if command -v jq >/dev/null 2>&1; then
      # If jq is installed, use it to create JSON error report
      jsonError=$(jq -n --arg kernel "$uname" \
          --arg runner "ztnet standalone" \
          --arg arch "$ARCH" \
          --arg os "$HOST_OS" \
          --arg command "$_last_command" \
          --arg exitcode "$_exitcode" \
          --arg output "$_output" \
          --arg timestamp "$(date +"%d-%m-%Y/%M:%S")" \
          --arg lineno "$_bash_lineno" \
          '{runner: $runner, kernel: $kernel, command: $command, output: $output, exitcode: $exitcode, lineno:$lineno, arch: $arch, os: $os, timestamp: $timestamp}')
  else
      # Manually create JSON string
      jsonError="{\"kernel\": \"$uname\", \"runner\": \"ztnet standalone\", \"arch\": \"$ARCH\", \"os\": \"$HOST_OS\", \"command\": \"$_last_command\", \"output\": \"$_output\", \"exitcode\": \"$_exitcode\", \"timestamp\": \"$(date +"%d-%m-%Y/%M:%S")\", \"lineno\": \"$_bash_lineno\"}"
      # Replace newlines in output with \n to make it a valid JSON string
      jsonError=$(echo $jsonError | sed ':a;N;$!ba;s/\n/\\n/g')
  fi

  echo -e "\n${RED}Error report:${NC}\n$jsonError\n"

  echo -e "\nDo you want to send the error report to ztnet.network admin for application improvements?"
  echo -e "Only the above error message will be sent! [Default Yes]"
  sleep 0.1
  ask_string "Yes / No ==> " "Yes" SEND_REPORT

  if [ -z "$SEND_REPORT" ]; then
      SEND_REPORT="yes"
  fi

  finish="-1"
  while [ "$finish" = '-1' ]
  do
    finish="1"
    case $SEND_REPORT in
      y | Y | yes | YES | Yes) 
        print_status ">>> Generating Report..."
        print_status ">>> Transmitting..."
        curl --insecure --max-time 10 \
        -d "$jsonError" \
        -H 'Content-Type: application/json' \
        -X POST "http://install.ztnet.network/post/error"
        ;;
      n | N | no | NO | No ) 
        printf "Exiting! Please create new issue at https://github.com/sinamics/ztnet/issues/new/choose with the above information\n"
        exit 1 
        ;;
      *) finish="-1";
        ask_string "Invalid response -- please reenter [yes/no]: " "Yes" SEND_REPORT >&2;        
    esac
  done
  exit ${_code}
}

 ######  ##       ########    ###    ##    ## ##     ## ########  
##    ## ##       ##         ## ##   ###   ## ##     ## ##     ## 
##       ##       ##        ##   ##  ####  ## ##     ## ##     ## 
##       ##       ######   ##     ## ## ## ## ##     ## ########  
##       ##       ##       ######### ##  #### ##     ## ##        
##    ## ##       ##       ##     ## ##   ### ##     ## ##        
 ######  ######## ######## ##     ## ##    ##  #######  ##        

function cleanup() {
  printf "\n\nCleaning up...\n"
  # Before the script exits, stop the spinner if it's running
  if [ "$SILENT_MODE" = "Yes" ]; then
      stop_spinner "$SPINNER_PID"
  fi
  rm -rf "$TEMP_INSTALL_DIR"
  # Show the cursor before exiting
  tput cnorm
}



 ######  ########  #### ##    ## ##    ## ######## ########  
##    ## ##     ##  ##  ###   ## ###   ## ##       ##     ## 
##       ##     ##  ##  ####  ## ####  ## ##       ##     ## 
 ######  ########   ##  ## ## ## ## ## ## ######   ########  
      ## ##         ##  ##  #### ##  #### ##       ##   ##   
##    ## ##         ##  ##   ### ##   ### ##       ##    ##  
 ######  ##        #### ##    ## ##    ## ######## ##     ## 
                                                             
start_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\\'

    tput civis # Hide cursor
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf "\r [\033[34m%c\033[0m]  " "$spinstr"  # Spinner updates in place
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    printf "\r\033[K"  # Clear the spinner before printing the next status
}

stop_spinner() {
    kill "$1" 2>/dev/null
    exec 3>&- # Close file descriptor
    print_status "Operation completed."
}

# Detect local IP address
local_ip=$(hostname -I | awk '{print $1}')

# Function to check if a PostgreSQL user exists
check_user_exists() {
    # Run a query to check if the user exists and return the result
    result=$(sudo -u $POSTGRES_SUPER_USER psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'")
    if [ "$result" == "1" ]; then
        return 0
    else
        return 1
    fi
}

is_package_installed() {
    dpkg -l | grep "^ii" | grep -w "$1" > /dev/null
    return $?
}

# Function to check if user exists with read/write permissions
ztnet_postgres_user_permissions() {
    # if postgres has not been installed yet, return 1
    if ! command_exists psql; then
      return 1
    fi
    result=$(sudo -u "$POSTGRES_SUPER_USER" psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$POSTGRES_USER';")
    if [ "$result" == "1" ]; then
        print_status "User exists with required permissions."
        return 0
    else
        print_status "User does not exist or does not have the required permissions."
        return 1
    fi
}


# Check if the OS is Ubuntu
if [[ $OS == "Ubuntu" ]]; then
  print_status "Running script for Ubuntu."

  # stop ubuntu pop-up daemons
  conf_file="/etc/needrestart/needrestart.conf"
  if [[ -f "$conf_file" ]]; then
    # Perform the sed operation and check for success
    if sed -i "/#\$nrconf{restart} = 'i';/s/.*/\$nrconf{restart} = 'a';/" "$conf_file"; then
      print_status "Disabled pop-up window for needrestart."
    fi
  fi
fi


ARCH="$(uname -m)"
case "$ARCH" in
    "x86_64")
        ARCH="amd64"
        ;;
    "aarch64")
        ARCH="arm64"
        ;;
    *)
        print_status ">>> Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

 ######   ######## ########  #######  ########  ########  ######  
##    ##  ##          ##    ##     ## ##     ##    ##    ##    ## 
##        ##          ##    ##     ## ##     ##    ##    ##       
##   #### ######      ##    ##     ## ########     ##     ######  
##    ##  ##          ##    ##     ## ##           ##          ## 
##    ##  ##          ##    ##     ## ##           ##    ##    ## 
 ######   ########    ##     #######  ##           ##     ######  

while getopts v:b:su option 
do 
 case "${option}" 
 in 
 v) CUSTOM_VERSION=${OPTARG};;
 b) BRANCH=${OPTARG};;
 s) SILENT_MODE=Yes;;
 u) UNINSTALL=1;;
 esac 
done

if [[ "$(lsb_release -is)" != "Debian" && "$(lsb_release -is)" != "Ubuntu" ]]; then
  printf "\nThis script is only for Debian and Ubuntu. Exiting.\n"
  exit 1
fi



##     ## ##    ## #### ##    ##  ######  ########    ###    ##       ##       
##     ## ###   ##  ##  ###   ## ##    ##    ##      ## ##   ##       ##       
##     ## ####  ##  ##  ####  ## ##          ##     ##   ##  ##       ##       
##     ## ## ## ##  ##  ## ## ##  ######     ##    ##     ## ##       ##       
##     ## ##  ####  ##  ##  ####       ##    ##    ######### ##       ##       
##     ## ##   ###  ##  ##   ### ##    ##    ##    ##     ## ##       ##       
 #######  ##    ## #### ##    ##  ######     ##    ##     ## ######## ######## 

# uninstall if UNINSTALL=1
if [ "$UNINSTALL" = 1 ]; then
  UNINSTALL_ZTNET=No

  printf "\n\n${YELLOW}ZTNET uninstallation script.${NC}\n"
  printf "This script will perform the following actions:\n"
  printf "  1. Stop the ZTnet service.\n"
  printf "  2. Remove the ZTnet systemd service.\n"
  printf "  3. Remove the ZTnet directory.\n"
  printf "  4. Remove Zerotier-one package \n\n"
  printf "NOTE! Postgres, Git and Node.js will not be removed.\n\n"

  ask_question "Do you want to uninstall ZTnet?" No UNINSTALL_ZTNET
  
  if [ "$UNINSTALL_ZTNET" = "No" ]; then
    exit 1
  fi
  
  print_status "Uninstalling ZTnet..."

  # List of packages to check and remove
  packages=("zerotier-one")

  # check if ztnet is running
  if systemctl is-active --quiet ztnet; then
    print_status "Stopping ZTnet service..."
    sudo systemctl stop ztnet
  fi

  # Remove a package if it is installed
  remove_package_if_installed() {
      if is_package_installed "$1"; then
          echo "Removing $1..."
          sudo apt --purge remove "$1" -y
      else
          echo "Package $1 is not installed."
      fi
  }

  # Iterate over the list and remove each package if installed
  for package in "${packages[@]}"; do
      remove_package_if_installed "$package" | true
  done

  # Stop the PostgreSQL service
  print_status "Stopping PostgreSQL service..."
  sudo systemctl stop postgresql > /dev/null 2>&1

  # Clean up remaining dependencies
  print_status "Cleaning up remaining dependencies..."
  sudo apt-get autoremove -y > /dev/null 2>&1
  sudo apt-get autoclean -y > /dev/null 2>&1

  # remove ztnet  
  print_status "Removing ZTnet directory..."
  sudo rm -rf /opt/ztnet > /dev/null 2>&1

  print_status "Removing ZTnet systemd service..."
  sudo rm /etc/systemd/system/ztnet.service > /dev/null 2>&1
  
  # reload deamon
  print_status "Reloading systemd daemon..."
  sudo systemctl daemon-reload > /dev/null 2>&1

  printf "\n\n"
  printf "ZTnet has been completely removed.\n"
  exit 1
fi


##      ## ######## ##        ######   #######  ##     ## ########    #### ##    ## ########  #######  
##  ##  ## ##       ##       ##    ## ##     ## ###   ### ##           ##  ###   ## ##       ##     ## 
##  ##  ## ##       ##       ##       ##     ## #### #### ##           ##  ####  ## ##       ##     ## 
##  ##  ## ######   ##       ##       ##     ## ## ### ## ######       ##  ## ## ## ######   ##     ## 
##  ##  ## ##       ##       ##       ##     ## ##     ## ##           ##  ##  #### ##       ##     ## 
##  ##  ## ##       ##       ##    ## ##     ## ##     ## ##           ##  ##   ### ##       ##     ## 
 ###  ###  ######## ########  ######   #######  ##     ## ########    #### ##    ## ##        #######  

# Show info text to user
printf "\n\n${YELLOW}ZTNET installation script.${NC}\n"
printf "This script will perform the following actions:\n"
printf "  1. Install PostgreSQL if it's not already present.\n"
printf "  2. Ensure Node.js version ${NODE_MAJOR} is installed.\n"
printf "  3. Install Zerotier if it's missing.\n"
printf "  4. Clone the ZTnet repository into the /tmp folder and build artifacts from the latest tag.\n"
printf "  5. Transfer the artifacts to the ${YELLOW}${TARGET_DIR}${NC} directory.\n\n"

# Ask the user about the server IP with the default as the current IP
if [ ! -f "$TARGET_ENV_FILE" ]; then
  ask_string "Enter the ZTnet server IP address or domain name. Press Enter to use the default." "$local_ip" input_ip
fi

# Attempt to connect to PostgreSQL and check if 'postgres' user exists
if ! command_exists psql; then
    ask_string "Set a custom password for the PostgreSQL user 'ztnet', or use default" "$POSTGRES_PASSWORD" POSTGRES_PASSWORD
fi

ask_question "Use silent (non-verbose) installation with minimal output?" Yes SILENT_MODE
printf "\n"
print_status "Starting installation..."


# Set STD based on silent mode
if [ "$SILENT_MODE" = "Yes" ]; then
    STD="silent"

    # Start a dummy background process
    sleep 86400 & # Sleep for a long time (e.g., one day)
    SPINNER_PID=$!

    # Start the spinner
    start_spinner "$SPINNER_PID" &
else
    STD="verbose"
fi

   ###    ########  ######## 
  ## ##   ##     ##    ##    
 ##   ##  ##     ##    ##    
##     ## ########     ##    
######### ##           ##    
##     ## ##           ##    
##     ## ##           ##    

print_status "Updating apt..."

# update apt
$STD sudo apt update

install_apt_packages() {
  # Install required packages
  for program in "${APT_PROGRAMS[@]}"; do
      if ! command_exists "$program"; then
          print_status "Installing $program..."
          $STD sudo apt install "$program" -y
      else
          print_status "$program is already installed."
      fi
  done
}

install_apt_packages

# Use the default local_ip if the user pressed Enter without typing anything
server_ip=${input_ip:-$local_ip}

# Check if the input already starts with http:// or https://
if [[ $server_ip != http://* && $server_ip != https://* ]]; then
    server_ip="http://${server_ip}"
fi

env_handler() {
  if [ -f "$TARGET_ENV_FILE" ]; then
      # Read the entire .env file into a variable
      env_content=$(<"$TARGET_ENV_FILE")

      # Function to extract value from env content
      extract_env_value() {
          echo "$env_content" | grep "^$1=" | cut -d '=' -f2- | tr -d '"'
      }

      # Use awk to extract the password from DATABASE_URL
      POSTGRES_PASSWORD=$(echo "$env_content" | grep 'DATABASE_URL=' | awk -F '[:@]' '{print $3}')

      # Use awk to extract the user from DATABASE_URL
      POSTGRES_USER=$(echo "$env_content" | grep 'DATABASE_URL=' | awk -F '[:@]' '{print $2}' | cut -d '/' -f3)
      
      # List of variables to extract
      env_vars=("NEXTAUTH_SECRET" "NEXT_PUBLIC_SITE_NAME" "NEXTAUTH_URL" "ZT_ADDR" "ZT_SECRET")

      for var in "${env_vars[@]}"; do
          declare -g "$var=$(extract_env_value "$var")"
      done
  else
      NEXTAUTH_SECRET=$(openssl rand -hex 32)
      NEXT_PUBLIC_SITE_NAME="ZTnet"
      NEXTAUTH_URL="${server_ip}:3000"
      ZT_ADDR=
      ZT_SECRET=
  fi
}

env_handler

########   #######   ######  ########  ######   ########  ########  ######  
##     ## ##     ## ##    ##    ##    ##    ##  ##     ## ##       ##    ## 
##     ## ##     ## ##          ##    ##        ##     ## ##       ##       
########  ##     ##  ######     ##    ##   #### ########  ######    ######  
##        ##     ##       ##    ##    ##    ##  ##   ##   ##             ## 
##        ##     ## ##    ##    ##    ##    ##  ##    ##  ##       ##    ## 
##         #######   ######     ##     ######   ##     ## ########  ######  


print_status "Checking PostgreSQL user permissions..."

setup_postgres() {
  # Main script execution
  if ! ztnet_postgres_user_permissions; then
      # print_status "$POSTGRES_USER user does not exist or does not have the required permissions. Creating user..."

      # Create user and grant permissions
      sudo -u "$POSTGRES_SUPER_USER" psql -c "CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';" > /dev/null 2>&1

      # Check if the database exists
      database_exists=$(sudo -u "$POSTGRES_SUPER_USER" psql -tAc "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB';")

      if [ "$database_exists" != "1" ]; then
          print_status "Database $POSTGRES_DB does not exist. Lets create it..."
          sudo -u "$POSTGRES_SUPER_USER" psql -c "CREATE DATABASE $POSTGRES_DB;" > /dev/null 2>&1
      fi

      # grant all privileges on database ztnet to ztnet;
      sudo -u "$POSTGRES_SUPER_USER" psql -c "GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;" > /dev/null 2>&1

      # Grant all privileges on the public schema
      sudo -u "$POSTGRES_SUPER_USER" psql -d "$POSTGRES_DB" -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $POSTGRES_USER;" > /dev/null 2>&1

      # Set the DATABASE_URL environment variable immediately
      DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB?schema=public"
      set_env_target_var "DATABASE_URL" "$DATABASE_URL"
      set_env_target_var "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"

      print_status "Postgres User $POSTGRES_USER created and granted permissions on database $POSTGRES_DB."
  fi
}

setup_postgres

##    ##  #######  ########  ########       ##  ######  
###   ## ##     ## ##     ## ##             ## ##    ## 
####  ## ##     ## ##     ## ##             ## ##       
## ## ## ##     ## ##     ## ######         ##  ######  
##  #### ##     ## ##     ## ##       ##    ##       ## 
##   ### ##     ## ##     ## ##       ##    ## ##    ## 
##    ##  #######  ########  ########  ######   ######  

setup_nodejs(){
  # Install Node.js if it's not installed or if installed version is not the number defined in 'NODE_MAJOR' variable
  if ! command_exists node || ! command_exists npm; then
    INSTALL_NODE=true
  else
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ $NODE_VERSION -lt $NODE_MAJOR ]; then
      INSTALL_NODE=true
    fi
  fi

  if [ "$INSTALL_NODE" = true ]; then
    print_status "Installing Node.js $NODE_MAJOR, this may take a while..."
    
    # remove if they already exist
    sudo rm -f /etc/apt/sources.list.d/nodesource.list
    sudo rm -f /etc/apt/keyrings/nodesource.gpg
    $STD sudo apt-get update > /dev/null 2>&1
    $STD sudo apt-get install -y ca-certificates curl gnupg > /dev/null 2>&1
    sudo mkdir -p /etc/apt/keyrings

    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_"$NODE_MAJOR".x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list > /dev/null 2>&1
    $STD sudo apt-get update
    $STD sudo apt-get install nodejs -y
      
    # Check and install npm if it's not installed
    if ! command_exists npm; then
      $STD sudo apt-get install npm -y
    fi
  fi
}

setup_nodejs

######## ######## ########   #######  ######## #### ######## ########  
     ##  ##       ##     ## ##     ##    ##     ##  ##       ##     ## 
    ##   ##       ##     ## ##     ##    ##     ##  ##       ##     ## 
   ##    ######   ########  ##     ##    ##     ##  ######   ########  
  ##     ##       ##   ##   ##     ##    ##     ##  ##       ##   ##   
 ##      ##       ##    ##  ##     ##    ##     ##  ##       ##    ##  
######## ######## ##     ##  #######     ##    #### ######## ##     ## 

setup_zerotier(){
  # Install ZeroTier
  if ! command_exists zerotier-cli; then
      print_status "Installing ZeroTier..."
      # curl https://install.zerotier.com | sudo bash
      # Download the script
      $STD curl https://install.zerotier.com -o $TEMP_INSTALL_DIR/zerotier.sh

      # Execute the script if it's safe
      $STD sudo bash $TEMP_INSTALL_DIR/zerotier.sh
  else
      print_status "ZeroTier is already installed."
  fi
}

setup_zerotier

######## ######## ##    ## ######## ######## 
     ##     ##    ###   ## ##          ##    
    ##      ##    ####  ## ##          ##    
   ##       ##    ## ## ## ######      ##    
  ##        ##    ##  #### ##          ##    
 ##         ##    ##   ### ##          ##    
########    ##    ##    ## ########    ##    

pull_checkout_ztnet(){
  # Change directory to the temporary installation directory
  # Setup Ztnet
  # Clone Ztnet repository into /opt folder
  if [[ ! -d "$TEMP_REPO_DIR/.git" ]]; then
    $STD git clone https://github.com/sinamics/ztnet.git $TEMP_REPO_DIR
    print_status "Cloned Ztnet repository."
  else
    print_status "$TEMP_REPO_DIR already exists. Updating the repository."
    $STD git pull origin main
  fi

  cd "$TEMP_REPO_DIR"

  if [[ -z "$BRANCH" ]]; then
    # If BRANCH is empty or not set, checkout the latest tag or a custom version
    git fetch --tags
    latestTag=$(git describe --tags $(git rev-list --tags --max-count=1))
    print_status "Checking out tag: ${CUSTOM_VERSION:-$latestTag}"
    $STD git checkout "${CUSTOM_VERSION:-$latestTag}"
  else
    # If BRANCH is not empty, checkout the specified branch
    print_status "Checking out branch: $BRANCH"
    $STD git checkout "$BRANCH"
  fi

  print_status "Installing dependencies..."
  $STD npm install
}

pull_checkout_ztnet

# Copy mkworld binary
cp "$TEMP_REPO_DIR/ztnodeid/build/linux_$ARCH/ztmkworld" /usr/local/bin/ztmkworld
NEXT_PUBLIC_APP_VERSION="${CUSTOM_VERSION:-$latestTag}"


######## ##    ## ##     ## 
##       ###   ## ##     ## 
##       ####  ## ##     ## 
######   ## ## ## ##     ## 
##       ##  ####  ##   ##  
##       ##   ###   ## ##   
######## ##    ##    ###    

# Set or update environment variables
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB?schema=public"
set_env_temp_var "DATABASE_URL" "$DATABASE_URL"
set_env_temp_var "ZT_ADDR" "$ZT_ADDR"
set_env_temp_var "NEXT_PUBLIC_SITE_NAME" "$NEXT_PUBLIC_SITE_NAME"
set_env_temp_var "NEXTAUTH_URL" "$NEXTAUTH_URL"
set_env_temp_var "NEXT_PUBLIC_APP_VERSION" "$NEXT_PUBLIC_APP_VERSION"
set_env_temp_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

print_status "Database migrations..."
# Populate PostgreSQL and build Next.js
$STD npx prisma migrate deploy
print_status "Seed Database..."
$STD npx prisma db seed
print_status "Building Ztnet artifacts... This may take a while."
$STD npm run build

print_status "Copying files to $TARGET_DIR..."
# Ensure the target directories exist
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/.next/standalone"
mkdir -p "$TARGET_DIR/prisma"

# Copy relevant files and directories
cp "$TEMP_REPO_DIR/next.config.mjs" "$TARGET_DIR/"
cp -r "$TEMP_REPO_DIR/public" "$TARGET_DIR/public"
cp "$TEMP_REPO_DIR/package.json" "$TARGET_DIR/package.json"

# Copy .next and prisma directories
cp -a "$TEMP_REPO_DIR/.next/standalone/." "$TARGET_DIR/"
cp -r "$TEMP_REPO_DIR/.next/static" "$TARGET_DIR/.next/static"
cp -r "$TEMP_REPO_DIR/prisma" "$TARGET_DIR/prisma"

print_status "Creating systemd service..."

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
$STD sudo systemctl daemon-reload
$STD sudo systemctl enable ztnet
$STD sudo systemctl restart ztnet

sleep 2

cleanup

# Note for the user regarding systemd service management
echo -e "NOTE!"
echo -e "- ZTnet is installed in ${GREEN}/opt/ztnet${NC}."
echo -e "- You can check the status of the service with ${YELLOW}systemctl status ztnet${NC}."
echo -e "- To stop the ZTnet service, use ${YELLOW}sudo systemctl stop ztnet${NC}."
echo -e "- If you do not want ZTnet to start on boot, you can disable it with ${YELLOW}sudo systemctl disable ztnet${NC}."
echo -e "- Environment variables can be changed in ${YELLOW}/opt/ztnet/.env${NC}."

echo -e "\n\nZTnet is waiting for you at: ${YELLOW}${server_ip}:3000${NC}\n\n"
#!TODO just for testing
# systemctl restart systemd-timesyncd.service