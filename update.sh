#!/bin/bash
set -e

REPO_URL="https://github.com/mrtayguney/snapremote-server.git"
INSTALL_DIR="snapremote-server"
SERVICE_NAME="snapremote"

echo "📦 Updating SnapRemote from main branch..."

TMP_DIR="snapremote-tmp"

# Clean up any previous temp
rm -rf "$TMP_DIR"
git clone --depth 1 "$REPO_URL" "$TMP_DIR"

# Preserve .env if exists
if [ -f "$INSTALL_DIR/.env" ]; then
  cp "$INSTALL_DIR/.env" "$TMP_DIR/.env"
fi

# Replace old directory
rm -rf "$INSTALL_DIR"
mv "$TMP_DIR" "$INSTALL_DIR"

# Install dependencies
cd "$INSTALL_DIR"
npm install

# Restart service if active
if systemctl is-enabled --quiet "$SERVICE_NAME"; then
  echo "🔁 Restarting service: $SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
fi

echo "✅ SnapRemote updated from main branch."
