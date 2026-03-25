#include "gps_module.h"
#include <TinyGPS++.h>
#include <HardwareSerial.h>

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

void initGPS() {
    gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
}

bool getGPS(float &lat, float &lon) {

    while (gpsSerial.available()) {
        gps.encode(gpsSerial.read());
    }

    if (gps.location.isUpdated()) {
        lat = gps.location.lat();
        lon = gps.location.lng();
        return true;
    }

    return false;
}