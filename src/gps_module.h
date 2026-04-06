#pragma once

void  initGPS();
bool  getGPS(float &lat, float &lon);
bool  hasGPSFix();
int   getGPSSatellites();
float getGPSHDOP();