import fs from "fs";
import readline from "node:readline";

export function argumentsFromApi(str) {
    const noTrim = str.includes('notrim');
    // const noPreheat = str.includes('nopreheat');
    const noShutoff = str.includes('noshutoff');
    // const noReinforceTower = str.includes('noreinforcetower');
    const noReplaceTool = str.includes('noreplacetool');

    const msg = [];
    if (noTrim) {
        msg.push('-notrim');
    }
    // if (noPreheat) {
    //   msg.push('-nopreheat');
    // }
    if (noShutoff) {
        msg.push('-noshutoff');
    }
    // if (noReinforceTower) {
    //   msg.push('-noreinforcetower');
    // }
    if (noReplaceTool) {
        msg.push('-noreplacetool');
    }

    if (msg.length > 0) {
        console.log(`SMFix with args: ${msg.join(' ')}`);
    }
}

export function newPayload(buffer, name, size) {
    return {
        name,
        size,
        readableSize() {
            const sizeInKB = (size / 1024).toFixed(2);
            return `${sizeInKB} KB`;
        },
        buffer
    };
}


export function bedRequestResponse(res, message) {
    res.status(400).json({error: message});
}

export function internalServerErrorResponse(res, message) {
    res.status(500).json({error: message});
}

export function writeResponse(res, statusCode, data) {
    res.status(statusCode).json(data);
}

export async function getGcodeProps(filename) {
    const fileStream = fs.createReadStream(filename);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let fileInfo = {};
    let lineCounter = 0;
    let progressLayers = [];
    let totalLayer = 0;
    let layerChanges = [];

    for await (const line of rl) {
        lineCounter += 1;
        // Each line in input.txt will be successively available here as `line`.
        if (line.startsWith(";matierial_weight:")) {
            fileInfo["material_use"] = Math.round(line.split(":")[1].trim());
        } else if (line.startsWith(";nozzle_0_material:")) {
            fileInfo["nozzle1_material"] = line.split(":")[1].trim();
        } else if (line.startsWith(";nozzle_1_material:")) {
            fileInfo["nozzle2_material"] = line.split(":")[1].trim();
        } else if (line.startsWith(";layer_number:")) {
            fileInfo["layer_number"] = Math.round(line.split(":")[1].trim());
        } else if (line.startsWith(";thumbnail:")) {
            fileInfo["thumbnail"] = line.split("thumbnail:")[1].trim();
        } else if (line.startsWith(";estimated_time(s):")) {
            fileInfo["estimated_time"] = Math.round(line.split(":")[1].trim());
        } else if (line.startsWith("M73")) {
            let command = line.split("M73 ")[1];
            let progress = Math.round(command.split(" ")[0].replace("P", "").trim())
            let timeRemaining = Math.round(command.split(" ")[1].replace("R", "").trim());
            progressLayers.push({
                "line": lineCounter,
                "progress": progress,
                "timeRemaining": timeRemaining
            });
        } else if (line.startsWith(";LAYER_CHANGE")) {
            layerChanges.push({"line": lineCounter, "currentLayer": totalLayer});
            totalLayer += 1;
        }
    }

    fileInfo["layer_changes"]=layerChanges;
    fileInfo["progress_layers"]=progressLayers;

    return fileInfo;
}

