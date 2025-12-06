#!/bin/sh

# Copyright (c) 2023-2024 sinamics
# Author: sinamics (Bernt Christian Egeland)
# License: GPL-3.0
# https://github.com/sinamics/ztnet/blob/main/LICENSE
#
# OS Detection and Router Script
# This script detects the operating system and runs the appropriate installer.

set -e

# Base URL for installer scripts (same server that served this script)
INSTALLER_BASE_URL="${ZTNET_INSTALLER_URL:-http://install.ztnet.network}"

# Detect OS
detect_os() {
    case "$(uname)" in
        "FreeBSD")
            echo "freebsd"
            ;;
        "Linux")
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                case "$ID" in
                    "debian"|"raspbian")
                        echo "debian"
                        ;;
                    "ubuntu")
                        echo "ubuntu"
                        ;;
                    *)
                        # Check for Debian-based systems
                        if [ -n "$ID_LIKE" ]; then
                            case "$ID_LIKE" in
                                *debian*|*ubuntu*)
                                    echo "debian"
                                    ;;
                                *)
                                    echo "unsupported"
                                    ;;
                            esac
                        else
                            echo "unsupported"
                        fi
                        ;;
                esac
            elif [ -f /etc/debian_version ]; then
                echo "debian"
            else
                echo "unsupported"
            fi
            ;;
        *)
            echo "unsupported"
            ;;
    esac
}

OS=$(detect_os)

case "$OS" in
    "debian"|"ubuntu")
        echo "Detected Debian/Ubuntu-based system. Running Debian installer..."
        curl -fsSL "$INSTALLER_BASE_URL/ztnet_debian" | bash -s -- "$@"
        ;;
    "freebsd")
        echo "Detected FreeBSD. Running FreeBSD installer..."
        curl -fsSL "$INSTALLER_BASE_URL/ztnet_freebsd" | sh -s -- "$@"
        ;;
    "unsupported")
        echo ""
        echo "ERROR: Unsupported operating system."
        echo ""
        echo "Currently supported operating systems:"
        echo "  - Debian"
        echo "  - Ubuntu"
        echo "  - FreeBSD"
        echo ""
        echo "For other systems, please install manually:"
        echo "  https://github.com/sinamics/ztnet#installation"
        echo ""
        exit 1
        ;;
esac
