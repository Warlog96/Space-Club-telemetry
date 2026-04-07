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
    let gyro_x, gyro_y, gyro_z;
    let temperature_c;
    let phase;

    // ─── IMPORTANT: Server expects X-axis = vertical (rocket long axis) ───
    // accel_x  → vertical axis (gravity = -9.81 when sitting still, large negative during burn)
    // accel_y  → lateral axis
    // accel_z  → lateral axis
    // gyro_x   → yaw rate   (spin around vertical/X axis)
    // gyro_y   → pitch rate (tilt around Y axis)
    // gyro_z   → roll rate  (tilt around Z axis)
    // All gyro values in radians/sec — server converts to deg/s internally.

    if (elapsedSec < 2) {
        // ── PAD IDLE — sitting still on launch pad ──
        phase       = 'PAD';
        altitude_m  = 0 + noise(0.3);
        accel_x     = -(9.81 + noise(0.1));   // gravity along X (vertical), pointing down
        accel_y     = noise(0.05);             // no lateral force
        accel_z     = noise(0.05);
        // Small vibrations — model should be mostly still with slight wobble
        gyro_x      = noise(0.02);             // tiny yaw drift
        gyro_y      = 0.15 * Math.sin(elapsedSec * 2.0) + noise(0.03);  // gentle pitch sway
        gyro_z      = 0.10 * Math.sin(elapsedSec * 1.5) + noise(0.03);  // gentle roll sway
        temperature_c = 28 + noise(0.5);

    } else if (elapsedSec < 7) {
        // ── MOTOR BURN — fast climb, high acceleration ──
        phase       = 'BURN';
        const t     = elapsedSec - 2;      // 0–5s of burn
        altitude_m  = 0.5 * 35 * t * t;   // 35 m/s² net upward → parabolic climb
        accel_x     = -(9.81 + 30 + noise(2));  // ~4g thrust along vertical X
        accel_y     = noise(0.5);                // slight lateral vibration from motor
        accel_z     = noise(0.5);
        // During burn: rocket pitches slightly, rolls from motor torque, yaw oscillates
        gyro_x      = 0.8 * Math.sin(elapsedSec * 3.0) + noise(0.1);   // roll spin from motor torque
        gyro_y      = 0.5 * Math.sin(elapsedSec * 1.8) + 0.3 * Math.cos(elapsedSec * 0.7) + noise(0.1); // pitch oscillation
        gyro_z      = 0.4 * Math.sin(elapsedSec * 2.2) + noise(0.08);  // roll wobble
        temperature_c = 28 + t * 1.5 + noise(1);

    } else if (elapsedSec < 25) {
        // ── COAST — climbing but decelerating (drag + gravity) ──
        phase        = 'COAST';
        const burnEnd = 0.5 * 35 * 25;    // altitude at end of burn (~437m)
        const t       = elapsedSec - 7;   // time since burnout
        const v0      = 35 * 5;           // velocity at burnout ~175 m/s
        altitude_m   = burnEnd + v0 * t - 0.5 * 9.81 * t * t;
        altitude_m   = Math.max(0, altitude_m);
        // Near-weightless during coast → accel_x approaches 0 (freefall)
        const dragDecel = clamp(10 * (1 - t / 18), 0, 10);
        accel_x      = -(9.81 + dragDecel) + noise(0.3);
        accel_y      = noise(0.2);
        accel_z      = noise(0.2);
        // Rocket slowly pitches over and tumbles gently during coast
        gyro_x      = 0.3 * Math.sin(elapsedSec * 0.5) + noise(0.05);  // slow yaw drift
        gyro_y      = 0.6 * Math.sin(elapsedSec * 0.8) + 0.2 * Math.cos(elapsedSec * 1.3) + noise(0.08); // pitch-over
        gyro_z      = 0.35 * Math.sin(elapsedSec * 0.6) + noise(0.06); // slow roll
        temperature_c = 20 + noise(1);    // colder at altitude

    } else {
        // ── DESCENT — falling back, parachute deployed ──
        phase        = 'DESCENT';
        const v0      = 35 * 5;
        const peakAlt = (0.5 * 35 * 25) + v0 * 18 - 0.5 * 9.81 * 18 * 18;
        const t       = elapsedSec - 25;
        altitude_m   = Math.max(0, peakAlt - 0.5 * 20 * t * t); // chute: ~20 m/s² braking
        accel_x      = -(20 + noise(1));       // drag deceleration under chute along X
        accel_y      = noise(0.5);
        accel_z      = noise(0.5);
        // Under parachute: swinging/pendulum motion — large, visible oscillations
        gyro_x      = 1.2 * Math.sin(elapsedSec * 2.5) + noise(0.2);   // swinging yaw
        gyro_y      = 1.5 * Math.sin(elapsedSec * 1.8) + 0.5 * Math.cos(elapsedSec * 3.0) + noise(0.15); // big pitch swings
        gyro_z      = 1.0 * Math.sin(elapsedSec * 2.0) + 0.4 * Math.cos(elapsedSec * 1.2) + noise(0.15); // big roll swings
        temperature_c = 25 + noise(1);
    }

    const bmpAlt = altitude_m + noise(1.5);  // BMP280 has more noise

    return {
        phase,
        altitude_m: parseFloat(altitude_m.toFixed(2)),
        bmpAlt:     parseFloat(bmpAlt.toFixed(2)),
        accel:      { x: parseFloat(accel_x.toFixed(4)), y: parseFloat(accel_y.toFixed(4)), z: parseFloat(accel_z.toFixed(4)) },
        gyro:       { x: parseFloat(gyro_x.toFixed(4)),  y: parseFloat(gyro_y.toFixed(4)),  z: parseFloat(gyro_z.toFixed(4)) },
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
            pitch: 0,  // Server will compute via complementary filter
            roll:  0,
            yaw:   0
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
