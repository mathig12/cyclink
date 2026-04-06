#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "accident.h"
#include "gps_module.h"

#define BUTTON_PIN 4

#define SERVICE_UUID        "12345678-1234-5678-1234-56789abcdef0"
#define CHARACTERISTIC_UUID "12345678-1234-5678-1234-56789abcdef1"

BLEServer*         pServer         = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool               deviceConnected = false;

enum SystemMode {
    NORMAL       = 0,
    ALERT        = 1,
    CONFIRMATION = 2,
    EMERGENCY    = 3,
    SOS          = 4
};

void sendLocation();

SystemMode    currentMode      = NORMAL;
unsigned long confirmStartTime = 0;
const unsigned long CONFIRMATION_TIMEOUT = 30000;

unsigned long buttonPressStart = 0;
bool          buttonHeld       = false;

class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
        deviceConnected = true;
        Serial.println("BLE Client Connected!");
    }
    void onDisconnect(BLEServer* pServer) override {
        deviceConnected = false;
        Serial.println("BLE Client Disconnected! Restarting advertising...");
        pServer->getAdvertising()->start();
    }
};

void setup() {
    Serial.begin(115200);
    delay(500);

    pinMode(BUTTON_PIN, INPUT);

    initAccelerometer();
    initGPS();

    BLEDevice::init("CYCLINK_NODE");
    BLEDevice::setMTU(185);

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService* pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(false);
    pAdvertising->setMinPreferred(0x0);
    BLEDevice::startAdvertising();

    Serial.println("CYCLINK NODE STARTED. BLE Advertising Active.");
}

void loop() {

    // 1. Read accelerometer
    AccidentData acc = checkAccident();

    // 2. Button — long press = SOS, short press = cancel confirmation
    bool buttonHigh = (digitalRead(BUTTON_PIN) == HIGH);

    if (buttonHigh) {
        if (!buttonHeld) {
            buttonHeld       = true;
            buttonPressStart = millis();
        }
        if (millis() - buttonPressStart > 3000 && currentMode == NORMAL) {
            Serial.println("[BUTTON] Long press — SOS triggered");
            currentMode = SOS;
        }
    } else {
        if (buttonHeld && currentMode == CONFIRMATION) {
            unsigned long held = millis() - buttonPressStart;
            if (held < 2000) {
                Serial.println("FALSE ALARM: Rider is safe");
                Serial.println("Returning to NORMAL mode\n");
                currentMode = NORMAL;
            }
        }
        buttonHeld = false;
    }

    // 3. Read GPS (cached — never returns 0,0 after first fix)
    float lat      = 0.0f, lon = 0.0f;
    bool  gpsFixed = getGPS(lat, lon);

    // 4. Send BLE payload: impact,tilt,lat,lon,mode,sats
    if (deviceConnected) {
        char payload[80];
        snprintf(payload, sizeof(payload),
                 "%.2f,%.2f,%.5f,%.5f,%d,%d",
                 acc.impact, acc.tilt,
                 lat, lon,
                 (int)currentMode,
                 getGPSSatellites());
        pCharacteristic->setValue((uint8_t*)payload, strlen(payload));
        pCharacteristic->notify();
    }

    // 5. State machine
    switch (currentMode) {

        case NORMAL:
            Serial.print("[DATA] Impact: ");
            Serial.print(acc.impact, 2);
            Serial.print("  Tilt: ");
            Serial.print(acc.tilt, 2);
            Serial.print("  GPS: ");
            Serial.print(gpsFixed ? "FIXED" : "NO FIX");
            if (gpsFixed) {
                Serial.print("  Lat: ");
                Serial.print(lat, 5);
                Serial.print("  Lon: ");
                Serial.print(lon, 5);
            }
            Serial.print("  Sats: ");
            Serial.println(getGPSSatellites());

            if (acc.detected) {
                Serial.println("[EVENT] Possible Accident Detected");
                currentMode = ALERT;
            }
            break;

        case ALERT:
            Serial.println("\n=== MODE: ALERT ===");
            Serial.println("Entering confirmation mode...");
            confirmStartTime = millis();
            currentMode      = CONFIRMATION;
            break;

        case CONFIRMATION:
            Serial.print("\n=== MODE: CONFIRMATION === ");
            Serial.print((CONFIRMATION_TIMEOUT - (millis() - confirmStartTime)) / 1000);
            Serial.println("s remaining. Press button to cancel.");

            if (millis() - confirmStartTime > CONFIRMATION_TIMEOUT) {
                Serial.println("[EVENT] No response. Accident confirmed.");
                currentMode = EMERGENCY;
            }
            delay(1000);
            break;

        case EMERGENCY:
            Serial.println("\n==================================");
            Serial.println("MODE: EMERGENCY — ACCIDENT CONFIRMED");
            Serial.println("Alerting squad via BLE...");
            Serial.println("==================================");
            sendLocation();
            delay(10000); // hold mode=3 so app reads it
            Serial.println("\nReturning to NORMAL mode...\n");
            currentMode = NORMAL;
            break;

        case SOS:
            Serial.println("\n==================================");
            Serial.println("MODE: SOS — MANUAL EMERGENCY");
            Serial.println("Alerting squad via BLE...");
            Serial.println("==================================");
            sendLocation();
            delay(10000); // hold mode=4 so app reads it
            Serial.println("\nReturning to NORMAL mode...\n");
            currentMode = NORMAL;
            break;
    }

    delay(200);
}

void sendLocation() {
    float lat = 0.0f, lon = 0.0f;
    if (getGPS(lat, lon)) {
        Serial.print("Lat: "); Serial.println(lat, 6);
        Serial.print("Lon: "); Serial.println(lon, 6);
        Serial.print("Sats: "); Serial.println(getGPSSatellites());
    } else {
        Serial.println("GPS not fixed yet...");
    }
}