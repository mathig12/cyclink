#include "gps_module.h"
#include <TinyGPS++.h>
#include <HardwareSerial.h>

TinyGPSPlus    gps;
HardwareSerial gpsSerial(1);

// Cache last known valid fix — never go back to 0,0 after first lock
static float lastLat = 0.0f;
static float lastLon = 0.0f;
static bool  hasFix  = false;

void initGPS() {
    gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
    Serial.println("[GPS] Initialized on RX=16, TX=17");
}

bool getGPS(float &lat, float &lon) {
    // Drain ALL available bytes — TinyGPS++ needs the full NMEA sentence
    while (gpsSerial.available() > 0) {
        gps.encode(gpsSerial.read());
    }

    // isValid() = has had a fix at least once (stays true)
    // isUpdated() = only true for the single frame after update (too narrow)
    if (gps.location.isValid()) {
        lastLat = (float)gps.location.lat();
        lastLon = (float)gps.location.lng();
        hasFix  = true;
    }

    if (hasFix) {
        lat = lastLat;
        lon = lastLon;
        return true;
    }

    lat = 0.0f;
    lon = 0.0f;
    return false;
}

bool hasGPSFix() {
    return hasFix;
}

int getGPSSatellites() {
    return (int)gps.satellites.value();
}

float getGPSHDOP() {
    return (float)gps.hdop.hdop();
}