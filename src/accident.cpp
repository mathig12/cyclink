#include "accident.h"
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <math.h>

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

#define IMPACT_THRESHOLD 10.0
#define TILT_THRESHOLD 30.0

void initAccelerometer() {
    accel.begin();
    accel.setRange(ADXL345_RANGE_16_G);
}

AccidentData checkAccident() {

    sensors_event_t event;
    accel.getEvent(&event);

    float x = event.acceleration.x;
    float y = event.acceleration.y;
    float z = event.acceleration.z;

    float magnitude = sqrt(x*x + y*y + z*z);

    float tilt = atan2(sqrt(x*x + y*y), z) * 180.0 / PI;

    AccidentData data;

    if (magnitude > IMPACT_THRESHOLD && tilt > TILT_THRESHOLD) {
        data.detected = true;
        data.impact = magnitude;
        data.tilt = tilt;
    } else {
        data.detected = false;
    }

    return data;
}