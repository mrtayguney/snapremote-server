#!/bin/bash
set -e

REPO_URL="https://github.com/mrtayguney/snapremote-server.git"
INSTALL_DIR="snapremote-server"
SERVICE_NAME="snapremote"
TMP_DIR="snapremote-tmp"

echo "📦 Updating SnapRemote from main branch..."

# Clean previous temp clone
rm -rf "$TMP_DIR"
git clone --depth 1 "$REPO_URL" "$TMP_DIR"

# Preserve important files/folders
for item in ".env" "mainDb.json" "database.json" "files"; do
  if [ -e "$INSTALL_DIR/$item" ]; then
    echo "💾 Preserving $item"
    cp -r "$INSTALL_DIR/$item" "$TMP_DIR/$item"
  fi
done

# Replace old install with new
rm -rf "$INSTALL_DIR"
mv "$TMP_DIR" "$INSTALL_DIR"

# Install dependencies
cd "$INSTALL_DIR"
npm install

# Restart service if enabled
if systemctl is-enabled --quiet "$SERVICE_NAME"; then
  echo "🔁 Restarting service: $SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
fi

echo "✅ SnapRemote updated from main branch with preserved settings and data."
