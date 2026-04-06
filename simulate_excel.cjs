const fs = require('fs');
const path = require('path');
const http = require('http');

const DATA_FILE = path.join(__dirname, 'excel_data.json');
const SERVER_URL = 'http://localhost:3001/api/test/telemetry'; // Assuming port 3001 for HTTP

if (!fs.existsSync(DATA_FILE)) {
    console.error('Data file not found:', DATA_FILE);
    process.exit(1);
}

const rawData = fs.readFileSync(DATA_FILE, 'utf8');
const telemetryData = JSON.parse(rawData);

console.log(`Loaded ${telemetryData.length} packets.`);

let index = 0;
const START_LAT = 28.6139;
const START_LON = 77.2090;

function sendPacket() {
    if (index >= telemetryData.length) {
        console.log('Simulation complete.');
        process.exit(0);
    }

    const row = telemetryData[index];
    
    // Construct packet matching the server's expected structure
    const packet = {
        mission: "EKLAVYA-EXCEL-REPLAY",
        timestamp_ms: Date.now(),
        packet: { count: index + 1 },
        gps: {
            latitude: START_LAT, // Static for now
            longitude: START_LON,
            altitude_m: 0, // Will be filled by fallback or we can put row.bmp_alt_m
            satellites: 4,
            fix: true
        },
        bmp280: {
            temperature_c: row.bmp_temp_c,
            pressure_pa: row.bmp_pres_hpa * 100, // hPa to Pa
            altitude_m: row.bmp_alt_m
        },
        imu: {
            acceleration: {
                x_mps2: row.acc_x,
                y_mps2: row.acc_y,
                z_mps2: row.acc_z
            },
            gyroscope: {
                x_rps: row.gyro_x,
                y_rps: row.gyro_y,
                z_rps: row.gyro_z
            }
        },
        ignition: { status: row.bmp_alt_m > 10 ? 'BURNING' : 'SAFE' }, // Simple logic
        battery: { voltage: 8.4, percentage: 95 }
    };

    // Send via HTTP POST
    const data = JSON.stringify(packet);
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/test/telemetry',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Pkt ${index} | Alt: ${row.bmp_alt_m}m | AccX: ${row.acc_x} | Status: ${res.statusCode}`);
    });

    req.on('error', (error) => {
        console.error(`Error sending packet ${index}:`, error.message);
    });

    req.write(data);
    req.end();

    index++;
}

// 10Hz simulation rate (100ms)
setInterval(sendPacket, 100);
console.log('Starting simulation...');
