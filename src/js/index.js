const apiAddress = "/";
let socket = io(null, {transports: ['websocket']});

function menu() {
    return {
        logout() {
            if (confirm("Are you sure you want to logout?")) {
                fetch(apiAddress + "logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token")
                    },
                    body: JSON.stringify({}),
                }).then(response => response.json())
                    .then(json => {
                        if (json.Status === "OK") {
                            window.location.reload();
                        }
                    })
            }
        },
        disconnect() {
            if (confirm("Are you sure you want to disconnect server from the device?")) {
                fetch(apiAddress + "disconnect", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token")
                    },
                    body: JSON.stringify({}),
                }).then(response => response.json())
                    .then(json => {
                        if (json.Status === "OK") {

                        }
                    })
                window.location.reload();
            }
        }
    }
}

function printInfo() {
    return {
        time_remaining: 0,
        progress: 0,
        current_layer: 0,
        total_layer: 0,
        interval: null,
        machine_status: "idle",
        file_name: "",
        image: "",
        finish_time: "",
        init() {
            this.$watch("machine_status", value => Alpine.store('machine_status').set(value));
            this.fetchData();

            socket.on('deviceError', (error) => {
                //console.log("device");
                //console.log(error);
            });

            socket.on('serialport:read', (log) => {
                // if (log.data.includes("M73")) {
                //     this.progress = log.data.split("M73")[1].trim().split(" ")[0].replace("P", "");
                //     let timeRemaining = log.data.split("M73")[1].trim().split(" ")[1].replace("R", "");
                //     this.time_remaining = moment.utc(timeRemaining * 60 * 1000).format('HH [hours] mm [minutes] ss [seconds]').replace('00 hours ', '').replace('00 minutes ', '').replace('00 seconds', '')
                //     let finishDateTime = moment.utc().add(timeRemaining * 60 * 1000)
                //     if (finishDateTime.diff(moment.utc(), 'days') > 0)
                //         this.finish_time = finishDateTime.local().format("dddd DD MMM, HH:mm");
                //     else
                //         this.finish_time = finishDateTime.local().format("HH:mm");
                // }
            });

            socket.on('connection:stopGcode', (error) => {
                //console.log("stop");
                //console.log(error);
            });

            socket.on('connection:pauseGcode', (error) => {
                //console.log("pause");
                //console.log(error);
            });

        },
        fetchData() {
            fetch(apiAddress + "subscribePrintInfo", {
                headers: {
                    'token': getCookie("token")
                }
            })
                .then(response => response.json())
                .then(json => {
                    if (json.Status === "OK") {
                        let callback = (data) => {
                            let jsonInfo = data;
                            this.machine_status = jsonInfo.machineStatus;
                            this.file_name = jsonInfo.fileName;
                            this.time_remaining = moment.utc(jsonInfo.timeRemaining * 60 * 1000).format('HH [hours] mm [minutes] ss [seconds]').replace('00 hours ', '').replace('00 minutes ', '').replace('00 seconds', '');
                            this.progress = jsonInfo.progress;
                            this.current_layer = jsonInfo.currentLayer;
                            this.total_layer = jsonInfo.totalLayer;
                            this.image = jsonInfo.image;
                            if (jsonInfo.time_remaining > 0) {
                                let finishDateTime = moment.utc().add(jsonInfo.timeRemaining * 60 * 1000)
                                if (finishDateTime.diff(moment.utc(), 'days') > 0)
                                    this.finish_time = finishDateTime.local().format("dddd DD MMM, HH:mm");
                                else
                                    this.finish_time = finishDateTime.local().format("HH:mm");
                            }

                        }
                        callback(JSON.parse(json.Response));
                        socket.on('printInfo', callback);
                    }
                })
                .catch(err => {
                    if (this.interval)
                        clearInterval(this.interval);
                })
        },
        stopPrint() {
            if (confirm("Are you sure stop print?")) {
                this.machine_status = "stopping";
                fetch(apiAddress + "stopPrint", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token"),
                    },
                    body: JSON.stringify({}),
                }).then(response => response.json())
                    .then(json => {
                    })
                    .catch(err => {
                    })
            }
        },
        pausePrint() {
            if (confirm("Are you sure pause print?")) {
                this.machine_status = "pausing";
                fetch(apiAddress + "pausePrint", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token"),
                    },
                    body: JSON.stringify({}),
                }).then(response => response.json())
                    .then(json => {
                    })
                    .catch(err => {
                    })
            }
        },
        resumePrint() {
            if (confirm("Are you sure resume print?")) {
                this.machine_status = "resuming";
                fetch(apiAddress + "resumePrint", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token"),
                    },
                    body: JSON.stringify({}),
                }).then(response => response.json())
                    .then(json => {
                    })
                    .catch(err => {
                    })
            }

        },
        playVideo() {
            drawVideo();
        },
        pauseVideo() {
            pauseVideo();
        }
    }
}

function files() {
    return {
        list: [],
        open: false,
        init() {
            fetch(apiAddress + "getFiles", {
                headers: {
                    'token': getCookie("token")
                }
            })
                .then(response => response.json())
                .then(json => {
                    if (json.Status === "OK")
                        this.list = JSON.parse(json.Response);
                })
        },
        toggleFiles() {
            this.open = !this.open;
        },
        deleteFile(id) {
            if (confirm("Are you sure to delete the file?")) {
                fetch(apiAddress + "deleteFile", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token")
                    },
                    body: JSON.stringify({id: id}),
                }).then(response => response.json())
                    .then(json => {
                        if (json.Status === "OK")
                            document.getElementById("file" + id).remove();
                    });
            }
        },
        printFile(id) {
            if (confirm("Are you sure to print the file?")) {
                fetch(apiAddress + "printFile", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "token": getCookie("token")
                    },
                    body: JSON.stringify({id: id}),
                }).then(response => response.json())
                    .then(json => {
                        this.open = false;
                    });
            }
        }
    }
}

function printerControl() {
    return {
        enclosure_info_loaded: false,
        enclosure_light: false,
        enclosure_fan: false,
        active_nozzle: 0,
        nozzle_info_loaded: false,
        nozzle1_current_temp: 0,
        nozzle1_target_temp: 0,
        nozzle1_material_loaded: false,
        nozzle1_load_enabled: false,
        nozzle2_current_temp: 0,
        nozzle2_target_temp: 0,
        nozzle2_load_enabled: false,
        nozzle2_material_loaded: false,
        heatbed_info_loaded: false,
        heatbed_outer_current_temp: 0,
        heatbed_outer_target_temp: 0,
        heatbed_inner_current_temp: 0,
        heatbed_inner_target_temp: 0,
        switch_enabled: false,
        interval: null,
        init() {
            //this.$watch("nozzle1_target_temp", value => this.changeNozzleTemperature(0, value));
            //this.$watch("nozzle2_target_temp", value => this.changeNozzleTemperature(1, value));
            //this.$watch("enclosure_light", value => this.setEnclosureLight(value));
            //this.$watch("enclosure_fan", value => this.setEnclosureFan(value));
            //this.$watch("heatbed_outer_target_temp", (value, oldValue) => this.changeHeatbedTemperature(2, value));
            //this.$watch("heatbed_inner_target_temp", (value, oldValue) => this.changeHeatbedTemperature(0, value));
            this.fetchData();
        },
        focus(event) {
            event.target.select();
        },
        fetchData() {
            fetch(apiAddress + "subscribeNozzleInfo", {
                headers: {
                    'token': getCookie("token")
                }
            })
                .then(response => response.json())
                .then(json => {

                    if (json.Status === "OK") {
                        this.nozzle_info_loaded = true;
                        this.setNozzleInfo(JSON.parse(json.Response));
                        socket.on('nozzleInfo', this.setNozzleInfo.bind(this));
                    }
                })
                .catch(err => {
                })

            fetch(apiAddress + "subscribeHeatbedInfo", {
                headers: {
                    'token': getCookie("token")
                }
            })
                .then(response => response.json())
                .then(json => {
                    if (json.Status === "OK") {
                        this.heatbed_info_loaded = true;
                        this.setHeatbedInfo(JSON.parse(json.Response));
                        socket.on('heatbedInfo', this.setHeatbedInfo.bind(this));
                    }
                })
                .catch(err => {
                    if (this.interval)
                        clearInterval(this.interval);
                })
            fetch(apiAddress + "subscribeEnclosureInfo", {
                headers: {
                    'token': getCookie("token")
                }
            })
                .then(response => response.json())
                .then(json => {
                    if (json.Status === "OK") {
                        this.enclosure_info_loaded = true;
                        this.setEnclosureInfo(JSON.parse(json.Response));
                        socket.on('enclosureInfo', this.setEnclosureInfo.bind(this));
                    }
                })
                .catch(err => {
                    if (this.interval)
                        clearInterval(this.interval);
                })
        },
        setNozzleInfo(data) {
            let jsonInfo = data;
            this.active_nozzle = jsonInfo['extruderList'][0]['status'] ? 0 : 1;
            this.nozzle1_current_temp = Math.round(jsonInfo['extruderList'][0]['currentTemperature']) + "";
            this.nozzle1_target_temp = Math.round(jsonInfo['extruderList'][0]['targetTemperature']) + "";
            this.nozzle1_material_loaded = !jsonInfo['extruderList'][0]['filamentStatus'];
            this.nozzle2_current_temp = Math.round(jsonInfo['extruderList'][1]['currentTemperature']) + "";
            this.nozzle2_target_temp = Math.round(jsonInfo['extruderList'][1]['targetTemperature']) + "";
            this.nozzle2_material_loaded = !jsonInfo['extruderList'][1]['filamentStatus'];

            if (this.active_nozzle == 0 && Math.round(this.nozzle1_target_temp) > 180 && Alpine.store('machine_status')["status"] === "idle" && Math.round(this.nozzle1_target_temp) - 2 < Math.round(this.nozzle1_current_temp) && Math.round(this.nozzle1_current_temp) < Math.round(this.nozzle1_target_temp) + 2) {
                this.nozzle1_load_enabled = true;
            } else {
                this.nozzle1_load_enabled = false;
            }

            if (this.active_nozzle == 1 && Math.round(this.nozzle2_target_temp) > 180 && Alpine.store('machine_status')["status"] === "idle" && Math.round(this.nozzle2_target_temp) - 2 < Math.round(this.nozzle2_current_temp) && Math.round(this.nozzle2_current_temp) < Math.round(this.nozzle2_target_temp) + 2) {
                this.nozzle2_load_enabled = true;
            } else {
                this.nozzle2_load_enabled = false;
            }

            if (Alpine.store('machine_status')["status"] === "idle")
                this.switch_enabled = true;
        },
        setHeatbedInfo(data) {
            let jsonInfo = data;
            this.heatbed_outer_current_temp = Math.round(jsonInfo['zoneInfo'][1]['currentTemperature']) + "";
            this.heatbed_outer_target_temp = Math.round(jsonInfo['zoneInfo'][1]['targetTemperature']) + "";
            this.heatbed_inner_current_temp = Math.round(jsonInfo['zoneInfo'][0]['currentTemperature']) + "";
            this.heatbed_inner_target_temp = Math.round(jsonInfo['zoneInfo'][0]['targetTemperature']) + "";
        },
        setEnclosureInfo(data) {
            let jsonInfo = data;
            this.enclosure_light = jsonInfo['ledValue'];
            this.enclosure_fan = jsonInfo['fanValue'];
        },
        changeNozzleTemperature(index, event) {
            socket.removeAllListeners('nozzleInfo');

            let temp = event.target.value;

            if (index === 0)
                this.nozzle1_target_temp = temp;
            else
                this.nozzle2_target_temp = temp;

            fetch(apiAddress + "setExtruderTemperature", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({index: index, temp: temp}),
            }).finally(() => {
                socket.on('nozzleInfo', this.setNozzleInfo.bind(this));
            })
        },

        changeHeatbedTemperature(index, event) {
            socket.removeAllListeners('heatbedInfo');

            let temp = event.target.value;

            if (index === 0)
                this.heatbed_inner_target_temp = temp;
            else {
                this.heatbed_inner_target_temp = temp;
                this.heatbed_outer_target_temp = temp;
            }

            fetch(apiAddress + "setHotBedTemperature", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({index: index, temp: temp}),
            }).finally(() => {
                socket.on('heatbedInfo', this.setHeatbedInfo.bind(this));
            })

        },
        setEnclosureLight(event) {
            let value = event.target.checked;

            socket.removeAllListeners('enclosureInfo');

            fetch(apiAddress + "setEnclosureLight", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({light: value ? 1 : 0}),
            }).finally(() => {
                socket.on('enclosureInfo', this.setEnclosureInfo.bind(this));
            });

        },
        setEnclosureFan(event) {
            let value = event.target.checked;

            socket.removeAllListeners('enclosureInfo');

            fetch(apiAddress + "setEnclosureFan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({fan: value ? 1 : 0}),
            }).finally(() => {
                socket.on('enclosureInfo', this.setEnclosureInfo.bind(this));
            });
        },
        loadFilament(index) {
            fetch(apiAddress + "loadFilament", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({index: index}),
            }).then(response => response.json())
                .then(json => {
                })
                .catch(err => {
                })
        },
        unloadFilament(index) {
            fetch(apiAddress + "unloadFilament", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({index: index}),
            }).then(response => response.json())
                .then(json => {
                })
                .catch(err => {
                })
        },
        changeNozzle(index) {
            console.log(Alpine.store('machine_status')["status"])
            if (Alpine.store('machine_status')["status"] !== "idle") {
                return;
            }
            socket.removeAllListeners('nozzleInfo');

            fetch(apiAddress + "switchExtruder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify({index: index}),
            }).finally(json => {
                socket.on('nozzleInfo', this.setNozzleInfo.bind(this));

            })

        }
    }
}

function printerMove() {
    return {
        steps: [0.1, 1, 5, 10, 50, 100],
        xyStep: 10,
        zStep: 10,
        lock: false,
        init() {
            setTimeout(() => {
                xyStepScroll.addEventListener("scroll", (event) => {
                    this.xyStep = this.steps[Math.floor(event.target.scrollTop / 50)];
                });
            }, 50);


            setTimeout(() => {
                zStepScroll.addEventListener("scroll", (event) => {
                    this.zStep = this.steps[Math.floor(event.target.scrollTop / 50)];
                });
            }, 50)

        },
        changeStep(target) {
            let screenPosition = event.target.offsetTop;
            if (target === "xy") {
                const xyStepScroll = document.getElementById('xyStepScroll');
                xyStepScroll.scrollTo(0, screenPosition - 50);
            } else if (target === "z") {
                const zStepScroll = document.getElementById('zStepScroll');
                zStepScroll.scrollTo(0, screenPosition - 50);
            }
        },
        move(command) {
            this.lock = true;
            let sentCommand = {}

            switch (command) {
                case 'y+':
                    sentCommand["direction"] = "Y";
                    sentCommand["step"] = this.xyStep;
                    break;
                case 'y-':
                    sentCommand["direction"] = "Y";
                    sentCommand["step"] = this.xyStep * -1;
                    break;
                case 'x+':
                    sentCommand["direction"] = "X";
                    sentCommand["step"] = this.xyStep;
                    break;
                case 'x-':
                    sentCommand["direction"] = "X";
                    sentCommand["step"] = this.xyStep * -1;
                    break;
                case 'z+':
                    sentCommand["direction"] = "Z";
                    sentCommand["step"] = this.zStep;
                    break;
                case 'z-':
                    sentCommand["direction"] = "Z";
                    sentCommand["step"] = this.zStep * -1;
                    break;

            }

            fetch(apiAddress + "move", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify(sentCommand),
            }).then(response => response.json())
                .then(json => {
                    this.lock = false;
                })
                .catch(err => {
                    this.lock = false;

                })
        },
        home() {
            this.lock = true;

            fetch(apiAddress + "home", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "token": getCookie("token")
                },
                body: JSON.stringify(),
            }).then(response => response.json())
                .then(json => {
                    this.lock = false;
                })
                .catch(err => {
                    this.lock = false;
                })
        },

    }
}

let videoWidth = 0;
let videoHeight = 0;

function drawVideo() {
    // do your drawing stuff here
    try {
        Alpine.store('is_video_playing').set(true);

        var canvas1 = document.getElementById("videostream");
        context = canvas1.getContext("2d");
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas1.width, canvas1.height);
        context.restore();

        socket.off('canvas', videoToCanvas);

        socket.on('canvas', videoToCanvas);


        setTimeout(() => {
            socket.on('canvasOff', function (data) {
                pauseVideo();
            });
        }, 1000);
    } catch (e) {
    }
}

function videoToCanvas(data) {
    let canvas = document.getElementById('videostream');
    let context = canvas.getContext('2d');
    let imageObj = new Image();
    imageObj.src = "data:image/jpeg;base64," + data;
    imageObj.onload = function () {
        context.height = videoHeight;
        context.width = videoWidth;
        context.drawImage(imageObj, 0, 0, videoWidth, videoHeight);
    }
}

function resizeCanvas() {
    const canvas = document.getElementById('videostream')
    const videoViewer = document.getElementById('videoViewer');
    videoWidth = videoViewer.offsetWidth;
    videoHeight = videoViewer.offsetWidth * 9 / 16;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    let context = canvas.getContext("2d");

    context.fillStyle = "#000";
    context.fillRect(0, 0, videoWidth, videoHeight);
}

function pauseVideo() {
    socket.removeAllListeners('canvas');
    Alpine.store('is_video_playing').set(false);
}

document.addEventListener("DOMContentLoaded", function (event) {
    const videoViewer = document.getElementById('videoViewer');
    videoWidth = videoViewer.offsetWidth;
    videoHeight = videoViewer.offsetWidth * 9 / 16;
    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();
    drawVideo();


    const xyStepScroll = document.getElementById('xyStepScroll');
    xyStepScroll.scrollTo(0, 150)

    const zStepScroll = document.getElementById('zStepScroll');
    zStepScroll.scrollTo(0, 150)
});

document.addEventListener('alpine:init', () => {
    Alpine.store('is_video_playing', {
        on: false,
        set(mode) {
            this.on = mode;
        }
    });

    Alpine.store('machine_status', {
        status: "idle",
        set(status) {
            this.status = status;
        }
    });
})
