#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "accident.h"
#include "gps_module.h"

#define BUTTON_PIN 4

// BLE UUIDs
#define SERVICE_UUID           "12345678-1234-5678-1234-56789abcdef0"
#define CHARACTERISTIC_UUID    "12345678-1234-5678-1234-56789abcdef1"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

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

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("BLE Client Connected!");
    };
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("BLE Client Disconnected! Restarting advertising...");
        pServer->getAdvertising()->start();
    }
};

void setup() {
    Serial.begin(115200);

    pinMode(BUTTON_PIN, INPUT);

    initAccelerometer();
    initGPS();

    // Init BLE
    BLEDevice::init("CYCLINK_NODE");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());
    BLEService *pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ   |
                        BLECharacteristic::PROPERTY_NOTIFY 
                      );
    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(false);
    pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
    BLEDevice::startAdvertising();

    Serial.println("CYCLINK NODE STARTED. BLE Advertising Active.");
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

    float lat = 0, lon = 0;
    getGPS(lat, lon);

    // Send BLE Telemetry payload if connected
    if (deviceConnected) {
        // Payload format: Impact,Tilt,Lat,Lon,Mode
        String payload = String(acc.impact, 2) + "," + 
                         String(acc.tilt, 2) + "," + 
                         String(lat, 6) + "," + 
                         String(lon, 6) + "," + 
                         String((int)currentMode);
        pCharacteristic->setValue(payload.c_str());
        pCharacteristic->notify();
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