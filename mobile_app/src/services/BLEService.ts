import { BleManager, Device } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

export interface BLESensorData {
  impact: number;
  tilt: number;
  lat: number;
  lon: number;
  mode: number;
  timestamp: number;
}

// ─── atob polyfill (must be above class) ───────────────────────────────────
function atob(input: string = ''): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 === 1) {
    throw new Error(
      "'atob' failed: The string to be decoded is not correctly encoded."
    );
  }

  for (
    let bc = 0,
      bs = 0,
      buffer: any,
      idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer &&
      ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }

  return output;
}

function btoa(input: string = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input;
  let output = '';

  for (
    let block: any = 0, charCode: any, i = 0, map = chars;
    str.charAt(i | 0) || ((map = '='), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt(i += 3 / 4);

    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    
    block = (block << 8) | charCode;
  }
  
  return output;
}
// ────────────────────────────────────────────────────────────────────────────

class BLEServiceManager {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private isConnecting: boolean = false;

  private readonly SERVICE_UUID        = '12345678-1234-5678-1234-56789abcdef0';
  private readonly CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef1';

  constructor() {
    this.manager = new BleManager();
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted['android.permission.BLUETOOTH_CONNECT'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_SCAN'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }

  // ── Scan & Connect ─────────────────────────────────────────────────────────
  public async scanAndConnect(
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void
  ): Promise<void> {
    // Guard 1 — already connected in JS state
    if (this.connectedDevice) {
      console.warn('[BLE] Already connected to a device');
      onConnectStatusChange(true);
      return;
    }

    // Guard 2 — connection already in progress
    if (this.isConnecting) {
      console.warn('[BLE] Connection already in progress');
      return;
    }

    this.isConnecting = true;
    onConnectStatusChange(false);

    try {
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        console.warn('[BLE] Bluetooth is not powered on. State:', state);
        this.isConnecting = false;
        onConnectStatusChange(false);
        return;
      }

      // Check if the OS is ALREADY connected in the background
      const nativelyConnected = await this.manager.connectedDevices([this.SERVICE_UUID]);
      const backgroundDevice = nativelyConnected.find(
        (d) => d.name === 'CYCLINK_NODE' || d.localName === 'CYCLINK_NODE'
      );

      if (backgroundDevice) {
        console.log('[BLE] Found device already connected in OS background! Bypassing scan.');
        await this.setupConnectedDevice(backgroundDevice, onDataUpdate, onConnectStatusChange);
        return; // Stop here, no need to scan!
      }

      console.log('[BLE] Starting device scan...');

      // Local flag to prevent race conditions during rapid callbacks
      let hasFoundDevice = false;

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('[BLE] Scan error:', error.message);
          this.isConnecting = false;
          onConnectStatusChange(false);
          return;
        }

        // Guard against the "Device ?" error by ensuring ID exists
        if (!device || !device.id) return;

        // Guard against multiple callbacks firing before stopDeviceScan() completes
        if (hasFoundDevice) return;

        if (
          device.name === 'CYCLINK_NODE' ||
          device.localName === 'CYCLINK_NODE'
        ) {
          hasFoundDevice = true; // Lock further attempts immediately
          console.log('[BLE] CYCLINK_NODE found. Stopping scan...');

          this.manager.stopDeviceScan();
          this.connectToDevice(device, onDataUpdate, onConnectStatusChange);
        }
      });
    } catch (err: any) {
      console.error('[BLE] Error initializing scan:', err.message);
      this.isConnecting = false;
      onConnectStatusChange(false);
    }
  }

  // ── Connect to Device (Used only if not natively connected) ────────────────
  private async connectToDevice(
    device: Device,
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void
  ): Promise<void> {
    try {
      console.log(`[BLE] Attempting to connect to ${device.id}...`);
      const connectedDevice = await device.connect();

      // 🛡️ FIX: Request MTU of 128 bytes to allow full GPS strings on Android
      if (Platform.OS === 'android') {
        try {
          console.log('[BLE] Requesting MTU 128...');
          await connectedDevice.requestMTU(128);
        } catch (mtuError: any) {
          console.warn('[BLE] MTU Request failed (can safely ignore on some devices):', mtuError.message);
        }
      }

      await this.setupConnectedDevice(connectedDevice, onDataUpdate, onConnectStatusChange);
    } catch (e: any) {
      console.error('[BLE] Connection failed:', e.message);

      // If we STILL hit the ghost connection trap somehow, force a cancel and clear
      if (e.message?.includes('already connected')) {
        console.log('[BLE] Forcing native disconnect to clear ghost state...');
        await this.manager.cancelDeviceConnection(device.id).catch(() => {});
      }

      this.connectedDevice = null;
      this.isConnecting = false;
      onConnectStatusChange(false);
    }
  }

  // ── Setup Device (Shared logic for new and background connections) ─────────
  private async setupConnectedDevice(
    device: Device,
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void
  ): Promise<void> {
    try {
      console.log(`[BLE] Discovering services for ${device.id}...`);
      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;
      this.isConnecting = false;
      onConnectStatusChange(true);

      this.startMonitoring(device, onDataUpdate, onConnectStatusChange);

      // Handle unexpected disconnection
      this.manager.onDeviceDisconnected(device.id, () => {
        console.log('[BLE] Device disconnected unexpectedly');
        this.connectedDevice = null;
        this.isConnecting = false;
        onConnectStatusChange(false);
      });
    } catch (error: any) {
      console.error('[BLE] Failed to setup services:', error.message);
      this.connectedDevice = null;
      this.isConnecting = false;
      onConnectStatusChange(false);
    }
  }

  // ── Monitor Characteristic ─────────────────────────────────────────────────
  private startMonitoring(
    device: Device,
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void
  ): void {
    console.log('[BLE] Starting characteristic monitor...');

    device.monitorCharacteristicForService(
      this.SERVICE_UUID,
      this.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          // Ignore cancellation errors on intentional disconnect
          if (error.message?.includes('cancelled') || error.message?.includes('destroyed')) {
            console.log('[BLE] Monitor cancelled (expected on disconnect)');
            return;
          }
          console.error('[BLE] Monitor error:', error.message);
          onConnectStatusChange(false);
          return;
        }

        if (!characteristic?.value) return;

        try {
          const decoded = atob(characteristic.value);
          const parts = decoded.split(',');

          // 🛡️ FIX: Safe parser. Requires at least impact and tilt (2 items).
          // Defaults missing GPS/Mode variables to 0 if the payload is shortened.
          if (parts.length >= 2) {
            onDataUpdate({
              impact:    parseFloat(parts[0]) || 0,
              tilt:      parseFloat(parts[1]) || 0,
              lat:       parts.length > 2 ? parseFloat(parts[2]) : 0,
              lon:       parts.length > 3 ? parseFloat(parts[3]) : 0,
              mode:      parts.length > 4 ? parseInt(parts[4], 10) : 0,
              timestamp: Date.now(),
            });
          } else {
            console.warn('[BLE] Unexpected payload format (too short):', decoded);
          }
        } catch (decodeError) {
          console.error('[BLE] Failed to decode payload:', decodeError);
        }
      }
    );
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  public disconnect(): void {
    if (this.connectedDevice) {
      console.log('[BLE] Disconnecting device...');
      this.manager
        .cancelDeviceConnection(this.connectedDevice.id)
        .catch((e) => console.warn('[BLE] Disconnect warning:', e.message));
      this.connectedDevice = null;
      this.isConnecting = false;
    } else {
      console.log('[BLE] No device to disconnect');
    }
  }

  // ── Send Cancel / Override Signal ──────────────────────────────────────────
  public async sendCancelSignal(): Promise<boolean> {
    if (!this.connectedDevice) {
      console.warn('[BLE] Cannot send cancel signal. No device connected.');
      return false;
    }
    
    try {
      // 0 = Return to Normal Mode (Safe)
      const payload = btoa('0');

      // The monitor characteristic (abcdef1) might be Notify/Read only.
      // We will dynamically search the service for a Writable characteristic.
      const services = await this.connectedDevice.services();
      let targetChar = null;
      
      for (const service of services) {
        if (service.uuid.toLowerCase() === this.SERVICE_UUID.toLowerCase()) {
          const characteristics = await service.characteristics();
          targetChar = characteristics.find(c => c.isWritableWithResponse || c.isWritableWithoutResponse);
          break;
        }
      }

      if (!targetChar) {
        console.warn('[BLE] Could not find any writable characteristic on the CYCLINK_NODE service.');
        return false;
      }

      if (targetChar.isWritableWithResponse) {
        await targetChar.writeWithResponse(payload);
        console.log('[BLE] Successfully dispatched cancel signal (0) to ESP32 (With Response)');
      } else {
        await targetChar.writeWithoutResponse(payload);
        console.log('[BLE] Successfully dispatched cancel signal (0) to ESP32 (Without Response)');
      }
      return true;
    } catch (e: any) {
      console.warn('[BLE] Failed to write cancel command entirely:', e.message);
      return false;
    }
  }

  // ── State Helpers ──────────────────────────────────────────────────────────
  public isDeviceConnected(): boolean {
    return this.connectedDevice !== null;
  }

  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.connectedDevice) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }
}

export const BLEService = new BLEServiceManager();