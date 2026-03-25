#include <Arduino.h>
#include "accident.h"
#include "gps_module.h"

struct AccidentEvent {
    unsigned long timestamp;
    float latitude;
    float longitude;
    float impact;
    float tilt;
};

void setup() {
    Serial.begin(115200);

    initAccelerometer();
    initGPS();

    Serial.println("CYCLINK NODE STARTED");
}

void loop() {

    AccidentData acc = checkAccident();

    if (acc.detected) {

        float lat = 0, lon = 0;

        if (getGPS(lat, lon)) {

            AccidentEvent event;

            event.timestamp = millis();
            event.latitude = lat;
            event.longitude = lon;
            event.impact = acc.impact;
            event.tilt = acc.tilt;

            Serial.println("========== ACCIDENT EVENT ==========");
            Serial.print("Lat: "); Serial.println(event.latitude, 6);
            Serial.print("Lon: "); Serial.println(event.longitude, 6);
            Serial.print("Impact: "); Serial.println(event.impact);
            Serial.print("Tilt: "); Serial.println(event.tilt);
            Serial.println("====================================");
        }
        else {
            Serial.println("GPS not fixed yet...");
        }

        delay(5000); // prevent spamming
    }

    delay(100);
}