// src/services/MobileSensorService.ts
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';

export interface MobileSensorData {
  impact:    number;
  tilt:      number;
  lat:       number;
  lon:       number;
  mode:      number;   // 0=NORMAL 1=ALERT 2=CONFIRMATION 3=EMERGENCY 4=SOS
  timestamp: number;
}

// Matches ESP32 SystemMode enum exactly
const MODE = {
  NORMAL:       0,
  ALERT:        1,
  CONFIRMATION: 2,
  EMERGENCY:    3,
  SOS:          4,
};

class MobileSensorServiceManager {
  private subscription:         any  = null;
  private locationSubscription: any  = null;
  private currentLat               = 0;
  private currentLon               = 0;
  private isListening              = false;

  // Accident detection state — mirrors ESP32 state machine
  private currentMode              = MODE.NORMAL;
  private confirmStartTime: number | null = null;
  private readonly CONFIRM_TIMEOUT = 30000; // 30s — same as ESP32

  // Thresholds — net force after removing 1G gravity baseline
  private readonly IMPACT_THRESHOLD = 1.5;  // net G above rest
  private readonly TILT_THRESHOLD   = 45;   // degrees

  // ── Start ────────────────────────────────────────────────────────────────

  public async startListening(
    callback: (data: MobileSensorData) => void
  ): Promise<void> {
    if (this.isListening) return;

    // Location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Mobile] Location permission denied');
      return;
    }

    // GPS updates
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy:         Location.Accuracy.High,
        timeInterval:     2000,
        distanceInterval: 1,
      },
      (loc) => {
        this.currentLat = loc.coords.latitude;
        this.currentLon = loc.coords.longitude;
      }
    );

    // Accelerometer — 5Hz matching ESP32
    Accelerometer.setUpdateInterval(200);
    this.subscription = Accelerometer.addListener((accel) => {
      const raw = Math.sqrt(
        accel.x * accel.x +
        accel.y * accel.y +
        accel.z * accel.z
      );

      // Remove gravity baseline (1G at rest) — same fix as ESP32
      const netImpact = Math.abs(raw - 1.0);

      // Tilt angle in degrees — same formula as accident.h
      const tilt = Math.atan2(
        Math.sqrt(accel.x * accel.x + accel.y * accel.y),
        accel.z
      ) * (180 / Math.PI);

      // Run state machine
      this.updateMode(netImpact, tilt);

      callback({
        impact:    Number(netImpact.toFixed(2)),
        tilt:      Number(tilt.toFixed(2)),
        lat:       this.currentLat,
        lon:       this.currentLon,
        mode:      this.currentMode,
        timestamp: Date.now(),
      });
    });

    this.isListening = true;
    console.log('[Mobile] Sensor service started');
  }

  // ── State machine — mirrors ESP32 logic exactly ───────────────────────────

  private updateMode(impact: number, tilt: number): void {
    const accidentDetected =
      impact > this.IMPACT_THRESHOLD &&
      tilt   > this.TILT_THRESHOLD;

    switch (this.currentMode) {

      case MODE.NORMAL:
        if (accidentDetected) {
          console.log('[Mobile] Accident detected — entering CONFIRMATION');
          this.confirmStartTime = Date.now();
          this.currentMode = MODE.CONFIRMATION;
        }
        break;

      case MODE.CONFIRMATION:
        if (this.confirmStartTime === null) {
          this.currentMode = MODE.NORMAL;
          break;
        }
        const elapsed = Date.now() - this.confirmStartTime;
        if (elapsed > this.CONFIRM_TIMEOUT) {
          // No cancellation received — auto confirm
          console.log('[Mobile] Confirmation timeout — EMERGENCY');
          this.currentMode = MODE.EMERGENCY;
          this.confirmStartTime = null;
        }
        // else stay in CONFIRMATION until timeout or user cancels
        break;

      case MODE.EMERGENCY:
        // Stay in EMERGENCY — cleared by resetMode()
        break;

      case MODE.SOS:
        // Stay in SOS — cleared by resetMode()
        break;

      default:
        break;
    }
  }

  // ── Public controls ───────────────────────────────────────────────────────

  // Called when user presses "I'm OK" during confirmation
  public cancelAccident(): void {
    if (this.currentMode === MODE.CONFIRMATION) {
      console.log('[Mobile] Accident cancelled by user');
      this.confirmStartTime = null;
      this.currentMode = MODE.NORMAL;
    }
  }

  // Called when user presses SOS button in app
  public triggerSOS(): void {
    console.log('[Mobile] SOS triggered by user');
    this.currentMode = MODE.SOS;
  }

  // Reset back to normal after emergency handled
  public resetMode(): void {
    this.currentMode = MODE.NORMAL;
    this.confirmStartTime = null;
  }

  public getMode(): number {
    return this.currentMode;
  }

  // ── Stop ─────────────────────────────────────────────────────────────────

  public stopListening(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isListening = false;
    this.currentMode = MODE.NORMAL;
    this.confirmStartTime = null;
    console.log('[Mobile] Sensor service stopped');
  }
}

export const MobileSensorService = new MobileSensorServiceManager();