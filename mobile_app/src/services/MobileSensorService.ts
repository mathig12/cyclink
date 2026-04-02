import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

export interface MobileSensorData {
  impact: number;
  lat: number;
  lon: number;
  mode: number; // 0 = NORMAL, 1 = ALERT (Mocking emergency if impact > threshold)
}

class MobileSensorServiceManager {
  private subscription: any = null;
  private locationSubscription: any = null;
  private currentLat = 0;
  private currentLon = 0;
  private isListening = false;

  public async startListening(callback: (data: MobileSensorData) => void) {
    if (this.isListening) return;

    // 1. Request Locations
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      console.warn('Permission to access location was denied');
      return;
    }

    // Start Location updates
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (loc) => {
        this.currentLat = loc.coords.latitude;
        this.currentLon = loc.coords.longitude;
      }
    );

    // 2. Start Accelerometer
    Accelerometer.setUpdateInterval(200); // 5Hz matching ESP32
    this.subscription = Accelerometer.addListener((accelData) => {
      // Calculate G-Force impact (total vector magnitude)
      const gForce = Math.sqrt(
        accelData.x * accelData.x + 
        accelData.y * accelData.y + 
        accelData.z * accelData.z
      );

      // Simple mock: if G-force > 2.5G, we consider it a mobile phone drop/crash (ALERT mode)
      const mode = gForce > 2.5 ? 1 : 0; 
      
      callback({
        impact: Number(gForce.toFixed(2)),
        lat: this.currentLat,
        lon: this.currentLon,
        mode,
      });
    });

    this.isListening = true;
  }

  public stopListening() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isListening = false;
  }
}

export const MobileSensorService = new MobileSensorServiceManager();
