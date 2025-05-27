import fs from "fs";
import crypto from "crypto";
import path from "node:path";
import {Dispatcher, Response} from "@snapmaker/snapmaker-sacp-sdk";
import {PeerId} from '@snapmaker/snapmaker-sacp-sdk/dist/communication/Header.js';
import {
    LaserToolHeadInfo,
    MachineInfo,
    ModuleInfo,
    WifiConnectionInfo,
    MovementInstruction,
    ExtruderMovement
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
    writeInt16
} from '@snapmaker/snapmaker-sacp-sdk/dist/helper.js';
import {response} from "express";

export default class SacpClient extends Dispatcher {
    filePeerId = PeerId.SCREEN;

    constructor(type, socket) {
        super(type, socket);

        this.setHandler(0xb0, 0x00, async (data) => {
        });
    }


    async wifiConnection(hostName, clientName, token, callback) {
        const info = new WifiConnectionInfo(hostName, clientName, token).toBuffer();
        this.setHandler(0x01, 0x06, ({packet}) => {
            const res = new Response(0);
            this.ack(0x01, 0x06, packet, res.toBuffer());
            callback && callback();
        });

        return this.send(0x01, 0x05, PeerId.SCREEN, info, false).then((response, packet) => {
            return {response, packet};
        })
    }

    async wifiConnectionClose() {
        return this.send(0x01, 0x06, PeerId.SCREEN, Buffer.alloc(0), true).then(({response, packet}) => {
            const res = new Response(0);
            this.ack(0x01, 0x06, packet, res.toBuffer()).then(() => {
                console.log("ack close");
            });

            return {response, packet};
        });
    }

    async getModuleInfo() {
        return this.send(0x01, 0x20, PeerId.CONTROLLER, Buffer.alloc(0)).then(({response, packet}) => {
            const moduleInfos = ModuleInfo.parseArray(response.data);
            return {code: response.result, packet, data: moduleInfos};
        });
    }

    async getGcodeFile() {
        this.send(0xac, 0x00, PeerId.CONTROLLER, Buffer.alloc(0)).then(({response, packet}) => {
            console.log("gcode file");
        }).catch((err) => {
            console.log("gcode file error");
        })
    }

    async subscribeGetPrintCurrentLineNumber({interval = 2000}, callback) {
        return this.subscribe(0xac, 0xa0, interval, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async subscribeNozzleInfo({interval = 5000}, callback) {
        return this.subscribe(0x10, 0xa0, interval, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async unsubscribeNozzleInfo(callback) {
        return this.unsubscribe(0x10, 0xa0, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async subscribeHeatbedInfo({interval = 5000}, callback) {
        return this.subscribe(0x14, 0xa0, interval, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async unsubscribeHeatbedInfo(callback) {
        return this.unsubscribe(0x14, 0xa0, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async subscribeEnclosureInfo({interval = 5000}, callback) {
        return this.subscribe(0x15, 0xa0, interval, callback).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async unsubscribeEnclosureInfo(callback) {
        return this.unsubscribe(0x15, 0xa0, callback).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async setEnclosureLight(key, value) {
        const buffer = Buffer.alloc(2);
        writeUint8(buffer, 0, key);
        writeUint8(buffer, 1, value);
        const {response, packet} = await this.send(0x15, 0x02, PeerId.CONTROLLER, buffer);
        return {response, packet};
    }

    async setEnclosureFan(key, value) {
        const buffer = Buffer.alloc(2);
        writeUint8(buffer, 0, key);
        writeUint8(buffer, 1, value);
        const {response, packet} = await this.send(0x15, 0x04, PeerId.CONTROLLER, buffer);
        return {response, packet};
    }

    async requestAbsoluteCooridateMove(directions, distances, jogSpeed = 0.1, coordinateType) {
        const paramBuffer = new MovementInstruction(undefined, undefined, jogSpeed, directions, distances, coordinateType).toArrayBuffer();
        console.log('paramBuffer', paramBuffer);
        return this.send(0x01, 0x34, PeerId.CONTROLLER, paramBuffer, true).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async executeGcode(gcode) {
        return this.send(0x01, 0x02, PeerId.CONTROLLER, stringToBuffer(gcode)).then(({response, packet}) => {
            console.log(response);
            return {response, packet, data: {}};
        });
    }

    async setExtruderTemperature(key, extruderIndex, temperature) {
        const tobuffer = Buffer.alloc(1 + 1 + 2, 0);
        writeUint8(tobuffer, 0, key);
        writeUint8(tobuffer, 1, extruderIndex);
        writeInt16(tobuffer, 2, temperature);
        return this.send(0x10, 0x02, PeerId.CONTROLLER, tobuffer).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async setHotBedTemperature(key, zoneIndex, temperature) {
        const buffer = Buffer.alloc(4, 0);
        writeUint8(buffer, 0, key);
        writeUint8(buffer, 1, zoneIndex);
        writeInt16(buffer, 2, temperature);
        return this.send(0x14, 0x02, PeerId.CONTROLLER, buffer).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async extruderMovement(key, movementType, lengthIn, speedIn, lengthOut, speedOut) {
        const info = new ExtruderMovement(key, movementType, lengthIn, speedIn, lengthOut, speedOut);
        return this.send(0x10, 0x09, PeerId.CONTROLLER, info.toBuffer()).then(({response, packet}) => {
            return {response, packet};
        });
    }

    async SwitchExtruder(key, extruderIndex) {
        const tobuffer = Buffer.alloc(1 + 1, 0);
        writeUint8(tobuffer, 0, key);
        writeUint8(tobuffer, 1, extruderIndex);
        return this.send(0x10, 0x05, PeerId.CONTROLLER, tobuffer).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async startScreenPrint({headType = 0, filename = '', hash = ''}) {
        const filenameBuffer = stringToBuffer(filename);
        const hashBuffer = stringToBuffer(hash);
        this.send(0xb0, 0x08, PeerId.SCREEN, Buffer.concat([Buffer.alloc(1, headType), filenameBuffer, hashBuffer])).then(({}) => {
            if (response.result === 0) {
                return {response};
            }
        });
    }


    async logFeedbackLevel(level = 2) {
        return this.send(0x01, 0x10, PeerId.CONTROLLER, Buffer.alloc(1, level)).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async subscribeLogFeedback({interval = 3600000}, callback) {
        return this.subscribe(0x01, 0xa1, interval, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async subscribeGetPrintingTime({interval = 1000}, callback) {
        return this.subscribe(0xac, 0xa5, interval, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async subscribeHeartbeat({interval = 1000}, callback) {
        return this.subscribe(0x01, 0xa0, interval, callback).then(({response, packet}) => {
            return {code: response.result, packet, data: {}};
        });
    }

    async wifiConnectionHeartBeat() {
        return this.send(0xb0, 0x0b, PeerId.SCREEN, Buffer.alloc(0)).then(({response, packet}) => {
            return {response, packet};
        });
    }


    async getMachineInfo() {
        const {response, packet} = await this.send(0x01, 0x21, PeerId.CONTROLLER, Buffer.alloc(0));

        const machineInfo = new MachineInfo().fromBuffer(response.data);
        return {code: response.result, packet, data: machineInfo};
    }

    async getLaserToolHeadInfo(key) {
        const buffer = Buffer.alloc(1, 0);
        writeUint8(buffer, 0, key);
        return this.send(0x12, 0x01, PeerId.CONTROLLER, buffer).then(({response}) => {
            let laserToolHeadInfo = new LaserToolHeadInfo();
            if (response.result === 0) {
                laserToolHeadInfo = laserToolHeadInfo.fromBuffer(response.data);
            }
            return {response, laserToolHeadInfo};
        });
    }

    async uploadFileClient(filePath, renderName) {
        const sizePerChunk = 60 * 1024;
        this.setHandler(0xb0, 0x01, (data) => {
            const {nextOffset, result: md5HexStr} = readString(data.param);
            const index = readUint16(data.param, nextOffset);

            const inputStream = fs.createReadStream(filePath, {
                start: index * sizePerChunk, end: (index + 1) * sizePerChunk - 1, highWaterMark: sizePerChunk
            });
            let buffer = Buffer.alloc(1, 200); // result = 1, means file EOF reached
            let finalBuf = Buffer.alloc(0);
            inputStream.on('data', (buf) => {
                finalBuf = Buffer.concat([finalBuf, buf]);
            });
            inputStream.on('end', () => {
                const md5Buffer = stringToBuffer(md5HexStr);
                const indexBuffer = Buffer.alloc(2, 0);
                writeUint16(indexBuffer, 0, index);
                // const chunkLengthBuffer = Buffer.alloc(2, 0);
                // writeUint16(chunkLengthBuffer, 0, finalBuf.byteLength);
                // const chunkBuffer = Buffer.concat([chunkLengthBuffer, finalBuf]); //stringToBuffer(finalBuf.toString());
                const chunkBuffer = stringToBuffer(finalBuf);
                buffer = Buffer.concat([Buffer.alloc(1, 0), md5Buffer, indexBuffer, chunkBuffer]);
                this.ack(0xb0, 0x01, data.packet, buffer);
            });
            inputStream.once('error', () => {
                this.ack(0xb0, 0x01, data.packet, buffer);
            });
        });

        return new Promise((resolve, reject) => {
            // handle file upload result
            this.setHandler(0xb0, 0x02, (data) => {
                const result = readUint8(data.param);
                if (result === 0) {
                    console.log('file upload success');
                } else {
                    console.log('file upload fail');
                }
                this.ack(0xb0, 0x02, data.packet, Buffer.alloc(1, 0));
                resolve(result === 0);
            });

            if (fs.existsSync(filePath)) {
                const hash = crypto.createHash('md5');
                const inputStream = fs.createReadStream(filePath);
                inputStream.on('data', (data) => {
                    hash.update(data);
                });
                inputStream.on('end', () => {
                    const md5HexStr = hash.digest('hex');
                    const filename = path.basename(filePath);
                    const fileLength = fs.statSync(filePath).size;
                    const chunks = Math.ceil(fileLength / sizePerChunk);

                    const filenameBuffer = renderName ? stringToBuffer(renderName) : stringToBuffer(filename);
                    const fileLengthBuffer = Buffer.alloc(4, 0);
                    writeUint32(fileLengthBuffer, 0, fileLength);
                    const md5Buffer = stringToBuffer(md5HexStr);
                    const chunksBuffer = Buffer.alloc(2, 0);
                    writeUint16(chunksBuffer, 0, chunks);

                    const buffer = Buffer.concat([filenameBuffer, fileLengthBuffer, chunksBuffer, md5Buffer]);
                    this.send(0xb0, 0x00, PeerId.SCREEN, buffer).catch(err => {
                        reject(err);
                    });
                });
            } else {
                reject(new Error(`can not upload missing file: ${filePath}`));
            }
        });
    }

    async stopPrint() {
        return this.send(0xac, 0x06, PeerId.CONTROLLER, Buffer.alloc(0), true).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async pausePrint() {
        return this.send(0xac, 0x04, PeerId.CONTROLLER, Buffer.alloc(0), true).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    async resumePrint() {
        return this.send(0xac, 0x05, PeerId.CONTROLLER, Buffer.alloc(0), true).then(({response, packet}) => {
            return {response, packet, data: {}};
        });
    }

    handlerStopPrintReturn(callback) {
        this.setHandler(0xac, 0x17, (request) => {
            this.ack(0xac, 0x17, request.packet, Buffer.alloc(1, 0));
            console.log('request stopprint return');
            callback && callback(request);
        });
    }

    handlerPausePrintReturn(callback) {
        this.setHandler(0xac, 0x15, (request) => {
            this.ack(0xac, 0x15, request.packet, Buffer.alloc(1, 0));
            console.log('request pause print return');
            callback && callback(request);
        });
    }

    handlerStartPrintReturn(callback) {
        this.setHandler(0xac, 0x14, (request) => {
            this.ack(0xac, 0x14, request.packet, Buffer.alloc(1, 0));
            console.log('request startprint return');
            callback && callback(request);
        });
    }

    handlerResumePrintReturn(callback) {
        this.setHandler(0xac, 0x16, (request) => {
            this.ack(0xac, 0x16, request.packet, Buffer.alloc(1, 0));
            console.log('request resume print return');
            const result = readUint8(request.packet.payload);
            callback && callback(result);
        });
    }

    async getPrintingFileInfo() {
        return this.send(0xac, 0x1a, this.filePeerId, Buffer.alloc(1, 0)).then(({ response, packet }) => {
            const data = {
                filename: '',
                totalLine: 0,
                estimatedTime: 0
            };
            console.log('getPrintingFileInfo', response);
            if (response.result === 0) {
                const { nextOffset, result } = readString(response.data);
                data.filename = result;
                const totalLines = readUint32(response.data, nextOffset);
                const estimatedTime = readUint32(response.data, nextOffset + 4);
                data.totalLine = totalLines;
                data.estimatedTime = estimatedTime;
            }
            return { response, packet, data };
        });
    }

    async subscribeGetPrintingTime({ interval = 1000 }, callback) {
        return this.subscribe(0xac, 0xa5, interval, callback).then(({ response, packet }) => {
            return { code: response.result, packet, data: {} };
        });
    }


}
