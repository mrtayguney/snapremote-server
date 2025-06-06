#!/bin/bash
set -e

REPO="mrtayguney/snapremote-server"
INSTALL_DIR="snapremote-server"
SERVICE_NAME="snapremote"

echo "📦 Checking latest SnapRemote release..."

# Get latest release tag
LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep tag_name | cut -d '"' -f4)
echo "🔖 Latest release: $LATEST_TAG"

# Download and extract release
TMP_ARCHIVE="snapremote.tar.gz"
TMP_EXTRACT="snapremote-extracted"

rm -rf "$TMP_EXTRACT" "$TMP_ARCHIVE"
curl -L "https://github.com/$REPO/archive/refs/tags/$LATEST_TAG.tar.gz" -o "$TMP_ARCHIVE"
mkdir "$TMP_EXTRACT"
tar -xzf "$TMP_ARCHIVE" -C "$TMP_EXTRACT" --strip-components=1
rm "$TMP_ARCHIVE"

# Preserve critical files
for item in ".env" "mainDb.json" "database.json" "files"; do
  if [ -e "$INSTALL_DIR/$item" ]; then
    echo "💾 Preserving $item"
    cp -r "$INSTALL_DIR/$item" "$TMP_EXTRACT/$item"
  fi
done

# Replace old with new
rm -rf "$INSTALL_DIR"
mv "$TMP_EXTRACT" "$INSTALL_DIR"

# Install dependencies
cd "$INSTALL_DIR"
npm install

# Restart service if running
if systemctl is-enabled --quiet "$SERVICE_NAME"; then
  echo "🔁 Restarting service: $SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
fi

echo "✅ SnapRemote updated to release $LATEST_TAG"
