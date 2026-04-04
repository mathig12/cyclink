import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

export interface BLESensorData {
  impact: number;
  tilt: number;
  lat: number;
  lon: number;
  mode: number;
  timestamp?: number; // Unix milliseconds when data was received
}

class BLEServiceManager {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  // Based on your main.cpp
  private SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
  private CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

  constructor() {
    this.manager = new BleManager();
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true; // iOS permissions handled by config-plugins mostly, but could enhance later
  }

  public scanAndConnect(onDataUpdate: (data: BLESensorData) => void, onConnectStatusChange: (connected: boolean) => void) {
    onConnectStatusChange(false);
    
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("BLE Scan error:", error);
        return;
      }

      if (device?.name === 'CYCLINK_NODE' || device?.localName === 'CYCLINK_NODE') {
        this.manager.stopDeviceScan();
        this.connectToDevice(device, onDataUpdate, onConnectStatusChange);
      }
    });
  }

  private async connectToDevice(device: Device, onDataUpdate: (data: BLESensorData) => void, onConnectStatusChange: (connected: boolean) => void) {
    try {
      const connectedDevice = await device.connect();
      this.connectedDevice = connectedDevice;
      onConnectStatusChange(true);
      
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      connectedDevice.monitorCharacteristicForService(
        this.SERVICE_UUID, 
        this.CHARACTERISTIC_UUID, 
        (error, characteristic) => {
          if (error) {
            console.error(error.message);
            onConnectStatusChange(false);
            return;
          }
          if (characteristic?.value) {
            // BLE strings come as base64 - react-native-ble-plx requires manual decoding or using an external library
            // For simplicity, atob can be used if provided by React Native global, but rn-ble-plx gives Base64 format.
            const decoded = atob(characteristic.value); 
            // format: impact,tilt,lat,lon,mode
            const parts = decoded.split(',');
            if (parts.length >= 5) {
              onDataUpdate({
                impact: parseFloat(parts[0]),
                tilt: parseFloat(parts[1]),
                lat: parseFloat(parts[2]),
                lon: parseFloat(parts[3]),
                mode: parseInt(parts[4], 10),
                timestamp: Date.now(),
              });
            }
          }
        }
      );

      this.manager.onDeviceDisconnected(device.id, (error, d) => {
        onConnectStatusChange(false);
        this.connectedDevice = null;
      });

    } catch (e) {
      console.error("Connection Failed", e);
      onConnectStatusChange(false);
    }
  }

  public disconnect() {
    if (this.connectedDevice) {
      this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.connectedDevice = null;
    }
  }
}

// React Native atob polyfill for BLE Base64 decoding
function atob(input: string = '') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 == 1) throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  for (let bc = 0, bs = 0, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

export const BLEService = new BLEServiceManager();
