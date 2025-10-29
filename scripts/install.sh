#!/bin/bash

# ImgPressor One-Line Installer
# Usage: curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash
# Or: wget -qO- https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash

set -e

REPO="josephjerryrhule/imgpressor"
SCRIPT_URL="https://raw.githubusercontent.com/$REPO/master/scripts/auto-deploy.sh"

echo "🚀 ImgPressor Quick Installer"
echo "============================="

# Download and run the full auto-deploy script
if command -v curl &> /dev/null; then
    curl -sSL "$SCRIPT_URL" | bash
elif command -v wget &> /dev/null; then
    wget -qO- "$SCRIPT_URL" | bash
else
    echo "❌ Error: Neither curl nor wget is available"
    echo "Please install curl or wget and try again"
    exit 1
fi