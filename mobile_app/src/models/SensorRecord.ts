/**
 * SensorRecord: Unified data model for all sensor readings (hardware + mobile)
 * Includes timestamps and metadata for persistence and playback
 */

export interface SensorRecord {
  id?: number;                // SQLite primary key
  rideId: string;             // Group identifier for a single ride session
  timestamp: number;          // Unix milliseconds
  source: 'hardware' | 'mobile'; // Which device generated this reading
  
  // Sensor data
  impact: number;             // G-force
  tilt?: number;              // Only from hardware
  latitude: number;           // Device location
  longitude: number;          // Device location
  mode: number;               // System state (0-4)
  
  // Metadata
  deviceName?: string;        // "ESP32" or "Mobile"
  isEmergency?: boolean;      // Cached flag for mode >= 3
}

export interface RideSession {
  id?: string;                // e.g., UUID or timestamp-based
  startTime: number;          // Unix milliseconds
  endTime?: number;           // When ride ended
  duration?: number;          // Milliseconds
  recordCount: number;        // How many sensor readings
  maxImpact: number;          // Peak G-force during ride
  hasEmergency: boolean;      // Was any emergency event recorded
  notes?: string;             // User notes
  isActive: boolean;          // Currently recording
}

export interface RideStats {
  rideId: string;
  totalDuration: number;      // ms
  recordCount: number;
  maxImpact: number;
  avgImpact: number;
  emergencyCount: number;
  startLocation: { lat: number; lon: number };
  endLocation: { lat: number; lon: number };
  distance?: number;          // Haversine calculated distance
}
