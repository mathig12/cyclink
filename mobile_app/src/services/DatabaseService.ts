import * as SQLite from 'expo-sqlite';
import { SensorRecord, RideSession, RideStats } from '../models/SensorRecord';

class DatabaseServiceManager {
  private db: SQLite.SQLiteDatabase | null = null;

  public async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('cyclink.db');
      await this.createTables();
      console.log('DatabaseService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Rides table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        duration INTEGER,
        recordCount INTEGER DEFAULT 0,
        maxImpact REAL DEFAULT 0,
        hasEmergency INTEGER DEFAULT 0,
        notes TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sensor records table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sensor_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rideId TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        source TEXT NOT NULL,
        impact REAL NOT NULL,
        tilt REAL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        mode INTEGER NOT NULL,
        deviceName TEXT,
        isEmergency INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rideId) REFERENCES rides(id)
      );
    `);

    // Create indices for faster queries
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_ride_id ON sensor_records(rideId);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_source ON sensor_records(source);
    `);
  }

  // ========== RIDE SESSION MANAGEMENT ==========

  public async createRide(notes?: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const rideId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO rides (id, startTime, isActive) VALUES (?, ?, 1)`,
      [rideId, now]
    );

    console.log(`Ride created: ${rideId}`);
    return rideId;
  }

  public async endRide(rideId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    
    await this.db.runAsync(`
      UPDATE rides 
      SET endTime = ?, duration = (? - startTime), isActive = 0 
      WHERE id = ?
    `, [now, now, rideId]);

    console.log(`Ride ended: ${rideId}`);
  }

  public async getRideStats(rideId: string): Promise<RideStats | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(`
      SELECT 
        r.id,
        r.startTime,
        r.endTime,
        r.duration,
        COUNT(sr.id) as recordCount,
        MAX(sr.impact) as maxImpact,
        AVG(sr.impact) as avgImpact,
        SUM(CASE WHEN sr.isEmergency = 1 THEN 1 ELSE 0 END) as emergencyCount
      FROM rides r
      LEFT JOIN sensor_records sr ON r.id = sr.rideId
      WHERE r.id = ?
      GROUP BY r.id
    `, [rideId]);

    if (!result) return null;

    // Get first and last location
    const locations = await this.db.getAllAsync<any>(`
      SELECT latitude, longitude, timestamp
      FROM sensor_records
      WHERE rideId = ?
      ORDER BY timestamp ASC
      LIMIT 2
    `, [rideId]);

    return {
      rideId: result.id,
      totalDuration: result.duration || 0,
      recordCount: result.recordCount || 0,
      maxImpact: result.maxImpact || 0,
      avgImpact: parseFloat(result.avgImpact || 0),
      emergencyCount: result.emergencyCount || 0,
      startLocation: locations[0] ? { lat: locations[0].latitude, lon: locations[0].longitude } : { lat: 0, lon: 0 },
      endLocation: locations[locations.length - 1] ? { lat: locations[locations.length - 1].latitude, lon: locations[locations.length - 1].longitude } : { lat: 0, lon: 0 },
    };
  }

  public async getAllRides(): Promise<RideSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<any>(`
      SELECT id, startTime, endTime, duration, recordCount, maxImpact, hasEmergency, notes, isActive
      FROM rides
      ORDER BY startTime DESC
      LIMIT 100
    `);

    return result.map(row => ({
      id: row.id,
      startTime: row.startTime,
      endTime: row.endTime,
      duration: row.duration,
      recordCount: row.recordCount || 0,
      maxImpact: row.maxImpact || 0,
      hasEmergency: row.hasEmergency === 1,
      notes: row.notes,
      isActive: row.isActive === 1,
    }));
  }

  public async deleteRide(rideId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM sensor_records WHERE rideId = ?', [rideId]);
    await this.db.runAsync('DELETE FROM rides WHERE id = ?', [rideId]);

    console.log(`Ride deleted: ${rideId}`);
  }

  // ========== SENSOR RECORD MANAGEMENT ==========

  public async insertSensorRecord(record: SensorRecord, rideId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const isEmergency = record.mode >= 3 ? 1 : 0;

    const result = await this.db.runAsync(
      `INSERT INTO sensor_records 
       (rideId, timestamp, source, impact, tilt, latitude, longitude, mode, deviceName, isEmergency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rideId,
        record.timestamp,
        record.source,
        record.impact,
        record.tilt || null,
        record.latitude,
        record.longitude,
        record.mode,
        record.deviceName || record.source,
        isEmergency,
      ]
    );

    // Update ride stats
    await this.updateRideStats(rideId);

    return result.lastInsertRowId;
  }

  private async updateRideStats(rideId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.getFirstAsync<any>(`
      SELECT 
        MAX(impact) as maxImpact,
        COUNT(*) as recordCount,
        MAX(CASE WHEN isEmergency = 1 THEN 1 ELSE 0 END) as hasEmergency
      FROM sensor_records
      WHERE rideId = ?
    `, [rideId]);

    if (stats) {
      await this.db.runAsync(
        `UPDATE rides SET maxImpact = ?, recordCount = ?, hasEmergency = ? WHERE id = ?`,
        [stats.maxImpact || 0, stats.recordCount || 0, stats.hasEmergency || 0, rideId]
      );
    }
  }

  public async getSensorRecords(rideId: string, limit: number = 1000): Promise<SensorRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<any>(`
      SELECT id, rideId, timestamp, source, impact, tilt, latitude, longitude, mode, deviceName, isEmergency
      FROM sensor_records
      WHERE rideId = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `, [rideId, limit]);

    return result.map(row => ({
      id: row.id,
      rideId: row.rideId,
      timestamp: row.timestamp,
      source: row.source,
      impact: row.impact,
      tilt: row.tilt,
      latitude: row.latitude,
      longitude: row.longitude,
      mode: row.mode,
      deviceName: row.deviceName,
      isEmergency: row.isEmergency === 1,
    }));
  }

  public async getLatestSensorData(rideId: string, source?: 'hardware' | 'mobile'): Promise<SensorRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT id, rideId, timestamp, source, impact, tilt, latitude, longitude, mode, deviceName, isEmergency
      FROM sensor_records
      WHERE rideId = ?
    `;
    const params: any[] = [rideId];

    if (source) {
      query += ` AND source = ?`;
      params.push(source);
    }

    query += ` ORDER BY timestamp DESC LIMIT 1`;

    const result = await this.db.getFirstAsync<any>(query, params);

    if (!result) return null;

    return {
      id: result.id,
      rideId: result.rideId,
      timestamp: result.timestamp,
      source: result.source,
      impact: result.impact,
      tilt: result.tilt,
      latitude: result.latitude,
      longitude: result.longitude,
      mode: result.mode,
      deviceName: result.deviceName,
      isEmergency: result.isEmergency === 1,
    };
  }

  public async getEmergencyEvents(rideId: string): Promise<SensorRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<any>(`
      SELECT id, rideId, timestamp, source, impact, tilt, latitude, longitude, mode, deviceName, isEmergency
      FROM sensor_records
      WHERE rideId = ? AND isEmergency = 1
      ORDER BY timestamp ASC
    `, [rideId]);

    return result.map(row => ({
      id: row.id,
      rideId: row.rideId,
      timestamp: row.timestamp,
      source: row.source,
      impact: row.impact,
      tilt: row.tilt,
      latitude: row.latitude,
      longitude: row.longitude,
      mode: row.mode,
      deviceName: row.deviceName,
      isEmergency: row.isEmergency === 1,
    }));
  }

  // ========== BULK OPERATIONS ==========

  public async clearOldRides(daysToKeep: number = 30): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const oldRides = await this.db.getAllAsync<any>(
      `SELECT id FROM rides WHERE startTime < ?`,
      [cutoffTime]
    );

    for (const ride of oldRides) {
      await this.deleteRide(ride.id);
    }

    console.log(`Cleared ${oldRides.length} rides older than ${daysToKeep} days`);
  }

  public async exportRideAsJSON(rideId: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const ride = await this.db.getFirstAsync<any>(
      `SELECT id, startTime, endTime, duration, maxImpact, hasEmergency, notes FROM rides WHERE id = ?`,
      [rideId]
    );

    const records = await this.getSensorRecords(rideId);

    const data = {
      ride,
      records,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const DatabaseService = new DatabaseServiceManager();
