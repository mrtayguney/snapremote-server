#!/usr/bin/env python

import sys
import fileinput
from datetime import datetime
import math

file_name = sys.argv[1]

try:
    with open(file_name, 'r') as file:
        lines = file.readlines()

        thumbnail = ""
        do_write = False
        filament_use_gr = None
        filament_use_m = None
        layer_number = None
        layer_height = None
        nozzle_0_material = ""
        nozzle_1_material = ""
        nozzle_0_diameter = None
        nozzle_1_diameter = None

        for i, line in enumerate(lines):
            if "; thumbnail end" in line:
                do_write = False

            if do_write:
                thumbnail += line[2:]

            if "; thumbnail begin" in line:
                do_write = True
            elif "; total filament used [g]" in line:
                filament_use_gr = line.split("=")[1].strip()
            elif "; filament used [mm]" in line:
                filament_use_m = float(line.split("=")[1].strip().split(",")[0]) / 1000
            elif "; filament used [mm]" in line:
                filament_use_m = float(line.split("=")[1].strip().split(",")[0]) / 1000
            elif "; total_layer_number" in line and layer_number == None:
                layer_number = int(line.split("=")[1].strip())
            elif "; layer_height" in line:
                layer_height = float(line.split("=")[1].strip().split(",")[0])
            elif "; filament_settings_id" in line:
                nozzles = line.split("=")[1].strip().split(";")
                nozzle_0_material = nozzles[0].replace("\"","")
                nozzle_1_material = nozzles[1].replace("\"","")
            elif "; nozzle_diameter" in line:
                nozzles = line.split("=")[1].strip().split(",")
                nozzle_0_diameter = float(nozzles[0])
                nozzle_1_diameter = float(nozzles[1])

    lines = fileinput.input([file_name], inplace=True)

    estimated_time = 0
    for line in lines:
        print(line, end="")
        if '; estimated printing time (normal mode)' in line:
            estimated_time = line.split('=')[1].strip()

    date_string = estimated_time
    start_date = datetime(1900, 1, 1)
    if 'h' in date_string:
        date_object = datetime.strptime(date_string, '%Hh %Mm %Ss')
    else:
        date_object = datetime.strptime(date_string, '%Mm %Ss')
    print(estimated_time)
    time = math.floor((date_object - start_date).total_seconds())

    lines = fileinput.input([file_name], inplace=True)

    for line in lines:
        print(line, end="")
        if 'HEADER_BLOCK_END' in line:
            print(";Header Start")
            print(";estimated_time(s): " + str(time))
            print(";thumbnail: data:image/png;base64," + thumbnail.replace("\n", ""))
            print(";matierial_weight: " + str(filament_use_gr))
            print(";matierial_length: " + str(filament_use_m))
            print(";layer_number: " + str(layer_number))
            print(";layer_height: " + str(layer_height))
            print(";nozzle_0_material: " + str(nozzle_0_material))
            print(";nozzle_1_material: " + str(nozzle_1_material))
            print(";nozzle_0_diameter(mm): " + str(nozzle_0_diameter))
            print(";nozzle_1_diameter(mm): " + str(nozzle_1_diameter))


            print(";Header End\n")


except IOError:
    input("File not found.Press enter.")
    sys.exit(1)

print(file_name)
