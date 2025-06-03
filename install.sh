#!/bin/bash

REPO_URL="https://github.com/mrtayguney/snapremote-server.git"
INSTALL_DIR="snapremote-server"
SERVICE_NAME="snapremote"

echo "📦 Installing SnapRemote..."

# Clone the repo if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  echo "📁 Repo already cloned at $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
  echo "🔧 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# Install npm packages
echo "📦 Installing npm packages..."
npm install || echo

# Ask if user wants to create a systemd service
set -x
echo "🛠️  Do you want to run SnapRemote as a background service? (y/n): "
read -r setup_service < /dev/tty
if [[ "$setup_service" =~ ^[Yy]$ ]]; then
  SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
  CURRENT_DIR="$PWD"

  echo "🔧 Creating systemd service..."
  sudo bash -c "cat > /etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=SnapRemote 3D Printer Server
After=network.target

[Service]
ExecStart=/usr/bin/node \"$PWD/index.js\"
WorkingDirectory=\"$PWD\"
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
read -r -p "🛠️  Do you want to setup your .env file? (y/n): " setup_env
if [[ "$setup_env" =~ ^[Yy]$ ]]; then
  if [ ! -f ".env" ]; then
    echo "📝 Let's create your .env file..."

    read -r -p "🔑 JWT_SECRET_KEY (e.g. from jwt.io): " jwt
    read -r -p "🌐 PORT (e.g. 3000): " port
    read -r -p "🧩 DEVICE_IP (Snapmaker printer's IP): " ip

    # Detect webcam automatically
    default_webcam=$(ls /dev/video* 2>/dev/null | head -n 1)
    if [ -n "$default_webcam" ]; then
      echo "📷 Detected webcam at: $default_webcam"
    fi
    read -r -p "📷 WEBCAM_PATH (Press Enter to skip) [default: $default_webcam]: " webcam

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
