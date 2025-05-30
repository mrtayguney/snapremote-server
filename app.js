import express from 'express';
import cors from 'cors';
import path from "node:path";
import {fileURLToPath} from 'url';
import Channel from './channel.js';
import {JSONFilePreset} from 'lowdb/node'
import child_process from 'child_process';
import http from 'http';
import {Server} from 'socket.io';
import {v4 as uuidv4} from 'uuid';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import _ from 'lodash';
import multer from 'multer';
import fs from 'fs';
import {
    newPayload,
    argumentsFromApi,
    bedRequestResponse,
    internalServerErrorResponse,
    writeResponse,
    getGcodeProps
} from './octoHelper.js';


dotenv.config();

const app = express();
const channel = new Channel();
let isConnected = false;

const maxMemory = 1024 * 1024 * 300;
const upload = multer({limits: {fileSize: maxMemory}});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultData = {files: []}
const db = await JSONFilePreset('database.json', defaultData)
const mainDb = await JSONFilePreset('mainDb.json', {})

const PORT = process.env.PORT || 3000;
const WEBCAM_PATH = process.env.WEBCAM_PATH;

var ffmpeg = null;

let clients = [];

function ffmpegCommand() {
    if (WEBCAM_PATH) {

        ffmpeg = child_process.spawn("ffmpeg", [
            '-f', 'v4l2',
            '-framerate', '25',
            '-video_size', '854x480',
            '-i', '/dev/video0',
            '-f', 'mjpeg',
            '-q:v', '5',
            'pipe:1'
        ]);

        ffmpeg.on('error', function (err) {
            console.log(err);
            throw err;
        });

        ffmpeg.on('close', function (code) {
            console.log('ffmpeg exited with code ' + code);
        });

        ffmpeg.stderr.on('data', function (data) {
            // console.log('stderr: ' + data);
        });

        let buffer = Buffer.alloc(0);

        ffmpeg.stdout.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);

            const start = buffer.indexOf(Buffer.from([0xff, 0xd8])); // SOI
            const end = buffer.indexOf(Buffer.from([0xff, 0xd9]));   // EOI

            if (start !== -1 && end !== -1 && end > start) {
                const frame = buffer.slice(start, end + 2);
                buffer = buffer.slice(end + 2);

                // Broadcast frame to all clients
                clients.forEach((res) => {
                    res.write(`--frame\r\n`);
                    res.write(`Content-Type: image/jpeg\r\n`);
                    res.write(`Content-Length: ${frame.length}\r\n\r\n`);
                    res.write(frame);
                });
            }
        });

    }
}

app.use(express.json());
app.use(cors())

let httpServer = http.createServer();
const io = new Server(httpServer);

io.on('connection', async (socket) => {
    console.log('A user connected');

    const sockets = await io.fetchSockets();
    console.log(sockets.length);

    sockets.forEach((s) => {
        if (s.id !== socket.id)
            s.emit('canvasOff');

    })

    if (ffmpeg == null)
        ffmpegCommand();

    socket.on('message', (msg) => {
        switch (msg) {
            case 'client_event' :
                console.log("Client Events: " + msg);
                disconnect_client();
                break;
        }
    });

    socket.on('disconnect', async (socket) => {
        console.log("Disconnected from server");
        const sockets = await io.fetchSockets();
        console.log(sockets.length);
        if (ffmpeg != null && sockets.length === 0) {
            console.log("ffmpeg close");
            ffmpeg.stdin.end();
            ffmpeg.stderr.destroy();
            ffmpeg.stdout.destroy();
            ffmpeg.kill();
            ffmpeg = null;
        }
    });

    socket.on('forceDisconnect', function () {
        socket.disconnect();
    });
});

httpServer.listen(PORT, () => {
    console.log('listening on localhost: 3000');
})

app.use(express.static('src'))
app.use(cookieParser());

function authCheck(req, res, next) {
    const token = req.header("token");
    if (!token) {
        const status = {
            "Status": "FAILEDAUTH",
            "Response": JSON.stringify({})
        };
        res.send(status);
    } else {
        try {
            let jwtSecretKey = process.env.JWT_SECRET_KEY;
            const verified = jwt.verify(token, jwtSecretKey);

            if (verified)
                next();
            else {
                const status = {
                    "Status": "FAILEDAUTH",
                    "Response": JSON.stringify({})
                };
                res.send(status);
            }
        } catch (err) {
            const status = {
                "Status": "ERROR",
                "Response": JSON.stringify({})
            };
            res.send(status);
        }
    }

}

app.use(function (err, req, res, next) {
    console.log(err);
    if (isConnected)
        channel.connectionClose();
});

app.get('/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
    });

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

app.get('/', function (req, res) {
    const token = req.cookies.token;

    if (!isConnected && token)
        res.sendFile(__dirname + '/src/connect.html');
    else if (token)
        res.sendFile(__dirname + '/src/main.html');
    else if (mainDb.data["user_created"])
        res.sendFile(__dirname + '/src/login.html');
    else
        res.sendFile(__dirname + '/src/create-user.html');
});

app.post("/login", (request, response) => {
    let data = {
        auth: request.headers.authorization,
    }

    console.log("login")
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    const token = jwt.sign(data, jwtSecretKey, {noTimestamp: true});
    if (token === mainDb.data["user_key"]) {
        response.cookie("token", token, {maxAge: 30 * 24 * 60 * 60 * 1000});
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({token: token})
        };

        response.send(status);
    } else {
        const status = {
            "Status": "FAILED",
            "Response": ""
        };
        response.send(status);
    }
});

app.post("/createUser", (request, response) => {
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let username = request.body.username;
    let password = request.body.password;

    if (!username || !password) {
        const status = {
            "Status": "ERROR",
            "Response": ""
        };
        response.send(status);
    } else if (password.length < 6) {
        const status = {
            "Status": "ERROR",
            "Response": ""
        };
        response.send(status);
    }

    let auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64')

    let data = {
        auth: auth,
    }

    const token = jwt.sign(data, jwtSecretKey, {noTimestamp: true});

    response.cookie("token", token, {maxAge: 30 * 24 * 60 * 60 * 1000});

    mainDb.data["user_created"] = true;
    mainDb.data["user_key"] = token;
    mainDb.write()

    const status = {
        "Status": "OK",
        "Response": ""
    };
    response.send(status);
});

app.post("/logout", authCheck, (request, response) => {
    response.clearCookie("token");
    const status = {
        "Status": "OK"
    };
    response.send(status);
});

app.get("/getConnectionStatus", authCheck, (request, response, next) => {
    const status = {
        "Status": "OK",
        "Response": JSON.stringify({isConnected: isConnected})
    };
    response.send(status);
});

app.post("/connect", authCheck, (request, response) => {
    channel.connectionOpen(io).then(() => {
        isConnected = true;
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    }).finally(() => {

    }).catch((error) => {
        console.log(error);
    })

});

app.post("/disconnect", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    isConnected = false;
    channel.connectionClose().then(() => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    })

});

app.get("/subscribeNozzleInfo", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }

    channel.subscribeNozzleInfo(io).then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify(resp)
        };
        response.send(status);
    })
});

app.get("/subscribeHeatbedInfo", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.subscribeHeatbedInfo(io).then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify(resp)
        };
        response.send(status);
    })
});

app.post("/setEnclosureLight", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.setEnclosureLight(request.body.light).then((resp) => {
        const status = {
            "Status": "OK",
        };
        response.send(status);
    });
})

app.post("/setEnclosureFan", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.setEnclosureFan(request.body.fan).then((resp) => {
        const status = {
            "Status": "OK",
        };
        response.send(status);
    });
})

app.get("/subscribeEnclosureInfo", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.subscribeEnclosureInfo(io).then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify(resp)
        };
        response.send(status);
    })
});

app.get("/subscribePrintInfo", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.subscribeGetPrintCurrentLineNumber(db, io).then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify(resp)
        };
        response.send(status);
    })
});

app.post("/move", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.move(request.body).then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    })
});

app.post("/home", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.home().then((resp) => {
        const status = {
            "Status": "OK"
        };
        response.send(status);
    })
});

app.post("/stopPrint", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.stopPrint().then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    })
});

app.post("/pausePrint", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.pausePrint().then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    })
});

app.post("/resumePrint", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.resumePrint().then((resp) => {
        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    })
});

app.post("/setExtruderTemperature", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.setExtruderTemperature(request.body["index"], request.body["temp"]).then((resp) => {
        const status = {
            "Status": "OK"
        };
        response.send(status);
    })
});

app.post("/loadFilament", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.loadFilament(request.body["index"]).then((resp) => {
        const status = {
            "Status": "OK"
        };
        response.send(status);
    })
});

app.post("/unloadFilament", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.unloadFilament(request.body["index"]).then((resp) => {
        const status = {
            "Status": "OK"
        };
        response.send(status);
    })
});

app.post("/switchExtruder", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.switchExtruder(request.body["index"]).then((resp) => {
        const status = {
            "Status": "OK"
        };
        response.send(status);
    })
});

app.post("/setHotBedTemperature", authCheck, (request, response) => {
    if (!isConnected) {
        response.send({"Status": "Disconnected"});
        return;
    }
    channel.setHotBedTemperature(request.body["index"], request.body["temp"]).then((resp) => {
        const status = {
            "Status": "OK"
        };
        response.send(status);
    })
});

app.get("/api/version", (request, response) => {
    let resp = {'api': '0.1', 'server': '1.2.3', 'text': 'OctoPrint 1.2.3/Dummy'}
    response.send(JSON.stringify(resp));
});

app.post("/api/files/local", upload.single('file'), async (request, response) => {
    try {
        const file = request.file;
        if (!file) {
            return bedRequestResponse(response, 'No file uploaded');
        }


        const apiKey = request.headers['x-api-key'];
        if (apiKey && apiKey.length > 5) {
            argumentsFromApi(apiKey);
        }

        // Create payload object
        const payload = newPayload(file.buffer, file.originalname, file.size);

        const folderName = './files';
        try {
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName);
            }
        } catch (err) {
            console.error(err);
        }

        fs.writeFile('./files/' + file.originalname, file.buffer, async (err) => {
            if (err) {
                console.error(err);
            } else {
                const fileInfo = await getGcodeProps('./files/' + file.originalname);

                const fileData = {
                    id: uuidv4(),
                    name: file.originalname,
                    nozzle1_material: fileInfo["nozzle1_material"],
                    nozzle2_material: fileInfo["nozzle2_material"],
                    material_use: fileInfo["material_use"],
                    is_deleted: false,
                    upload_date: moment().unix(),
                    estimated_time: fileInfo["estimated_time"],
                    image: fileInfo["thumbnail"],
                    layer_number: fileInfo["layer_number"],
                    layer_changes: fileInfo["layer_changes"],
                    progress_layers: fileInfo["progress_layers"],
                }
                db.data.files.push(fileData)
                await db.write()

                if (isConnected && request.body["print"] === "true") {
                    await channel.uploadFile('./files/' + file.originalname, file.originalname);
                    channel.startPrint(file.originalname);
                }
            }


        });

        console.log(`Upload finished: ${file.originalname} [${payload.readableSize()}]`);
        writeResponse(response, 200, {done: true});


    } catch (err) {
        internalServerErrorResponse(response, err.message);
    }
});

app.get("/getFiles", authCheck, async (request, response) => {
    try {
        let {files} = db.data

        //db.data.files = []

        files = files.sort((a, b) => {
            if (a.upload_date < b.upload_date) {
                return 1;
            } else
                return -1;
        });

        const status = {
            "Status": "OK",
            "Response": JSON.stringify(files)
        };
        response.send(status);
    } catch (err) {
        // Ensures that the client will close when you finish/error
        console.log(err);
    }
})

app.get("/getFile", authCheck, async (request, response) => {
    try {
        let {files} = db.data
        let foundItem = files.find((item) => item.id === request.query.id)

        const status = {
            "Status": "OK",
            "Response": JSON.stringify(foundItem)
        };
        response.send(status);
    } catch (err) {
        // Ensures that the client will close when you finish/error
    }
})

app.post("/deleteFile", authCheck, async (request, response) => {
    try {
        let {files} = db.data

        let item = _.find(files, ['id', request.body.id]);

        fs.unlinkSync('./files/' + item.name);

        let removed = _.remove(files, function (item) {
            return item.id !== request.body.id;
        })

        db.data.files = removed;
        await db.write()

        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    } catch (err) {
        const status = {
            "Status": "FAILED",
            "Response": JSON.stringify({})
        };
        response.send(status);
    }
})

app.post("/printFile", authCheck, async (request, response) => {
    try {
        let {files} = db.data

        let item = _.find(files, ['id', request.body.id]);

        await channel.uploadFile('./files/' + item.name, item.name);
        channel.startPrint(item.name);

        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    } catch (err) {
        const status = {
            "Status": "FAILED",
            "Response": JSON.stringify({})
        };
        response.send(status);
    }
})

app.post("/setNotificationToken", async (request, response) => {
    try {
        if (request.body.notificationToken) {
            mainDb.data["notificationToken"] = request.body.notificationToken;
            mainDb.write()
        }


        const status = {
            "Status": "OK",
            "Response": JSON.stringify({})
        };
        response.send(status);
    } catch (err) {
        // Ensures that the client will close when you finish/error
        console.log(err);
    }
})

