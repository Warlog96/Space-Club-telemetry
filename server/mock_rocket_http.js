const http = require('http');

// Configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3001;
const ENDPOINT = '/api/test/telemetry';

function sendPacket(packet) {
    const data = JSON.stringify(packet);

    const options = {
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: ENDPOINT,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        // Silent success
    });

    req.on('error', (error) => {
        console.error(`[Mock Rocket] Send Error: ${error.message}`);
    });

    req.write(data);
    req.end();
}

console.log("🚀 MOCK ROCKET SIMULATION STARTED");
console.log("---------------------------------");
console.log("Sending telemetry to:", `http://${SERVER_HOST}:${SERVER_PORT}${ENDPOINT}`);
console.log("Press Ctrl+C to stop.\n");

let count = 0;
let startTime = Date.now();
let altitude = 0;
let phase = 'PRE_LAUNCH'; // PRE_LAUNCH, BOOST, COAST, APOGEE, DESCENT

setInterval(() => {
    count++;
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;

    // Flight Logic
    if (elapsed < 5) {
        phase = 'PRE_LAUNCH';
        altitude = 0;
    } else if (elapsed < 15) {
        phase = 'BOOST';
        altitude += 15 + Math.random(); // Fast ascend
    } else if (elapsed < 25) {
        phase = 'COAST';
        altitude += 5 + Math.random(); // Slow ascend
    } else if (elapsed < 40) {
        phase = 'DESCENT';
        altitude -= 10;
        if (altitude < 0) altitude = 0;
    }

    // prevent negative
    if (altitude < 0) altitude = 0;

    const packet = {
        version: "1.0",
        mission: "MOCK_FLIGHT_TEST",
        timestamp_ms: now,
        packet: { count: count },
        gps: {
            latitude: 28.6139 + (count * 0.0001),
            longitude: 77.2090 + (altitude * 0.00001),
            altitude_m: altitude,
            satellites: 8,
            fix_quality: 1,
            hdop: 1.2,
            valid: true
        },
        imu: {
            acceleration: {
                x_mps2: 0.1 + (Math.random() - 0.5),
                y_mps2: 0.2 + (Math.random() - 0.5),
                z_mps2: phase === 'BOOST' ? 30 : 9.8
            },
            gyroscope: {
                x_rps: Math.sin(elapsed) * 0.1,
                y_rps: Math.cos(elapsed) * 0.1,
                z_rps: 0
            },
            calibrated: true
        },
        bmp280: {
            temperature_c: 30 - (altitude / 100),
            pressure_pa: 101325 - (altitude * 12),
            altitude_m: altitude,  // Simulating perfect baro alt
            calibrated: true
        },
        structure: {
            thermocouple_c: 45 + (phase === 'BOOST' ? 10 : 0),
            strain_microstrain: 120
        },
        radio: {
            rssi_dbm: -60 - Math.random() * 10,
            snr_db: 8
        },
        status: {
            state: phase,
            battery_v: 8.4
        }
    };

    sendPacket(packet);
    process.stdout.write(`\r[${phase}] Alt: ${altitude.toFixed(1)}m | Pkt: ${count} | Temp: ${packet.bmp280.temperature_c.toFixed(1)}C`);

}, 100); // 10Hz
