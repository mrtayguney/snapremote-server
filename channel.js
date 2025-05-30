import {EventEmitter} from "node:events";
import net from "node:net";
import readline from "node:readline";
import fs from "node:fs";
import process from "node:process";
import SacpClient from "./sacpClient.js";
import sendNotificaiton from "./notificationManager.js";

import {
    ExtruderInfo,
    BedInfo,
    EnclosureInfo,
    GcodeFileInfo,
    GcodeCurrentLine,
} from '@snapmaker/snapmaker-sacp-sdk/dist/models/index.js';

import {
    readString,
    readUint16,
    readUint32,
    readUint8,
    stringToBuffer,
    writeUint16,
    writeUint32,
    writeUint8,
} from '@snapmaker/snapmaker-sacp-sdk/dist/helper.js';
import {ModuleInfo} from "@snapmaker/snapmaker-sacp-sdk/dist/models/index.js";

export const SINGLE_EXTRUDER_TOOLHEAD_FOR_ORIGINAL = 'singleExtruderToolheadForOriginal';
export const SINGLE_EXTRUDER_TOOLHEAD_FOR_SM2 = 'singleExtruderToolheadForSM2';
export const DUAL_EXTRUDER_TOOLHEAD_FOR_SM2 = 'dualExtruderToolheadForSM2';
export const DUAL_EXTRUDER_TOOLHEAD_FOR_ARTISAN = 'dualExtruderToolheadForArtisan';
export const LEVEL_ONE_POWER_LASER_FOR_ORIGINAL = 'levelOneLaserToolheadForOriginal';
export const LEVEL_TWO_POWER_LASER_FOR_ORIGINAL = 'levelTwoLaserToolheadForOriginal';
export const LEVEL_ONE_POWER_LASER_FOR_SM2 = 'levelOneLaserToolheadForSM2';
export const LEVEL_TWO_POWER_LASER_FOR_SM2 = 'levelTwoLaserToolheadForSM2';
export const STANDARD_CNC_TOOLHEAD_FOR_ORIGINAL = 'standardCNCToolheadForOriginal';
export const STANDARD_CNC_TOOLHEAD_FOR_SM2 = 'standardCNCToolheadForSM2';
export const LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2 = 'levelTwoCNCToolheadForSM2';
export const ENCLOSURE_FOR_SM2 = 'enclosureForSM2';
export const ENCLOSURE_FOR_ARTISAN = 'enclosureForArtisan';
export const AIR_PURIFIER = 'airPurifier';
export const HEADT_BED_FOR_SM2 = 'heatBedForSM2';
export const A400_HEADT_BED_FOR_SM2 = 'a400HeatBedForSM2';
export const SNAPMAKER_J1_HEATED_BED = 'SnapmakerJ1:HeatedBed';
export const SNAPMAKER_J1_LINEAR_MODULE = 'SnapmakerJ1:LinearModule';
export const DEFAULT_MACHINE_ORIGINAL = 'Original';
export const DEFAULT_MACHINE_ORIGINAL_LONG_Z_AXIS = 'Original Long Z-axis';

export const L20WLaserToolModule = {
    identifier: '20W Laser Module',

    label: '20W Laser Module',
    image: '/resources/images/machine/20w_laser_module.jpeg',

    metadata: {
        headType: 'laser',

        supportCrosshair: true,
    },
};

export const L40WLaserToolModule = {
    identifier: '40W Laser Module',

    label: '40W Laser Module',
    image: '/resources/images/machine/40w_laser_module.jpeg',

    metadata: {
        headType: 'laser',

        supportCrosshair: true,
    },
};

export const L2WLaserToolModule = {
    identifier: '2W Laser Module',

    label: '2W Laser Module',
    image: '/resources/images/machine/2w-laser-module.jpg',

    metadata: {
        headType: 'laser',

        supportCrosshair: true,
    },
};

const MODULEID_MAP = {
    '0': SINGLE_EXTRUDER_TOOLHEAD_FOR_SM2,
    '1': STANDARD_CNC_TOOLHEAD_FOR_SM2,
    '2': LEVEL_ONE_POWER_LASER_FOR_SM2,
    '5': ENCLOSURE_FOR_SM2,
    7: AIR_PURIFIER,
    '13': DUAL_EXTRUDER_TOOLHEAD_FOR_SM2,
    '70000': DUAL_EXTRUDER_TOOLHEAD_FOR_ARTISAN,
    '14': LEVEL_TWO_POWER_LASER_FOR_SM2,
    '15': LEVEL_TWO_CNC_TOOLHEAD_FOR_SM2,
    '16': ENCLOSURE_FOR_ARTISAN,
    19: L20WLaserToolModule.identifier,
    20: L40WLaserToolModule.identifier,
    23: L2WLaserToolModule.identifier,
    // ?
    '512': HEADT_BED_FOR_SM2,
    '513': SNAPMAKER_J1_HEATED_BED,
    '514': SNAPMAKER_J1_LINEAR_MODULE,
    '515': A400_HEADT_BED_FOR_SM2,
    // 516: A400 Linear Module
    518: 'Snapmaker Ray - Enclosure',
    // 520: Ray Multi-Function Button
};

export const ENCLOSURE_MODULE_IDS = [
    5, // Enclosure for SM 2.0
    16, // Enclosure for Artisan
    518, // Enclosure for Ray
];

const ERROR_REPORT_REASON = {
    // Air Purifier module
    '7-1': 'Air Purifier Disconnected. Please power off the machine, replug the Air Purifier, and restart. If the problem persists, contact our Support for help.',

    // Emergency Stop
    '8-1': 'Emergency Stop. Please make sure that there is no danger and restart the machine after releasing the emergency stop switch.',

    // 20W laser module
    '19-1': 'Abnormal Toolhead Orientation Detection. Please contact our Support for help.',
    '19-2': 'Laser Emitter Overheat. Please power off the machine, wait for a while, and restart.If this occurs frequently, contact our Support for help.',
    '19-3': 'Slanting Toolhead. Please reinstall the toolhead and make sure it does not slant in any direction. If this occurs frequently, contact our Support for help.',
    '19-4': 'Abnormal Laser Emitter. Please contact our Support for help.',
    '19-5': 'Abnormal Laser Heat Dissipation. Please contact our Support for help.',
    '19-6': 'Flame detected. Please short press the button to resume work when it is safe to do so. The sensitivity of the flame detection can be modified in the machine settings.',
    '19-9': 'Abnormal Laser Temperature Sensor. Please contact our Support for help.',
    '19-10': 'Laser PCBA Overheat. Please power off the machine, wait for a while, and restart. If this occurs frequently, contact our Support for help.',
    '19-12': 'Toolhead Disconnected. Please power off the machine, replug the toolhead, and restart. If the problem persists, contact our Support for help.',
    '19-14': 'Laser Locked. Please unlock it on the controller.',

    // 40W laser module
    '20-1': 'Abnormal Toolhead Orientation Detection. Please contact our Support for help.',
    '20-2': 'Laser Emitter Overheat. Please power off the machine, wait for a while, and restart.If this occurs frequently, contact our Support for help.',
    '20-3': 'Slanting Toolhead. Please reinstall the toolhead and make sure it does not slant in any direction. If this occurs frequently, contact our Support for help.',
    '20-4': 'Abnormal Laser Emitter. Please contact our Support for help.',
    '20-5': 'Abnormal Laser Heat Dissipation. Please contact our Support for help.',
    '20-6': 'Flame detected. Please short press the button to resume work when it is safe to do so. The sensitivity of the flame detection can be modified in the machine settings.',
    '20-9': 'Abnormal Laser Temperature Sensor. Please contact our Support for help.',
    '20-10': 'Laser PCBA Overheat. Please power off the machine, wait for a while, and restart. If this occurs frequently, contact our Support for help.',
    '20-12': 'Toolhead Disconnected. Please power off the machine, replug the toolhead, and restart. If the problem persists, contact our Support for help.',
    '20-14': 'Laser Locked. Please unlock it on the controller.',

    // Linear Module
    '516-7': 'Overstep the limit. X-axis limit switch triggered. Range of motion exceeds machine boundaries. If it occurs during machining, adjust the machine home position or confirm that the Gcode is correct.',
    '516-8': 'Overstep the limit. Y-axis limit switch triggered. Range of motion exceeds machine boundaries. If it occurs during machining, adjust the machine home position or confirm that the Gcode is correct.',

    // Snapmaker Ray - Enclosure
    '518-2': 'The Enclosure door is opened or Enclosure disconnected. Please close the door or power off the machine, replug the Enclosure.If there is no Enclosure, please turn off door detection in the machine setting.',

    // Snapmaker Ray - Controller
    '2051-1': 'Toolhead not detected. Please power off the machine, plug the toolhead into the controller, and restart. If the problem persists, contact our Support for help.',
    '2051-5': 'Failed to Home.Please check if any Linear Module is prevented from moving.If the problem persists, contact our Support for help.',
};

const WORKFLOW_STATUS_MAP = {
    '0': 'idle',
    '1': 'starting',
    '2': 'running',
    '3': 'pausing',
    '4': 'paused',
    '5': 'stopping',
    '6': 'stopped',
    '7': 'finishing',
    '8': 'completed',
    '9': 'recovering',
    '10': 'resuming',
};

class BaseChannel extends EventEmitter {
    constructor() {
        super();
    }
}

export default class Channel extends BaseChannel {
    socket = null;

    moduleInfos = new ModuleInfo();
    currentGcodeFileInfo = null;

    client = new net.Socket();
    sacpClient = null;
    totalLine = 0;

    extruderInfo = new ExtruderInfo();
    bedInfo = new BedInfo();
    enclosureInfo = {}
    printProgress = null;
    nozzleInfoSubscribed = false;
    heatbedInfoSubscribed = false;
    enclosureInfoSubscribed = false;
    printLineSubscribed = false;

    setSocket(socket) {
        this.socket = socket;
    }

    constructor() {
        super();
        this.client = new net.Socket();
        this.setSocket(this.client);

        this.client.on('data', (buffer, packet) => {
            this.sacpClient.read(buffer);
            if (buffer[11] === 0xac && buffer[12] === 0x00) {
                const gcodeFileInfo = new GcodeFileInfo().fromBuffer(buffer.slice(13, buffer.length));
                gcodeFileInfo["machineStatus"] = this.machineStatus;
                this.currentGcodeFileInfo = gcodeFileInfo;
            }
        });
        this.client.on('close', () => {

        });
        this.client.on('error', (err) => {
            console.log(`TCP connection error: ${err}`);

        });

        this.client.on('message', (message) => {
            console.log(message);
        })

        this.client.on('status', (message) => {
            console.log(message);
        })


    }

    async connectionOpen(io) {
        return new Promise((resolve, reject) => {
            this.client.connect({
                host: process.env.DEVICE_IP,
                port: process.env.DEVICE_PORT,
            }, async () => {
                this.sacpClient = new SacpClient('tcp', this.client);
                try {
                    const {response} = await this.sacpClient.wifiConnection("SnapRemoteServer", 'SnapRemote', "", () => {
                        // disconnected
                        this.client.destroy();
                    });

                    if (response.response.result === 0) {
                        this.moduleInfos = this.getModuleInfo();
                        this.heartbeat();
                        this.registerErrorReportHandler(io);
                    }

                    resolve(true);
                } catch (err) {
                    console.log(err)
                }
            });
        });
    }

    async connectionClose() {
        // to-do check unsubscription
        // this.sacpClient.unsubscribeNozzleInfo()
        // this.sacpClient.unsubscribeHeatbedInfo()
        // this.sacpClient.unsubscribeEnclosureInfo();
        this.nozzleInfoSubscribed = false;
        this.heatbedInfoSubscribed = false;
        this.enclosureInfoSubscribed = false;
        this.printLineSubscribed = false;
        return this.sacpClient.wifiConnectionClose();
    }

    getModuleIdentifier(module) {
        // hard-code for artisan, 2.0 dualextruder and artisan dualextruder have same moduleId
        if (module.moduleId === 13) {
            if (module.hardwareVersion >= 129 && module.hardwareVersion <= 137) {
                // 2.0 dualextruder
                return 13; // MODULEID_MAP['13'];
            } else {
                // aritsan dualextruder
                return 70000; // MODULEID_MAP['70000'];
            }
        } else {
            return MODULEID_MAP[module.moduleId];
        }
    }

    async getModuleInfo() {
        const {data: moduleInfoList} = await this.sacpClient.getModuleInfo();

        const definedModuleIds = Object.keys(MODULEID_MAP);

        // save module info in channel
        this.moduleInfos = {};
        for (const module of moduleInfoList) {
            if (definedModuleIds.includes(String(module.moduleId))) {
                const identifier = this.getModuleIdentifier(module);

                if (!this.moduleInfos[identifier]) {
                    this.moduleInfos[identifier] = module;
                } else {
                    const modules = this.moduleInfos[identifier];
                    if (Array.isArray(modules)) {
                        modules.push(module);
                    } else {
                        // convert single item to list
                        this.moduleInfos[identifier] = [modules, module];
                    }
                }
            }
        }

        // Infer head type from modules, this is needed when using APIs like `setEnclosureDoorDetection()`,
        // the channel has to know which head type is used right now.
        // const laserModule = this.getLaserToolHeadModule();
        // if (laserModule) {
        //     this.headType = HEAD_LASER;
        // }
        //
        // const cncModule = this.getCncToolHeadModule();
        // if (cncModule) {
        //     this.headType = HEAD_CNC;
        // }

        return moduleInfoList;
    }

    getEnclosureModule() {
        for (const key of Object.keys(this.moduleInfos)) {
            const module = this.moduleInfos[key];
            if (module && module instanceof ModuleInfo) {
                if (ENCLOSURE_MODULE_IDS.includes(module.moduleId)) {
                    return module;
                }
            }
        }

        return null;
    }

    getToolHeadModule(extruderIndex) {
        extruderIndex = Number(extruderIndex);
        const modules = this.moduleInfos['70000']
        if (!modules) {
            return null;
        }
        let targetModule = null;
        if (Array.isArray(modules)) {
            extruderIndex = Number(extruderIndex);
            for (const module of modules) {
                if (module.moduleIndex === extruderIndex) {
                    targetModule = module;
                    extruderIndex = 0;
                    break;
                }
            }
        } else {
            targetModule = modules;
        }

        return {
            module: targetModule,
            extruderIndex,
        };
    }

    async getFileInfo() {
        await this.sacpClient.getGcodeFile();
        return this.currentGcodeFileInfo;
    }

    startPrint(fileName) {
        this.sacpClient.startScreenPrint({
            headType: 0, filename: fileName, hash: ""
        })
    }

    async subscribeNozzleInfo(io) {
        return new Promise((resolve, reject) => {
            if (this.nozzleInfoSubscribed) {
                resolve(this.extruderInfo);
            } else {
                this.sacpClient.subscribeNozzleInfo(5000, (resp) => {
                    this.nozzleInfoSubscribed = true;
                    this.extruderInfo = new ExtruderInfo().fromBuffer(resp.response.data);
                    io.sockets.emit('nozzleInfo', this.extruderInfo);
                    resolve(this.extruderInfo);
                });
            }
        });
    }

    async subscribeHeatbedInfo(io) {
        return new Promise((resolve, reject) => {
            if (this.heatbedInfoSubscribed) {
                resolve(this.bedInfo);
            } else {
                this.sacpClient.subscribeHeatbedInfo(5000, (resp) => {

                    this.heatbedInfoSubscribed = true;
                    this.bedInfo = new BedInfo().fromBuffer(resp.response.data);

                    io.sockets.emit('heatbedInfo', this.bedInfo);

                    resolve(this.bedInfo);
                });
            }
        });
    }

    async subscribeEnclosureInfo(io) {
        return new Promise((resolve, reject) => {
            if (this.enclosureInfoSubscribed) {
                resolve(this.enclosureInfo);
            } else {
                this.sacpClient.subscribeEnclosureInfo(5000, (resp) => {

                    this.enclosureInfoSubscribed = true;
                    const {ledValue, testStatus, fanlevel} = new EnclosureInfo().fromBuffer(resp.response.data);
                    let headTypeKey = 0;
                    switch (this.headType) {
                        case 'printing':
                            headTypeKey = 0;
                            break;
                        case 'laser':
                            headTypeKey = 1;
                            break;
                        case 'cnc':
                            headTypeKey = 2;
                            break;
                        default:
                            break;
                    }
                    this.enclosureInfo = {ledValue: ledValue > 0, fanValue: fanlevel > 0}

                    io.sockets.emit('enclosureInfo', this.enclosureInfo);

                    resolve(this.enclosureInfo);
                });
            }
        });
    }

    async setEnclosureLight(intensity) {
        const module = this.getEnclosureModule();
        const {response} = await this.sacpClient.setEnclosureLight(module.key, intensity * 255);
        return response;
    }

    async setEnclosureFan(intensity) {
        const module = this.getEnclosureModule();
        const {response} = await this.sacpClient.setEnclosureFan(module.key, intensity * 255);
        return response;
    }



    async subscribeGetPrintCurrentLineNumber(db, io) {
        return new Promise((resolve, reject) => {
            if (this.printLineSubscribed) {
                resolve(this.printProgress);
            } else {
                //todo veribanı kontrolleri yapılacak var mı yok mu bakalım
                this.sacpClient.subscribeGetPrintCurrentLineNumber(
                    {interval: 5000},
                    ({response}) => {
                        this.getFileInfo().then((fileInfo) => {
                            if (fileInfo && this.machineStatus !== 'idle') {
                                this.printLineSubscribed = true;
                                const currentLineNumberInfo = new GcodeCurrentLine().fromBuffer(response.data);
                                let printLine = currentLineNumberInfo.currentLine;

                                try {
                                    let {files} = db.data;
                                    let foundItem = files.find((item) => item.name === fileInfo.gcodeName);
                                    //this.sacpClient.getPrintingFileInfo();

                                    if(foundItem) {
                                        let progress = foundItem["progress_layers"][0].progress;
                                        let timeRemaining = foundItem["progress_layers"][0].timeRemaining;
                                        let currentLayer = 1;

                                        for (let i = 1; i < foundItem["progress_layers"].length; i++) {
                                            let layer = foundItem["progress_layers"][i];
                                            if (layer.line < printLine) {
                                                progress = layer.progress;
                                                timeRemaining = layer.timeRemaining;
                                            } else {
                                                break;
                                            }
                                        }

                                        for (let i = 1; i < foundItem["layer_changes"].length; i++) {
                                            let layer = foundItem["layer_changes"][i];
                                            if (layer.line < printLine) {
                                                currentLayer = layer.currentLayer;
                                            } else {
                                                break;
                                            }
                                        }

                                        this.printProgress = {
                                            "progress": progress,
                                            "timeRemaining": timeRemaining,
                                            "currentLayer": currentLayer,
                                            "totalLayer": foundItem.layer_number,
                                            "machineStatus": this.machineStatus ? this.machineStatus : "idle",
                                            "fileName": fileInfo.gcodeName,
                                            "image": foundItem.image
                                        }
                                        io.sockets.emit('printInfo', this.printProgress);
                                        resolve(this.printProgress);
                                    }
                                    else{
                                        this.printLineSubscribed = true;
                                        this.printProgress = {
                                            "progress": 0,
                                            "timeRemaining": 0,
                                            "currentLayer": 0,
                                            "totalLayer": 0,
                                            "machineStatus": this.machineStatus ? this.machineStatus : "idle",
                                            "fileName": fileInfo.gcodeName,
                                            "image": ""
                                        }
                                        io.sockets.emit('printInfo', this.printProgress);
                                        resolve(this.printProgress);
                                    }

                                } catch (e) {
                                    reject(e);
                                }
                            } else {
                                this.printLineSubscribed = true;
                                this.printProgress = {
                                    "progress": 0,
                                    "timeRemaining": 0,
                                    "currentLayer": 0,
                                    "totalLayer": 0,
                                    "machineStatus": "idle",
                                    "fileName": "",
                                    "image": ""
                                }
                                io.sockets.emit('printInfo', this.printProgress);
                                resolve(this.printProgress);
                            }
                        });
                    })
            }
        });
    }

    async move(command) {
        let direction = command.direction;
        let step = command.step;

        await this.sacpClient.executeGcode("G91");
        let gcode = "G0 F2500 " + direction + "" + step;
        await this.sacpClient.executeGcode(gcode);
        await this.sacpClient.executeGcode("G90");
    }

    async home(command) {
        let gcode = "G28";
        await this.sacpClient.executeGcode(gcode);
        await this.sacpClient.executeGcode("G90");
    }

    async heartbeat(id = 'uuid') {
        this.subscribeHeartCallback = async (data) => {
            const statusKey = readUint8(data.response.data, 0);

            this.machineStatus = WORKFLOW_STATUS_MAP[statusKey];

        };
        this.sacpClient.subscribeHeartbeat({interval: 2000}, this.subscribeHeartCallback).then((res) => {
        });
    }

    async uploadFile(filename, renderName) {
        this.totalLine = null;
        this.estimatedTime = null;
        let gcodeFilePath = filename
        const rl = readline.createInterface({
            input: fs.createReadStream(gcodeFilePath),
            output: process.stdout,
            terminal: false
        });
        rl.on('line', (data) => {
            if (data.includes(';matierial_weight')) {
                this.totalLine = parseFloat(data.slice(18));
            }
            if (data.includes(';Lines')) {
                this.totalLine = parseFloat(data.slice(7));
            }
            if (data.includes(';estimated_time(s)')) {
                this.estimatedTime = parseFloat(data.slice(19));
            }
            if (data.includes(';Estimated Print Time')) {
                this.estimatedTime = parseFloat(data.slice(22));
            }
            if (data.includes(';Header End')) {
                rl.close();
            }

        });


        const success = await this.sacpClient.uploadFileClient(gcodeFilePath, renderName);
        let msg = '', data = false;
        if (success) {
            msg = '';
            data = true;
        }
        return {msg, data};
    }

    async stopPrint() {
        this.machineStatus = "stopping";
        await this.sacpClient.stopPrint();
    }

    async resumePrint() {
        this.machineStatus = "resuming";
        await this.sacpClient.resumePrint();
    }

    async pausePrint() {
        this.machineStatus = "pausing";
        await this.sacpClient.pausePrint();
    }

    async setExtruderTemperature(index, temp) {
        const {module, extruderIndex} = this.getToolHeadModule(index);
        await this.sacpClient.setExtruderTemperature(module, extruderIndex, temp);
    }

    async setHotBedTemperature(index, temp) {
        const module = this.moduleInfos[A400_HEADT_BED_FOR_SM2];
        await this.sacpClient.setHotBedTemperature(module["key"], index, temp);
    }

    async loadFilament(index) {
        const {module, extruderIndex} = this.getToolHeadModule(index);
        await this.sacpClient.extruderMovement(module.key, 0, 60, 200, 0, 0);
    }

    async unloadFilament(index) {
        const {module, extruderIndex} = this.getToolHeadModule(index);
        await this.sacpClient.extruderMovement(module.key, 0, 6, 200, 60, 150);
    }

    async switchExtruder(index) {
        const {module, extruderIndex} = this.getToolHeadModule(index);
        await this.sacpClient.SwitchExtruder(module.key, extruderIndex);
    }

    async registerErrorReportHandler(io) {
        if (!this.socket) {
            return;
        }

        this.sacpClient.logFeedbackLevel(2).then(({ response }) => {
            if (response.result === 0) {
                this.subscribeLogCallback = (data) => {
                    const result = readString(data.response.data, 1).result;
                    if (result === null) {
                    }
                    //console.log(result)
                    if(result.includes('print finish'))
                        sendNotificaiton("Job Finished", "Your job is finished.", {})

                   io.sockets.emit('serialport:read', { data: result });
                };
                this.sacpClient.subscribeLogFeedback({ interval: 60000 }, this.subscribeLogCallback);
            }
        });


        this.sacpClient.handlerStopPrintReturn((data) => {
            sendNotificaiton("Job Stopped", "Your job is stopped by user.", {})
            io.sockets.emit('connection:stopGcode', {data});
        });

        this.sacpClient.handlerPausePrintReturn((data) => {
            sendNotificaiton("Job Paused", "Your job is paused by user.", {})
            io.sockets.emit('connection:pauseGcode', {data});
        });

        this.sacpClient.handlerStartPrintReturn((data) => {
            sendNotificaiton("Job Started", "A job started by user.", {})
            io.sockets.emit('connection:startGcode', {data});
        });

        this.sacpClient.handlerResumePrintReturn((data) => {
            sendNotificaiton("Job Resuming", "A job is resuming.", {})
            io.sockets.emit('connection:resumeGcode', {data});
        });

        // Set error report handler
        this.sacpClient.setHandler(0x04, 0x00, ({ param }) => {
            const level = readUint8(param, 0);
            const owner = readUint16(param, 1);
            const errorCode = readUint8(param, 3);
            if(errorCode===12 && owner===13)
                sendNotificaiton("Error", "The extruder is continuously pulled up and printing is paused.", {})
            if(errorCode===11 && owner===13)
                sendNotificaiton("Error", "Filament run out detected and printing is paused.", {})

            io.sockets.emit("deviceError", { level, owner, errorCode });
        });
    }
}
