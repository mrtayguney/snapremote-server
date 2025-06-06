#!/bin/bash
set -e

REPO="mrtayguney/snapremote-server"
INSTALL_DIR="snapremote-server"
TMP_DIR="snapremote-tmp"
SERVICE_NAME="snapremote"

echo "📦 Checking latest SnapRemote release..."

# Get latest release tag
LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep tag_name | cut -d '"' -f4)
echo "🔖 Latest release: $LATEST_TAG"

# Download and extract latest release
rm -rf "$TMP_DIR"
curl -L "https://github.com/$REPO/archive/refs/tags/$LATEST_TAG.tar.gz" -o snapremote.tar.gz
tar -xzf snapremote.tar.gz
rm snapremote.tar.gz
mv "$REPO-$LATEST_TAG" "$TMP_DIR"

# Preserve user files
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

echo "✅ SnapRemote updated to release $LATEST_TAG with preserved settings and data."
