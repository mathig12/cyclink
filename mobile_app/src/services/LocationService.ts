import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

type LocationListener = (location: LocationData) => void;

class LocationServiceProvider {
  private listeners: Set<LocationListener> = new Set();
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastLocation: LocationData | null = null;
  private isTracking: boolean = false;

  // For future BLE/ESP32 fusion, we can simply call `pushLocationUpdate` from the BLE service
  public pushLocationUpdate(location: LocationData) {
    this.lastLocation = location;
    this.listeners.forEach((listener) => listener(location));
  }

  public subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    if (this.lastLocation) {
      listener(this.lastLocation);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async startTracking(): Promise<boolean> {
    if (this.isTracking) return true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return false;
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          this.pushLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          });
        }
      );

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  public stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
  }

  public getLastLocation(): LocationData | null {
    return this.lastLocation;
  }
}

export const LocationService = new LocationServiceProvider();
