/**
 * TelemetryService — Firebase Direct Mode
 *
 * Reads telemetry in real-time directly from Firebase Realtime Database.
 * The ESP32 Ground Station writes JSON packets to /telemetry/{timestamp}.
 * This service listens for new child additions and pushes them to subscribers.
 *
 * No WebSocket server required. Works from any device, anywhere.
 */

import { db } from './firebaseConfig';
import { ref, query, limitToLast, onChildAdded, onValue, off } from 'firebase/database';

// Orientation state (complementary filter, mirrors server-side logic)
const orientationState = {
  pitch: 0, roll: 0, yaw: 0,
  lastTimestamp: 0,
  calibrated: false,
  pitchOffset: 0, rollOffset: 0
};

function calculateOrientation(imu, timestamp) {
  if (!imu || !imu.acceleration) return { roll: 0, pitch: 0, yaw: 0 };

  const dt = orientationState.lastTimestamp
    ? (timestamp - orientationState.lastTimestamp) / 1000
    : 0.1;
  orientationState.lastTimestamp = timestamp;

  const ax = imu.acceleration.x_mps2 || 0;
  const ay = imu.acceleration.y_mps2 || 0;
  const az = imu.acceleration.z_mps2 || 0;

  const accelPitch = Math.atan2(az, -ax) * (180 / Math.PI);
  const accelRoll = Math.atan2(ay, -ax) * (180 / Math.PI);

  if (!orientationState.calibrated && Math.abs(ax) > 8) {
    orientationState.pitchOffset = accelPitch;
    orientationState.rollOffset = accelRoll;
    orientationState.pitch = 0;
    orientationState.roll = 0;
    orientationState.yaw = 0;
    orientationState.calibrated = true;
  }

  const gyroX = (imu.gyroscope?.x_rps || 0) * (180 / Math.PI);
  const gyroY = (imu.gyroscope?.y_rps || 0) * (180 / Math.PI);
  const gyroZ = (imu.gyroscope?.z_rps || 0) * (180 / Math.PI);
  const alpha = 0.98;

  if (orientationState.calibrated) {
    orientationState.pitch = alpha * (orientationState.pitch + gyroY * dt) + (1 - alpha) * (accelPitch - orientationState.pitchOffset);
    orientationState.roll  = alpha * (orientationState.roll  + gyroZ * dt) + (1 - alpha) * (accelRoll  - orientationState.rollOffset);
    orientationState.yaw   = orientationState.yaw + (gyroX * dt);
  }

  return {
    roll:  parseFloat(orientationState.roll.toFixed(2)),
    pitch: parseFloat(orientationState.pitch.toFixed(2)),
    yaw:   parseFloat(orientationState.yaw.toFixed(2))
  };
}

function enrichPacket(packet) {
  if (!packet || !packet.timestamp_ms) return null;

  // Enrich with orientation
  if (packet.imu) {
    const orientation = calculateOrientation(packet.imu, packet.timestamp_ms);
    packet.imu.roll  = orientation.roll;
    packet.imu.pitch = orientation.pitch;
    packet.imu.yaw   = orientation.yaw;
    packet.imu.vertical_accel_mps2 = parseFloat(
      (-(packet.imu.acceleration?.x_mps2 || 0) - 9.807).toFixed(3)
    );
  }

  // Top-level altitude
  packet.altitude_m = packet.bmp280?.altitude_m ?? packet.gps?.altitude_m ?? 0;

  return packet;
}

class TelemetryService {
  constructor() {
    this.subscribers = [];
    this.isConnected = false;
    this._unsubRef = null;   // Firebase listener cleanup
    this._latestTs = 0;      // Track latest timestamp to skip old data
  }

  connect() {
    if (this._unsubRef) return; // already connected

    console.log('[TelemetryService] Connecting to Firebase Realtime Database...');

    const telemetryRef = ref(db, 'telemetry');

    // 1. Skip all historical data by only watching the LAST packet
    //    We use onValue once to record the latest timestamp, then 
    //    switch to onChildAdded so we only get NEW entries.
    const latestQuery = query(telemetryRef, limitToLast(1));

    onValue(latestQuery, (snapshot) => {
      // Record the latest timestamp so we can ignore older children
      snapshot.forEach(child => {
        const pkt = child.val();
        if (pkt?.timestamp_ms) {
          this._latestTs = pkt.timestamp_ms;
          // Also deliver this "latest known" packet immediately to seed the UI
          const enriched = enrichPacket({ ...pkt });
          if (enriched) {
            this.isConnected = true;
            this.emit(enriched);
          }
        }
      });

      console.log(`[TelemetryService] Firebase connected. Last ts: ${this._latestTs}. Watching for new data...`);
      this.isConnected = true;

      // 2. Now attach onChildAdded — Firebase will fire for every new entry
      //    after the ones already loaded.
      const unsubChildAdded = onChildAdded(telemetryRef, (snapshot) => {
        try {
          const packet = snapshot.val();
          if (!packet || !packet.timestamp_ms) return;

          // Skip packets older/equal to what we already have
          if (packet.timestamp_ms <= this._latestTs) return;

          this._latestTs = packet.timestamp_ms;
          const enriched = enrichPacket({ ...packet });
          if (enriched) {
            this.emit(enriched);
          }
        } catch (e) {
          console.error('[TelemetryService] Error processing Firebase packet:', e);
        }
      });

      this._unsubRef = () => {
        off(latestQuery);
        unsubChildAdded(); // Firebase SDK v9 returns unsubscribe fn from onChildAdded
      };

    }, { onlyOnce: true });
  }

  disconnect() {
    if (this._unsubRef) {
      this._unsubRef();
      this._unsubRef = null;
    }
    this.isConnected = false;
    console.log('[TelemetryService] Disconnected from Firebase');
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  emit(packet) {
    this.subscribers.forEach(cb => {
      try { cb(packet); } catch (e) { console.error('[TelemetryService] Subscriber error:', e); }
    });
  }
}

export const telemetryService = new TelemetryService();
