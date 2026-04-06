const mqtt = require('mqtt');

// ================= CONFIGURATION =================
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = 'rocket/telemetry';
const DATA_RATE_MS = 500; // 2 Hz (slower rate for testing)

// ================= MOCK DATA GENERATOR =================
class MockTelemetryGenerator {
    constructor() {
        this.packetCount = 0;
        this.startTime = Date.now();

        // Starting position (somewhere in India for realistic GPS)
        this.baseLat = 28.6139;  // Delhi area
        this.baseLon = 77.2090;
        this.baseAlt = 200.0;

        // Flight simulation parameters
        this.flightPhase = 'ground'; // ground, ascent, descent
        this.maxAltitude = 1500; // meters
        this.ascentRate = 50; // m/s
        this.descentRate = -20; // m/s
    }

    generatePacket() {
        this.packetCount++;
        const elapsedSeconds = (Date.now() - this.startTime) / 1000;

        // ===== GPS DATA =====
        let lat = this.baseLat;
        let lon = this.baseLon;
        let alt = this.baseAlt;

        // Simulate flight trajectory
        if (elapsedSeconds < 5) {
            // Ground phase - slight variations
            this.flightPhase = 'ground';
            alt = this.baseAlt + Math.random() * 2;
            lat += (Math.random() - 0.5) * 0.0001;
            lon += (Math.random() - 0.5) * 0.0001;
        } else if (elapsedSeconds < 35) {
            // Ascent phase
            this.flightPhase = 'ascent';
            const ascentTime = elapsedSeconds - 5;
            alt = this.baseAlt + (ascentTime * this.ascentRate);
            // Drift during ascent
            lat += ascentTime * 0.0001;
            lon += ascentTime * 0.00005;
        } else if (elapsedSeconds < 80) {
            // Descent phase
            this.flightPhase = 'descent';
            const descentTime = elapsedSeconds - 35;
            alt = this.maxAltitude + (descentTime * this.descentRate);
            // More drift during descent
            lat += (30 * 0.0001) + (descentTime * 0.00015);
            lon += (30 * 0.00005) + (descentTime * 0.0001);

            // Ensure we don't go below ground
            if (alt < this.baseAlt) alt = this.baseAlt;
        } else {
            // Landed
            this.flightPhase = 'landed';
            alt = this.baseAlt;
            lat = this.baseLat + (30 * 0.0001) + (45 * 0.00015);
            lon = this.baseLon + (30 * 0.00005) + (45 * 0.0001);
        }

        // ===== IMU DATA (MPU6050) =====
        let ax, ay, az, gx, gy, gz;

        if (this.flightPhase === 'ground' || this.flightPhase === 'landed') {
            // Minimal movement on ground
            ax = (Math.random() - 0.5) * 0.2;
            ay = (Math.random() - 0.5) * 0.2;
            az = 9.81 + (Math.random() - 0.5) * 0.1;
            gx = (Math.random() - 0.5) * 2;
            gy = (Math.random() - 0.5) * 2;
            gz = (Math.random() - 0.5) * 2;
        } else if (this.flightPhase === 'ascent') {
            // High acceleration during ascent
            ax = (Math.random() - 0.5) * 5;
            ay = (Math.random() - 0.5) * 5;
            az = 9.81 + 30 + (Math.random() - 0.5) * 10; // Strong upward acceleration
            gx = (Math.random() - 0.5) * 50;
            gy = (Math.random() - 0.5) * 50;
            gz = (Math.random() - 0.5) * 100; // Spinning
        } else {
            // Descent - lower acceleration, more rotation
            ax = (Math.random() - 0.5) * 3;
            ay = (Math.random() - 0.5) * 3;
            az = 9.81 - 5 + (Math.random() - 0.5) * 2;
            gx = (Math.random() - 0.5) * 80;
            gy = (Math.random() - 0.5) * 80;
            gz = (Math.random() - 0.5) * 150; // More spinning during descent
        }

        // ===== BUILD JSON PACKET =====
        const packet = {
            version: "1.0",
            mission: "EKLAVYA_MOCK",
            timestamp_ms: Date.now(),
            packet: {
                count: this.packetCount
            },
            gps: {
                latitude: parseFloat(lat.toFixed(6)),
                longitude: parseFloat(lon.toFixed(6)),
                altitude_m: parseFloat(alt.toFixed(2)),
                valid: true
            },
            imu: {
                acceleration: {
                    x_mps2: parseFloat(ax.toFixed(2)),
                    y_mps2: parseFloat(ay.toFixed(2)),
                    z_mps2: parseFloat(az.toFixed(2))
                },
                gyroscope: {
                    x_rps: parseFloat(gx.toFixed(2)),
                    y_rps: parseFloat(gy.toFixed(2)),
                    z_rps: parseFloat(gz.toFixed(2))
                },
                calibrated: true
            },
            bmp280: {
                temperature_c: 25.0 - (alt - this.baseAlt) * 0.0065, // Temperature decreases with altitude
                pressure_hpa: 1013.25 * Math.pow(1 - (alt / 44330), 5.255),
                altitude_m: parseFloat(alt.toFixed(2)),
                calibrated: false
            },
            structure: {
                thermocouple_c: 0.0,
                strain_microstrain: 0.0
            },
            radio: {
                rssi_dbm: -45 - Math.random() * 20, // -45 to -65 dBm
                snr_db: parseFloat((5 + Math.random() * 5).toFixed(2)) // 5 to 10 dB
            }
        };

        return packet;
    }

    getStatus() {
        return {
            packetCount: this.packetCount,
            flightPhase: this.flightPhase,
            elapsedTime: ((Date.now() - this.startTime) / 1000).toFixed(1) + 's'
        };
    }
}

// ================= MAIN =================
console.log('========================================');
console.log('Mock Telemetry Data Generator');
console.log('GPS + MPU6050 System');
console.log('========================================\n');

console.log(`MQTT Broker: ${MQTT_BROKER}`);
console.log(`MQTT Topic: ${MQTT_TOPIC}`);
console.log(`Data Rate: ${1000 / DATA_RATE_MS} Hz (${DATA_RATE_MS}ms interval)\n`);

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER);
const generator = new MockTelemetryGenerator();

client.on('connect', () => {
    console.log('✓ Connected to MQTT broker\n');
    console.log('Starting mock data transmission...');
    console.log('Press Ctrl+C to stop\n');
    console.log('Flight Simulation:');
    console.log('  0-5s: Ground phase');
    console.log('  5-35s: Ascent (to 1500m)');
    console.log('  35-80s: Descent');
    console.log('  80s+: Landed\n');
    console.log('─'.repeat(80));

    // Send data at specified rate
    const interval = setInterval(() => {
        const packet = generator.generatePacket();
        const status = generator.getStatus();

        // Publish to MQTT
        client.publish(MQTT_TOPIC, JSON.stringify(packet), (err) => {
            if (err) {
                console.error('✗ Publish failed:', err.message);
            } else {
                console.log(
                    `✓ Packet #${status.packetCount.toString().padStart(4)} | ` +
                    `Phase: ${status.flightPhase.padEnd(8)} | ` +
                    `Alt: ${packet.gps.altitude_m.toFixed(2).padStart(7)}m | ` +
                    `Lat: ${packet.gps.latitude.toFixed(6)} | ` +
                    `Time: ${status.elapsedTime}`
                );
            }
        });
    }, DATA_RATE_MS);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n' + '─'.repeat(80));
        console.log('Stopping mock data generator...');
        clearInterval(interval);
        client.end();
        console.log(`Total packets sent: ${generator.packetCount}`);
        console.log('Goodbye!\n');
        process.exit();
    });
});

client.on('error', (err) => {
    console.error('✗ MQTT Error:', err.message);
    console.error('\nMake sure Mosquitto broker is running:');
    console.error('  mosquitto -c mosquitto.conf -v\n');
    process.exit(1);
});
