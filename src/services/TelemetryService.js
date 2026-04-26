/**
 * TelemetryService — Firebase Direct Mode
 *
 * Uses a single onValue(limitToLast(1)) listener.
 * Firebase re-fires it automatically every time a new record
 * is added to /telemetry — no polling, no manual timestamp tracking.
 *
 * Works regardless of whether timestamps are epoch ms (fake sender)
 * or millis() from ESP32.
 */

import { db } from './firebaseConfig';
import { ref, query, limitToLast, onChildAdded } from 'firebase/database';

const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
function pushIdToTimestamp(id) {
  if (!id || id.length < 8) return Date.now();
  let time = 0;
  for (let i = 0; i < 8; i++) {
    time = time * 64 + PUSH_CHARS.indexOf(id.charAt(i));
  }
  return time;
}

// ── Orientation filter (complementary filter, mirrors ESP32 logic) ────────────
const orientationState = {
  pitch: 0, roll: 0, yaw: 0,
  lastTimestamp: 0,
  calibrated: false,
  pitchOffset: 0, rollOffset: 0
};

function calculateOrientation(imu, timestamp) {
  if (!imu || !imu.acceleration) return { roll: 0, pitch: 0, yaw: 0 };

  let dt = 0.1;
  if (orientationState.lastTimestamp && timestamp > orientationState.lastTimestamp) {
    dt = Math.min((timestamp - orientationState.lastTimestamp) / 1000, 0.5); // cap at 0.5s
  } else if (timestamp < orientationState.lastTimestamp) {
    // Time went backwards (ESP32 reboot or shifted from Fake Data) -> reset calibration
    orientationState.calibrated = false;
  }
  orientationState.lastTimestamp = timestamp;

  const ax = imu.acceleration.x_mps2 || 0;
  const ay = imu.acceleration.y_mps2 || 0;
  const az = imu.acceleration.z_mps2 || 0;

  const accelPitch = Math.atan2(az, -ax) * (180 / Math.PI);
  const accelRoll  = Math.atan2(ay, -ax) * (180 / Math.PI);

  const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);

  if (!orientationState.calibrated && accelMag > 8) {
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

// ── TelemetryService ──────────────────────────────────────────────────────────
class TelemetryService {
  constructor() {
    this.subscribers  = [];
    this.isConnected  = false;
    this._unsub       = null;
    this._lastKey     = null;
    this._lastEmitted = null;
  }

  connect() {
    if (this._unsub) return; // already connected

    console.log('[TelemetryService] Connecting to Firebase...');

    const latestQuery = query(ref(db, 'telemetry'), limitToLast(5000));

    this._unsub = onChildAdded(latestQuery, (childSnapshot) => {
      const key = childSnapshot.key;
      let pkt = childSnapshot.val();

      // Skip if Firebase fires with the same key we already processed
      if (key === this._lastKey) return;
      this._lastKey = key;

      // Handle flat JSON format gracefully (if an alternate ESP32 script is flashed)
      if (pkt && pkt.packet !== undefined && pkt.ax !== undefined && !pkt.timestamp_ms) {
          pkt = {
              version: "1.0",
              mission: "FLAT_PAYLOAD_FALLBACK",
              timestamp_ms: pushIdToTimestamp(key), // Convert Firebase Push Key directly to absolute Epoch time
              packet: { count: pkt.packet, phase: "FLIGHT" },
              gps: {
                  latitude: pkt.lat || 0,
                  longitude: pkt.lng || 0,
                  altitude_m: 0,
                  valid: (pkt.lat !== 0),
                  satellites: 0
              },
              imu: {
                  acceleration: { x_mps2: pkt.ax, y_mps2: pkt.ay, z_mps2: pkt.az },
                  gyroscope: { x_rps: pkt.gx, y_rps: pkt.gy, z_rps: pkt.gz },
                  calibrated: true
              },
              bmp280: {
                  temperature_c: pkt.temp || 0,
                  pressure_hpa: pkt.pressure || 0,
                  altitude_m: pkt.bmpAlt || 0,
                  calibrated: true
              },
              structure: {
                  thermocouple_c: pkt.thermo || 0,
                  strain_microstrain: pkt.strain || 0
              },
              radio: {
                  rssi_dbm: pkt.rssi || 0,
                  snr_db: pkt.snr || 0
              }
          };
      }

      if (!pkt?.timestamp_ms) {
          // If flat packets are detected missing timestamp, skip cleanly
          return;
      }

      const enriched = enrichPacket({ ...pkt });
      if (enriched) {
        this.isConnected = true;
        this.emit(enriched);
      }
    });
  }

  disconnect() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    this.isConnected = false;
    this._lastKey = null;
    console.log('[TelemetryService] Disconnected from Firebase');
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // Immediately deliver the last known packet to the new subscriber
    // so the UI shows real data even if no new packets arrive yet.
    if (this._lastEmitted) {
      try { callback(this._lastEmitted); } catch (e) { /* ignore */ }
    }
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  emit(packet) {
    this._lastEmitted = packet;
    this.subscribers.forEach(cb => {
      try { cb(packet); } catch (e) {
        console.error('[TelemetryService] Subscriber error:', e);
      }
    });
  }
}

export const telemetryService = new TelemetryService();
