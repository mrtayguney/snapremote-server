#!/bin/bash

#!/bin/bash
set -e

REPO="mrtayguney/snapremote-server"
INSTALL_DIR="snapremote-server"

echo "📦 Installing SnapRemote from latest GitHub release..."

# Get latest release tag from GitHub API
LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep tag_name | cut -d '"' -f4)

echo "🔖 Latest release: $LATEST_TAG"

# Download and extract
curl -L "https://github.com/$REPO/archive/refs/tags/$LATEST_TAG.tar.gz" -o snapremote.tar.gz
tar -xzf snapremote.tar.gz
rm snapremote.tar.gz

# Move extracted folder to target
mv "snapremote-server-$LATEST_TAG" "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "📦 Installing dependencies..."
npm install

# Ask if user wants to create a systemd service
read -r -p "🛠️  Do you want to run SnapRemote as a background service? (y/n): " setup_service < /dev/tty

if [[ "$setup_service" =~ ^[Yy]$ ]]; then
  echo "🔧 Creating systemd service..."
  CURRENT_DIR=$(pwd)
  sudo bash -c "cat > /etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=SnapRemote 3D Printer Server
After=network.target

[Service]
ExecStart=/usr/bin/node $CURRENT_DIR/app.js
WorkingDirectory=$CURRENT_DIR
Restart=always
User=pi
Environment=NODE_ENV=production
StandardOutput=inherit
StandardError=inherit

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reexec
  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl start "$SERVICE_NAME"

  echo "✅ Service '$SERVICE_NAME' installed and started."
else
  echo "⚠️ Skipped background service setup. You can run it manually with: node index.js"
fi

# Ask if user wants to set up .env
read -r -p "🛠️  Do you want to setup your .env file? (y/n): " setup_env < /dev/tty

if [[ "$setup_env" =~ ^[Yy]$ ]]; then
  if [ ! -f ".env" ]; then
    echo "📝 Let's create your .env file..."

    read -r -p "🔑 JWT_SECRET_KEY (e.g. from jwt.io): " jwt < /dev/tty
    read -r -p "🌐 PORT (e.g. 3000): " port < /dev/tty
    read -r -p "🧩 DEVICE_IP (Snapmaker printer's IP): " ip < /dev/tty

    # Detect webcam automatically
    default_webcam=$(ls /dev/video* 2>/dev/null | head -n 1)
    if [ -n "$default_webcam" ]; then
      echo "📷 Detected webcam at: $default_webcam"
    fi
    read -r -p "📷 WEBCAM_PATH (Press Enter to skip) [default: $default_webcam]: " webcam < /dev/tty

    # Use default if nothing typed
    if [ -z "$webcam" ] && [ -n "$default_webcam" ]; then
      webcam="$default_webcam"
    fi

    echo "✅ Writing .env file in $PWD..."
    cat > .env <<EOF
JWT_SECRET_KEY=${jwt}
PORT=${port}
DEVICE_IP=${ip}
DEVICE_PORT=8888
EOF

    if [ -n "$webcam" ]; then
      echo "WEBCAM_PATH=\"${webcam}\"" >> .env
    fi

    echo "✅ .env created at $PWD/.env"
  else
    echo "📄 .env already exists. Skipping creation."
  fi
else
  echo "⚠️ Skipped .env file setup."
fi

echo "✅ SnapRemote installed in $PWD"
