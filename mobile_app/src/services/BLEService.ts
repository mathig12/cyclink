// src/services/BLEService.ts
import { BleManager, Device } from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";

export interface BLESensorData {
  impact: number; // net G-force
  tilt: number; // degrees
  lat: number;
  lon: number;
  mode: number; // 0=NORMAL 1=ALERT 2=CONFIRMATION 3=EMERGENCY 4=SOS
  satellites: number; // GPS satellite count
  timestamp: number;
}

// ── atob polyfill — MUST be above the class ───────────────────────────────────
function atob(input: string = ""): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input.replace(/=+$/, "");
  let output = "";
  if (str.length % 4 === 1) throw new Error("atob: bad encoding");
  for (
    let bc = 0, bs = 0, buffer: any, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
// ─────────────────────────────────────────────────────────────────────────────

class BLEServiceManager {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private isConnecting: boolean = false;
  private lastKnownDeviceId: string | null = null;

  private readonly SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
  private readonly CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

  constructor() {
    this.manager = new BleManager();
  }

  // ── Permissions ──────────────────────────────────────────────────────────────
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        granted["android.permission.BLUETOOTH_CONNECT"] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.BLUETOOTH_SCAN"] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.ACCESS_FINE_LOCATION"] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }

  // ── Scan & Connect ────────────────────────────────────────────────────────────
  public async scanAndConnect(
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void,
  ): Promise<void> {
    if (this.connectedDevice) {
      onConnectStatusChange(true);
      return;
    }
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    onConnectStatusChange(false);

    const state = await this.manager.state();
    if (state !== "PoweredOn") {
      console.warn("[BLE] Not powered on:", state);
      this.isConnecting = false;
      onConnectStatusChange(false);
      return;
    }

    // Check if OS already holds the connection
    try {
      const nativelyConnected = await this.manager.connectedDevices([
        this.SERVICE_UUID,
      ]);
      const bg = nativelyConnected.find(
        (d) => d.name === "CYCLINK_NODE" || d.localName === "CYCLINK_NODE",
      );
      if (bg) {
        console.log("[BLE] Reusing OS background connection");
        this.lastKnownDeviceId = bg.id;
        await this.setupDevice(bg, onDataUpdate, onConnectStatusChange);
        return;
      }
    } catch (_) {}

    // Cancel any stale ghost connection before scanning
    await this.cancelStale();

    console.log("[BLE] Scanning...");
    let found = false;

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("[BLE] Scan error:", error.message);
        this.isConnecting = false;
        onConnectStatusChange(false);
        return;
      }
      if (!device?.id || found) return;
      if (
        device.name === "CYCLINK_NODE" ||
        device.localName === "CYCLINK_NODE"
      ) {
        found = true;
        console.log("[BLE] Found CYCLINK_NODE");
        this.manager.stopDeviceScan();
        this.lastKnownDeviceId = device.id;
        this.connectToDevice(device, onDataUpdate, onConnectStatusChange);
      }
    });
  }

  // ── Cancel stale ─────────────────────────────────────────────────────────────
  private async cancelStale(): Promise<void> {
    if (this.lastKnownDeviceId) {
      try {
        await this.manager.cancelDeviceConnection(this.lastKnownDeviceId);
      } catch (_) {}
    }
    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      } catch (_) {}
      this.connectedDevice = null;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  // ── Connect ───────────────────────────────────────────────────────────────────
  private async connectToDevice(
    device: Device,
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void,
  ): Promise<void> {
    try {
      console.log("[BLE] Connecting...");
      const connected = await device.connect();
      this.connectedDevice = connected;

      if (Platform.OS === "android") {
        try {
          await connected.requestMTU(185);
          console.log("[BLE] MTU set to 185");
        } catch (_) {
          console.warn("[BLE] MTU request failed");
        }
      }

      await this.setupDevice(connected, onDataUpdate, onConnectStatusChange);
    } catch (e: any) {
      console.error("[BLE] Connect failed:", e.message);
      if (e.message?.includes("already connected")) {
        try {
          await this.manager.cancelDeviceConnection(device.id);
        } catch (_) {}
      }
      this.connectedDevice = null;
      this.isConnecting = false;
      onConnectStatusChange(false);
    }
  }

  // ── Setup device (shared for new + background) ────────────────────────────────
  private async setupDevice(
    device: Device,
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void,
  ): Promise<void> {
    try {
      console.log("[BLE] Discovering services...");
      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;
      this.isConnecting = false;
      onConnectStatusChange(true);
      console.log("[BLE] Connected and ready");

      this.startMonitor(device, onDataUpdate, onConnectStatusChange);

      this.manager.onDeviceDisconnected(device.id, () => {
        console.log("[BLE] Disconnected unexpectedly");
        this.connectedDevice = null;
        this.isConnecting = false;
        onConnectStatusChange(false);
      });
    } catch (e: any) {
      console.error("[BLE] Setup failed:", e.message);
      this.connectedDevice = null;
      this.isConnecting = false;
      onConnectStatusChange(false);
    }
  }

  // ── Monitor characteristic ────────────────────────────────────────────────────
  private startMonitor(
    device: Device,
    onDataUpdate: (data: BLESensorData) => void,
    onConnectStatusChange: (connected: boolean) => void,
  ): void {
    console.log("[BLE] Starting monitor...");

    device.monitorCharacteristicForService(
      this.SERVICE_UUID,
      this.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          if (
            error.message?.includes("cancelled") ||
            error.message?.includes("destroyed") ||
            error.message?.includes("disconnected")
          ) {
            return;
          }
          console.error("[BLE] Monitor error:", error.message);
          onConnectStatusChange(false);
          return;
        }

        if (!characteristic?.value) return;

        try {
          const decoded = atob(characteristic.value);
          const parts = decoded.split(",");

          // Payload: impact,tilt,lat,lon,mode,sats (6 parts)
          // Accept minimum 2 parts (impact+tilt always sent even without GPS)
          if (parts.length >= 2) {
            const data: BLESensorData = {
              impact: parseFloat(parts[0]) || 0,
              tilt: parseFloat(parts[1]) || 0,
              lat: parts.length > 2 ? parseFloat(parts[2]) : 0,
              lon: parts.length > 3 ? parseFloat(parts[3]) : 0,
              mode: parts.length > 4 ? parseInt(parts[4], 10) : 0,
              satellites: parts.length > 5 ? parseInt(parts[5], 10) : 0,
              timestamp: Date.now(),
            };

            if (parts.length < 6) {
              console.warn(
                `[BLE] Short payload ${parts.length}/6 parts — MTU may be low: "${decoded}"`,
              );
            }

            onDataUpdate(data);
          } else {
            console.warn(`[BLE] Unparseable payload: "${decoded}"`);
          }
        } catch (e) {
          console.error("[BLE] Decode error:", e);
        }
      },
    );
  }

  // ── Disconnect ────────────────────────────────────────────────────────────────
  public disconnect(): void {
    this.manager.stopDeviceScan();
    if (this.connectedDevice) {
      this.manager
        .cancelDeviceConnection(this.connectedDevice.id)
        .catch((e) => console.warn("[BLE] Disconnect warning:", e.message));
      this.connectedDevice = null;
    }
    this.isConnecting = false;
  }

  public isDeviceConnected(): boolean {
    return this.connectedDevice !== null;
  }

  public getConnectionStatus(): "connected" | "connecting" | "disconnected" {
    if (this.connectedDevice) return "connected";
    if (this.isConnecting) return "connecting";
    return "disconnected";
  }
}

export const BLEService = new BLEServiceManager();
