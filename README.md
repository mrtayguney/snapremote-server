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
JWT_SECRET_KEY=[YOUR_JWT_SECRET] //This key is for sign and verify your registered client to secure your connection with the server.
PORT=[CLIENT_PORT] //This is your server's port.
```
You can use https://jwtsecret.com/generate to generate yourself a JWT Secret and put it in your .env file.



