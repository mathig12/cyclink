#ifndef ACCIDENT_H
#define ACCIDENT_H

struct AccidentData {
    bool detected;
    float impact;
    float tilt;
};

void initAccelerometer();
AccidentData checkAccident();

#endif