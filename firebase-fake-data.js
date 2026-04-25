/**
 * firebase-fake-data.js
 *
 * Sends simulated rocket telemetry DIRECTLY to Firebase Realtime Database
 * via its REST API (no npm install needed — uses Node.js built-in https).
 *
 * Run: node firebase-fake-data.js
 *
 * Flight profile (loops every 50s):
 *   0–3s   → PAD IDLE   (sitting on pad, gravity only)
 *   3–8s   → BURN       (motor burn, ~4g acceleration)
 *   8–28s  → COAST      (climbing, decelerating)
 *   28–50s → DESCENT    (parachute, slow descent)
 */

import https from 'https';

// ── Firebase Config (same project as the dashboard) ─────────────────────────
const FIREBASE_DB_URL = 'https://test-d0075-default-rtdb.firebaseio.com';
const TELEMETRY_PATH  = '/telemetry';
const INTERVAL_MS     = 1000; // 1 packet per second

// ── Base GPS coords (New Delhi, adjust as needed) ────────────────────────────
const BASE_LAT = 28.6139;
const BASE_LON = 77.2090;

// ── State ────────────────────────────────────────────────────────────────────
let packetCount = 0;
const startTime = Date.now();

// ── Helpers ──────────────────────────────────────────────────────────────────
function noise(magnitude) {
    return (Math.random() - 0.5) * magnitude * 2;
}
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
function r(val, decimals = 2) {
    return parseFloat(val.toFixed(decimals));
}

// ── Realistic flight simulation ──────────────────────────────────────────────
function getFlightState(elapsedSec) {
    // Total loop: 50 seconds
    const t = elapsedSec % 50;

    let phase, alt, ax, ay, az, gx, gy, gz, temp;

    if (t < 3) {
        // PAD IDLE — on launch pad
        phase = 'PAD';
        alt   = 0 + noise(0.3);
        ax    = -(9.81 + noise(0.1));
        ay    = noise(0.05);
        az    = noise(0.05);
        gx    = noise(0.02);
        gy    = 0.1 * Math.sin(t * 2.0) + noise(0.02);
        gz    = 0.08 * Math.sin(t * 1.5) + noise(0.02);
        temp  = 28 + noise(0.5);

    } else if (t < 8) {
        // BURN — motor firing
        phase     = 'BURN';
        const bt  = t - 3;
        alt       = 0.5 * 35 * bt * bt;
        ax        = -(9.81 + 30 + noise(2));
        ay        = noise(0.5);
        az        = noise(0.5);
        gx        = 0.8 * Math.sin(t * 3.0) + noise(0.1);
        gy        = 0.5 * Math.sin(t * 1.8) + noise(0.1);
        gz        = 0.4 * Math.sin(t * 2.2) + noise(0.08);
        temp      = 30 + bt * 2 + noise(1);

    } else if (t < 28) {
        // COAST — engine off, climbing then falling to apogee
        phase      = 'COAST';
        const burnEndAlt = 0.5 * 35 * 25;   // ~437 m at burnout
        const ct   = t - 8;
        const v0   = 35 * 5;                // ~175 m/s at burnout
        alt        = Math.max(0, burnEndAlt + v0 * ct - 0.5 * 9.81 * ct * ct);
        const drag = clamp(8 * (1 - ct / 20), 0, 8);
        ax         = -(9.81 - drag) + noise(0.3);   // near weightless
        ay         = noise(0.2);
        az         = noise(0.2);
        gx         = 0.3 * Math.sin(t * 0.5) + noise(0.05);
        gy         = 0.5 * Math.sin(t * 0.8) + noise(0.07);
        gz         = 0.35 * Math.sin(t * 0.6) + noise(0.05);
        temp       = 20 + noise(1);

    } else {
        // DESCENT — parachute deployed
        phase      = 'DESCENT';
        const dt   = t - 28;
        const v0   = 35 * 5;
        const peakAlt = (0.5 * 35 * 25) + v0 * 18 - 0.5 * 9.81 * 18 * 18;
        alt        = Math.max(0, peakAlt - 8 * dt);  // ~8 m/s sink rate under chute
        ax         = -(9.81 - 6 + noise(0.5));        // slight decel under chute
        ay         = noise(0.5);
        az         = noise(0.5);
        gx         = 1.2 * Math.sin(t * 2.5) + noise(0.2);  // pendulum swinging
        gy         = 1.5 * Math.sin(t * 1.8) + noise(0.15);
        gz         = 1.0 * Math.sin(t * 2.0) + noise(0.15);
        temp       = 26 + noise(1);
    }

    return { phase, alt, ax, ay, az, gx, gy, gz, temp };
}

// ── Build a full Firebase-compatible packet ───────────────────────────────────
function buildPacket() {
    packetCount++;
    const elapsed   = (Date.now() - startTime) / 1000;
    const ts        = Date.now();
    const f         = getFlightState(elapsed);
    const bmpAlt    = f.alt + noise(1.5);
    const pressure  = r(1013.25 - bmpAlt * 0.12, 2);
    const rssi      = r(-55 - elapsed * 0.3 + noise(4), 1);
    const snr       = r(8 - elapsed * 0.05 + noise(1), 1);
    const gpsValid  = f.phase !== 'PAD';

    return {
        version:      '1.0',
        mission:      'EKLAVYA_LIVE',
        timestamp_ms: ts,
        packet: {
            count: packetCount,
            phase: f.phase
        },
        gps: {
            latitude:   r(BASE_LAT + noise(0.0003), 6),
            longitude:  r(BASE_LON + noise(0.0003), 6),
            altitude_m: r(f.alt, 2),
            valid:      gpsValid,
            satellites: Math.round(clamp(7 + noise(2), 4, 12))
        },
        imu: {
            acceleration: {
                x_mps2: r(f.ax, 3),
                y_mps2: r(f.ay, 3),
                z_mps2: r(f.az, 3)
            },
            gyroscope: {
                x_rps: r(f.gx, 4),
                y_rps: r(f.gy, 4),
                z_rps: r(f.gz, 4)
            },
            calibrated: true
        },
        bmp280: {
            temperature_c: r(f.temp, 2),
            pressure_hpa:  pressure,
            altitude_m:    r(bmpAlt, 2),
            calibrated:    true
        },
        structure: {
            thermocouple_c:      r(f.temp + noise(1), 2),
            strain_microstrain:  r(Math.abs(f.ax) * 0.003 + noise(0.001), 5)
        },
        radio: {
            rssi_dbm: rssi,
            snr_db:   snr
        }
    };
}

// ── Send a packet to Firebase via REST PUT ────────────────────────────────────
function sendToFirebase(packet) {
    const path = `${TELEMETRY_PATH}/${packet.timestamp_ms}.json`;
    const body  = JSON.stringify(packet);

    const url  = new URL(FIREBASE_DB_URL + path);
    const opts = {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'PUT',
        headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`\n[Firebase] HTTP ${res.statusCode}: ${data}`);
            }
        });
    });

    req.on('error', (err) => {
        console.error(`\n[Firebase] Request error: ${err.message}`);
    });

    req.write(body);
    req.end();
}

// ── Progress bar helper ───────────────────────────────────────────────────────
function progressBar(value, max, width = 20) {
    const filled = Math.round((value / max) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║     Firebase Fake Telemetry Sender  — 1 pkt/sec     ║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log(`║  Target: ${FIREBASE_DB_URL}`);
console.log(`║  Path:   ${TELEMETRY_PATH}/{timestamp}.json`);
console.log('║  Press Ctrl+C to stop.                               ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

setInterval(() => {
    const packet  = buildPacket();
    sendToFirebase(packet);

    const elapsed = (Date.now() - startTime) / 1000;
    const loopPos = elapsed % 50;
    const bar     = progressBar(loopPos, 50);
    const alt     = packet.bmp280.altitude_m.toFixed(1).padStart(7);
    const phase   = packet.packet.phase.padEnd(7);
    const pkt     = String(packetCount).padStart(5);
    const rssi    = String(packet.radio.rssi_dbm).padStart(6);

    process.stdout.write(
        `\r  Pkt #${pkt} | ${phase} | Alt: ${alt}m | RSSI: ${rssi} dBm | [${bar}] ${loopPos.toFixed(0).padStart(2)}s/50s`
    );
}, INTERVAL_MS);
