#include <Arduino.h>
#include "accident.h"
#include "gps_module.h"

#define BUTTON_PIN 4

enum SystemMode {
    NORMAL,
    ALERT,
    CONFIRMATION,
    EMERGENCY,
    SOS
};


void sendLocation();

SystemMode currentMode = NORMAL;

unsigned long confirmStartTime = 0;
const unsigned long CONFIRMATION_TIMEOUT = 30000;

// Long press tracking
unsigned long buttonPressStart = 0;
bool buttonHeld = false;

void setup() {
    Serial.begin(115200);

    pinMode(BUTTON_PIN, INPUT);

    initAccelerometer();
    initGPS();

    Serial.println("CYCLINK NODE STARTED");
}

void loop() {

    AccidentData acc = checkAccident();

    // ================= BUTTON LONG PRESS DETECTION =================
    if (digitalRead(BUTTON_PIN) == HIGH) {

        if (!buttonHeld) {
            buttonHeld = true;
            buttonPressStart = millis();
        }

        if (millis() - buttonPressStart > 3000 && currentMode == NORMAL) {
            currentMode = SOS;
        }

    } else {
        buttonHeld = false;
    }

    switch (currentMode) {

        // ================= NORMAL =================
        case NORMAL:

            Serial.print("[DATA] Impact: ");
            Serial.print(acc.impact);
            Serial.print("  Tilt: ");
            Serial.println(acc.tilt);

            if (acc.detected) {
                Serial.println("[EVENT] Possible Accident Detected");
                currentMode = ALERT;
            }

            break;

        // ================= ALERT =================
        case ALERT:

            Serial.println("\n=== MODE: ALERT ===");
            Serial.println("Entering confirmation mode...");
            confirmStartTime = millis();
            currentMode = CONFIRMATION;

            break;

        // ================= CONFIRMATION =================
        case CONFIRMATION:

            Serial.println("\n=== MODE: CONFIRMATION ===");
            Serial.println("Press button within 30 seconds to cancel");

            // Short press = cancel
            if (digitalRead(BUTTON_PIN) == HIGH) {
                Serial.println("FALSE ALARM: Rider is safe");
                Serial.println("Returning to NORMAL mode\n");
                currentMode = NORMAL;
                break;
            }

            if (millis() - confirmStartTime > CONFIRMATION_TIMEOUT) {
                Serial.println("[EVENT] No response. Accident confirmed.");
                currentMode = EMERGENCY;
            }

            delay(1000);
            break;

        // ================= EMERGENCY =================
        case EMERGENCY:

            Serial.println("\n==================================");
            Serial.println("MODE: EMERGENCY");
            Serial.println("ACCIDENT CONFIRMED");
            Serial.println("Alerting Nearby Group Members...");
            Serial.println("==================================");

            sendLocation();

            delay(10000);

            Serial.println("\nReturning to NORMAL mode...\n");
            currentMode = NORMAL;

            break;

        // ================= SOS =================
        case SOS:

            Serial.println("\n==================================");
            Serial.println("MODE: SOS");
            Serial.println("MANUAL EMERGENCY TRIGGERED");
            Serial.println("Alerting Nearby Group Members...");
            Serial.println("==================================");

            sendLocation();

            delay(10000);

            Serial.println("\nReturning to NORMAL mode...\n");
            currentMode = NORMAL;

            break;
    }

    delay(200);
}

// ================= GPS HELPER =================
void sendLocation() {

    float lat = 0, lon = 0;

    if (getGPS(lat, lon)) {
        Serial.print("Lat: "); Serial.println(lat, 6);
        Serial.print("Lon: "); Serial.println(lon, 6);
    } else {
        Serial.println("GPS not fixed yet...");
    }
}