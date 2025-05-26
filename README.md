# About The Project

SnapRemote is a node.js server that create an interface to connect Snapmaker devices. It also serves a web client to
control device. You can run this server on a Raspberry PI which is in the same network with the Snapmaker device.


> ## IMPORTANT NOTE
> It only works with Snapmaker Artisan right now. Only the 3D Printing Functions are tested. Other functions will be
> developed. So don't use this server to control Laser or CNC functions.

## SETUP

### Get the code to your server;

```
git clone https://github.com/mrtayguney/snapremote-server.git
```

### Install the packages;

```
cd snapremote-server
npm install
```

### Create environment parameters;

```
touch .env
sudo nano .env
```

### Sample .env file;

```
JWT_SECRET_KEY=[YOUR_JWT_SECRET] #This key is for sign and verify your registered client to secure your connection with the server.
PORT=[CLIENT_PORT] #This is your server's port.
DEVICE_IP=[SNAPMAKER_DEVICE_IP] #The ip address of the Snapmaker Device.
DEVICE_PORT=8888 #Snapmaker Device's default TCP port. Don't change it!
```

You can use https://jwtsecret.com/generate to generate yourself a JWT Secret and put it in your .env file.

### Run your server;

```
node app.js
```

or

```
pm2 start app.js
```

PM2 is a production process manager for Node.js/Bun applications with a built-in load balancer. It allows you to keep
applications alive forever, to reload them without downtime and to facilitate common system admin tasks.

More info and install instructions; https://github.com/Unitech/pm2

### Initial connection;

If you got no error when running your server, go to **http://[YOUR_SERVER_IP]:[YOUR_PORT]** to create your user.

> #### IMPORTANT NOTE
> Only one user is supported right now.

### Server Device Connection;

The server is not going to connect the Snapmaker Device by itself. You see a screen titled 'Connect To Device' when the
server is disconnected from the Snapmaker device. If no other device (ex. your Luban software or another server) is
connected you can
click connect. The server is going to connect to the Snapmaker device and you redirected to device control page.

## UPLOADING FILES

> #### IMPORTANT NOTE
> Because the Snapmaker SACP protocol has missing some data the server fetch some data from the gcode files like print
> progress, total layer lines and etc.. So all the system is optimized for using with the OrcaSlicer. The gcode files
> exported from the other slicers may not work correctly.

### Orca Slicer Configuration
In OrcaSlicer you click symbol next to your printer;

![orca connection](https://raw.githubusercontent.com/mrtayguney/snapremote-server/refs/heads/main/src/readme/orca-connect.png "Logo Title Text 1")

In the modal opened, Select 'Octo/Klipper' as Host Type and fill Hostname IP with your server address, like;
>**http://[YOUR_SERVER_IP]:[YOUR_PORT]**

Then you can click Test to test your connection. If it is ok, you can click OK button bellow to finish configuration.

![orca connection configuration](https://raw.githubusercontent.com/mrtayguney/snapremote-server/refs/heads/main/src/readme/orca-connect2.png "Logo Title Text 1")


> ## BE AWARE
> This server is based on Snapmaker SACP protocol. All of the functions implemented are tested in my device. If you have
> modifications or any other changes there may be unexpected results. So use it with caution.
