#include "accident.h"
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <math.h>

// Create accelerometer object
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

// ===== THRESHOLDS (TUNE LATER) =====
#define IMPACT_THRESHOLD 15.0   // Adjust if needed
#define TILT_THRESHOLD 45.0     // Adjust if needed

// ===== INITIALIZATION =====
void initAccelerometer() {

    if (!accel.begin()) {
        Serial.println("Error: ADXL345 not detected!");
        while (1);
    }

    accel.setRange(ADXL345_RANGE_16_G);

    Serial.println("Accelerometer Initialized");
}

// ===== ACCIDENT CHECK FUNCTION =====
AccidentData checkAccident() {

    sensors_event_t event;
    accel.getEvent(&event);

    float x = event.acceleration.x;
    float y = event.acceleration.y;
    float z = event.acceleration.z;

    // Calculate magnitude (impact)
    float magnitude = sqrt(x * x + y * y + z * z);

    // Calculate tilt angle
    float tilt = atan2(sqrt(x * x + y * y), z) * 180.0 / PI;

    AccidentData data;

    // 🔴 ALWAYS assign values (IMPORTANT FIX)
    data.impact = magnitude;
    data.tilt = tilt;

    // Detection logic
    if (magnitude > IMPACT_THRESHOLD && tilt > TILT_THRESHOLD) {
        data.detected = true;
    } else {
        data.detected = false;
    }

    return data;
}