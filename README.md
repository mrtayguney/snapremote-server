# SnapRemote

## 🛠️ About the Project

**SnapRemote** is a Node.js server that creates an interface to connect Snapmaker devices. It also serves a web client to control your device remotely. You can run this server on a Raspberry Pi within the same local network as your Snapmaker.

> ## ⚠️ IMPORTANT NOTE
> SnapRemote currently supports only the **Snapmaker Artisan**, and only the **3D Printing** functionality has been tested.  
> **Laser** and **CNC** features are not yet supported. Do not use this server for laser or CNC operations.

---

## ⚙️ Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mrtayguney/snapremote-server.git
cd snapremote-server
```

### 2. Install the Packages

```bash
npm install
```

### 3. Create Environment Variables

```bash
touch .env
sudo nano .env
```

#### Sample `.env` file

```env
JWT_SECRET_KEY=[YOUR_JWT_SECRET]   # For verifying registered clients
PORT=[CLIENT_PORT]                 # Port the server runs on
DEVICE_IP=[SNAPMAKER_DEVICE_IP]    # IP address of your Snapmaker
DEVICE_PORT=8888                   # Default Snapmaker TCP port (do not change)
WEBCAM_PATH="/dev/video0"     # If you have webcam connected to your server, you can enter the path of it to stream video
```

Generate a secret at: [https://jwtsecret.com/generate](https://jwtsecret.com/generate)

### 4. Run Your Server

```bash
node app.js
```

or with PM2:

```bash
pm2 start app.js
```

> PM2 is a production process manager for Node.js apps. It keeps your apps running and simplifies deployment.  
> [Learn more about PM2](https://github.com/Unitech/pm2)

---

### Initial Connection

Once your server starts without errors, visit:

```
http://[YOUR_SERVER_IP]:[YOUR_PORT]
```

Follow the prompts to create your user account.

> ⚠️ Only a single user is supported at the moment.

---

### Server Device Connection

The server will **not** auto-connect to your Snapmaker. If the connection is not established, the UI will show a "Connect To Device" page.

Ensure no other app (e.g., Luban) is using the Snapmaker, then click **Connect** to proceed to the control panel.

---

## 📁 Uploading Files

> ⚠️ IMPORTANT NOTE  
> The Snapmaker SACP protocol is missing some metadata (e.g., progress, layer lines).  
> The server extracts this from G-code files. For best results, use **OrcaSlicer**.  
> G-code files from other slicers may not function correctly.



## 🧩 OrcaSlicer Configuration

Click the gear icon next to your printer in OrcaSlicer:

![orca connection](https://github.com/mrtayguney/snapremote-server/blob/main/src/readme/orca-connect.png?raw=true)

In the modal, choose:

- **Host Type**: Octo/Klipper
- **Hostname/IP**: `http://[YOUR_SERVER_IP]:[YOUR_PORT]`

Then click **Test**, and if successful, click **OK**.

![orca connection configuration](https://github.com/mrtayguney/snapremote-server/blob/main/src/readme/orca-connect2.png?raw=true)

---

## 🧪 OrcaSlicer Post-Processing Script

To include full print data (e.g., layer count) in your G-code:

### Download Script

[convert.py](https://raw.githubusercontent.com/mrtayguney/snapremote-server/refs/heads/main/post_process/convert.py)

### Configure in OrcaSlicer

Go to `Preset Settings > Others > Post-processing Scripts`, and add:

#### macOS

```bash
/path/to/python3 /path/to/convert.py
```

#### Windows

```bash
C:\Program Files\Python39\python.exe D:\path\to\convert.py
```

![orca post config](https://github.com/mrtayguney/snapremote-server/blob/main/src/readme/post.png?raw=true)
![orca post config 2](https://github.com/mrtayguney/snapremote-server/blob/main/src/readme/post2.png?raw=true)

---

>## ⚠️ Be Aware
>This server is built using the Snapmaker SACP protocol. All functionality has been tested on my device.  
>If your device or firmware differs, unexpected results may occur. Use with caution.
