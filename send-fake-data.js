/**
 * send-fake-data.js
 * Sends simulated rocket telemetry to the local backend server.
 * Run via: send-fake-data.bat  (or directly: node send-fake-data.js)
 *
 * Simulates a realistic flight profile:
 *   0–2s  → Pre-launch pad idle
 *   2–7s  → Motor burn (fast climb, high acceleration)
 *   7–25s → Coast phase (slower climb, decelerating)
 *   25–40s→ Descent (falling back down)
 */

import http from 'http';

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3001;
const ENDPOINT    = '/api/test/telemetry';
const INTERVAL_MS = 500;  // send every 500ms

// ─── Flight simulation state ───────────────────────────────────────────────
let packetCount   = 0;
let startTime     = Date.now();

// Base GPS coords (Jaipur, India — adjust if you like)
const BASE_LAT = 26.9124;
const BASE_LON = 75.7873;

// Simple random gaussian noise helper
function noise(magnitude) {
    return (Math.random() - 0.5) * magnitude * 2;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// ─── Flight profile ─────────────────────────────────────────────────────────
function getFlightData(elapsedSec) {
    let altitude_m, accel_x, accel_y, accel_z;
    let pitch_deg, roll_deg, yaw_deg;
    let gyro_x, gyro_y, gyro_z;
    let temperature_c;
    let phase;

    if (elapsedSec < 2) {
        // ── PAD IDLE ──
        phase       = 'PAD';
        altitude_m  = 0 + noise(0.3);
        accel_x     = noise(0.05);
        accel_y     = noise(0.05);
        accel_z     = 9.81 + noise(0.1);   // sitting still, feels ~1g upward
        pitch_deg   = noise(1.0);
        roll_deg    = noise(1.0);
        yaw_deg     = noise(0.5);
        gyro_x      = noise(0.01);
        gyro_y      = noise(0.01);
        gyro_z      = noise(0.01);
        temperature_c = 28 + noise(0.5);

    } else if (elapsedSec < 7) {
        // ── MOTOR BURN ──
        phase       = 'BURN';
        const t     = elapsedSec - 2;      // 0–5s of burn
        altitude_m  = 0.5 * 35 * t * t;   // 35 m/s² net upward acceleration → parabolic climb
        accel_x     = noise(0.3);
        accel_y     = noise(0.3);
        accel_z     = -(9.81 + 30 + noise(2)); // ~3g during burn (felt as –z from rocket POV)
        pitch_deg   = 85 + noise(2);       // nearly vertical
        roll_deg    = noise(3);
        yaw_deg     = noise(2);
        gyro_x      = noise(0.05);
        gyro_y      = noise(0.05);
        gyro_z      = noise(0.02);
        temperature_c = 28 + t * 1.5 + noise(1); // heats up slightly

    } else if (elapsedSec < 25) {
        // ── COAST (climbing but decelerating due to drag + gravity) ──
        phase        = 'COAST';
        const burnEnd = 0.5 * 35 * 25;    // altitude at end of burn (~437m)
        const t       = elapsedSec - 7;   // time since burnout
        const v0      = 35 * 5;           // velocity at burnout ~175 m/s
        altitude_m   = burnEnd + v0 * t - 0.5 * 9.81 * t * t;
        altitude_m   = Math.max(0, altitude_m);
        const decel   = -(9.81 + clamp(10 * (1 - t / 18), 0, 10));
        accel_x      = noise(0.2);
        accel_y      = noise(0.2);
        accel_z      = decel + noise(0.5);
        pitch_deg    = clamp(85 - t * 2, 0, 90) + noise(2); // slowly pitching over
        roll_deg     = noise(4);
        yaw_deg      = noise(3);
        gyro_x       = noise(0.04);
        gyro_y       = noise(0.04);
        gyro_z       = noise(0.02);
        temperature_c = 20 + noise(1);  // colder at altitude

    } else {
        // ── DESCENT ──
        phase        = 'DESCENT';
        // Peak altitude from coast phase calculation at t=18s
        const v0      = 35 * 5;
        const peakAlt = (0.5 * 35 * 25) + v0 * 18 - 0.5 * 9.81 * 18 * 18;
        const t       = elapsedSec - 25;
        altitude_m   = Math.max(0, peakAlt - 0.5 * 20 * t * t); // chute: ~20 m/s² "braking"
        accel_x      = noise(0.3);
        accel_y      = noise(0.3);
        accel_z      = 20 + noise(1);  // drag deceleration under chute
        pitch_deg    = noise(10);       // tumbling near chute deployment
        roll_deg     = noise(15);
        yaw_deg      = noise(8);
        gyro_x       = noise(0.2);
        gyro_y       = noise(0.2);
        gyro_z       = noise(0.1);
        temperature_c = 25 + noise(1);
    }

    const bmpAlt = altitude_m + noise(1.5);  // BMP280 has more noise

    return {
        phase,
        altitude_m: parseFloat(altitude_m.toFixed(2)),
        bmpAlt:     parseFloat(bmpAlt.toFixed(2)),
        accel:      { x: parseFloat(accel_x.toFixed(4)), y: parseFloat(accel_y.toFixed(4)), z: parseFloat(accel_z.toFixed(4)) },
        gyro:       { x: parseFloat(gyro_x.toFixed(4)),  y: parseFloat(gyro_y.toFixed(4)),  z: parseFloat(gyro_z.toFixed(4)) },
        orientation: {
            pitch: parseFloat(pitch_deg.toFixed(2)),
            roll:  parseFloat(roll_deg.toFixed(2)),
            yaw:   parseFloat(yaw_deg.toFixed(2))
        },
        temperature_c: parseFloat(temperature_c.toFixed(2))
    };
}

// ─── Build full telemetry packet ─────────────────────────────────────────────
function buildPacket(elapsedSec) {
    const d = getFlightData(elapsedSec);
    packetCount++;

    return {
        timestamp_ms: Date.now(),
        packet: {
            count: packetCount,
            phase: d.phase
        },
        gps: {
            latitude:    BASE_LAT + noise(0.0001),
            longitude:   BASE_LON + noise(0.0001),
            altitude_m:  d.altitude_m,
            speed_kmh:   parseFloat(Math.max(0, d.altitude_m * 0.3 + noise(1)).toFixed(2)),
            fix:         d.altitude_m > 0 ? 3 : 0,
            satellites:  Math.round(7 + noise(2))
        },
        imu: {
            acceleration: {
                x_mps2: d.accel.x,
                y_mps2: d.accel.y,
                z_mps2: d.accel.z
            },
            gyroscope: {
                x_rps: d.gyro.x,
                y_rps: d.gyro.y,
                z_rps: d.gyro.z
            },
            pitch: d.orientation.pitch,
            roll:  d.orientation.roll,
            yaw:   d.orientation.yaw
        },
        bmp280: {
            temperature_c: d.temperature_c,
            pressure_hpa:  parseFloat((1013.25 - d.bmpAlt * 0.12).toFixed(2)),
            altitude_m:    d.bmpAlt
        },
        ignition: {
            status: d.phase === 'BURN' ? 'IGNITED' : 'SAFE'
        },
        signal: {
            rssi: Math.round(-60 - elapsedSec * 0.5 + noise(5)),
            snr:  parseFloat((8 - elapsedSec * 0.1 + noise(1)).toFixed(1))
        }
    };
}

// ─── HTTP sender ─────────────────────────────────────────────────────────────
function sendPacket(packet) {
    const body = JSON.stringify(packet);

    const options = {
        hostname: SERVER_HOST,
        port:     SERVER_PORT,
        path:     ENDPOINT,
        method:   'POST',
        headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const req = http.request(options, (res) => {
        // Drain the response so the socket is reused
        res.resume();
    });

    req.on('error', (err) => {
        console.error(`[SendData] ✗ Failed to send packet #${packet.packet.count}: ${err.message}`);
        console.error(`           Is the server running on port ${SERVER_PORT}?`);
    });

    req.write(body);
    req.end();
}

// ─── Main loop ───────────────────────────────────────────────────────────────
console.log(`[SendData] Starting fake telemetry sender...`);
console.log(`[SendData] Target: http://${SERVER_HOST}:${SERVER_PORT}${ENDPOINT}`);
console.log(`[SendData] Interval: ${INTERVAL_MS}ms`);
console.log(`[SendData] Press Ctrl+C to stop.\n`);

// Loop continuously — flight profile repeats after 45s
setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000) % 45; // 45s flight loop
    const packet  = buildPacket(elapsed);

    sendPacket(packet);

    const bar  = '█'.repeat(Math.round((elapsed / 45) * 20)).padEnd(20, '░');
    const pct  = ((elapsed / 45) * 100).toFixed(0).padStart(3);
    process.stdout.write(
        `\r[SendData] Pkt #${String(packetCount).padStart(4)} | Phase: ${packet.packet.phase.padEnd(7)} | ` +
        `Alt: ${String(packet.bmp280.altitude_m.toFixed(1)).padStart(7)}m | ` +
        `[${bar}] ${pct}%`
    );
}, INTERVAL_MS);
