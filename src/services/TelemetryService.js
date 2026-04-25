/**
 * TelemetryService — Firebase Direct Mode
 *
 * Reads telemetry in real-time directly from Firebase Realtime Database.
 * The ESP32 Ground Station writes JSON packets to /telemetry/{timestamp}.
 *
 * Strategy:
 *  1. onValue(limitToLast(1)) — always seeds the UI with the most recent packet
 *     and fires again every time a NEW latest packet arrives.
 *  2. onChildAdded on the full ref — catches every new child pushed after connect.
 *
 * No WebSocket server required. Works from any device, anywhere.
 */

import { db } from './firebaseConfig';
import { ref, query, limitToLast, onValue, onChildAdded, off } from 'firebase/database';

// ─── Orientation state (complementary filter) ────────────────────────────────
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
  const accelRoll  = Math.atan2(ay, -ax) * (180 / Math.PI);

  if (!orientationState.calibrated && Math.abs(ax) > 8) {
    orientationState.pitchOffset = accelPitch;
    orientationState.rollOffset  = accelRoll;
    orientationState.pitch = 0;
    orientationState.roll  = 0;
    orientationState.yaw   = 0;
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
    yaw:   parseFloat(orientationState.yaw.toFixed(2)),
  };
}

function enrichPacket(packet) {
  if (!packet || !packet.timestamp_ms) return null;

  if (packet.imu) {
    const orientation = calculateOrientation(packet.imu, packet.timestamp_ms);
    packet.imu.roll  = orientation.roll;
    packet.imu.pitch = orientation.pitch;
    packet.imu.yaw   = orientation.yaw;
    packet.imu.vertical_accel_mps2 = parseFloat(
      (-(packet.imu.acceleration?.x_mps2 || 0) - 9.807).toFixed(3)
    );
  }

  // Canonical altitude — prefer BMP280, fall back to GPS
  packet.altitude_m = packet.bmp280?.altitude_m ?? packet.gps?.altitude_m ?? 0;

  return packet;
}

// ─── TelemetryService ────────────────────────────────────────────────────────
class TelemetryService {
  constructor() {
    this.subscribers  = [];
    this.isConnected  = false;
    this._unsubLatest = null;   // unsubscribe for onValue(limitToLast(1))
    this._unsubNew    = null;   // unsubscribe for onChildAdded
    this._latestTs    = 0;      // timestamp of the last packet we've emitted
  }

  connect() {
    if (this._unsubLatest) return; // already connected

    console.log('[TelemetryService] Connecting to Firebase Realtime Database...');

    const telemetryRef  = ref(db, 'telemetry');
    const latestQuery   = query(telemetryRef, limitToLast(1));

    // ── 1. onValue(limitToLast(1)) — fires immediately with latest child,
    //       AND fires again every time a brand-new entry becomes the latest.
    this._unsubLatest = onValue(latestQuery, (snapshot) => {
      snapshot.forEach(child => {
        const pkt = child.val();
        if (!pkt?.timestamp_ms) return;

        if (pkt.timestamp_ms > this._latestTs) {
          this._latestTs = pkt.timestamp_ms;
          const enriched = enrichPacket({ ...pkt });
          if (enriched) {
            this.isConnected = true;
            this.emit(enriched);
          }
        }
      });

      this.isConnected = true;
      console.log(`[TelemetryService] Firebase onValue fired. Last ts: ${this._latestTs}`);
    });

    // ── 2. onChildAdded — catches every new child node pushed after we connect.
    //       Firebase replays existing children first; we skip them via _latestTs.
    //       Small delay so _latestTs is populated from onValue before childAdded fires.
    setTimeout(() => {
      this._unsubNew = onChildAdded(telemetryRef, (snapshot) => {
        try {
          const packet = snapshot.val();
          if (!packet?.timestamp_ms) return;
          if (packet.timestamp_ms <= this._latestTs) return; // already handled

          this._latestTs = packet.timestamp_ms;
          const enriched = enrichPacket({ ...packet });
          if (enriched) {
            this.isConnected = true;
            this.emit(enriched);
          }
        } catch (e) {
          console.error('[TelemetryService] Error processing packet:', e);
        }
      });
    }, 1500); // wait 1.5 s for onValue to seed _latestTs first
  }

  disconnect() {
    if (this._unsubLatest) { this._unsubLatest(); this._unsubLatest = null; }
    if (this._unsubNew)    { this._unsubNew();    this._unsubNew    = null; }
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
