const mqtt = require('mqtt');

// Configuration
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = 'rocket/telemetry';

const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
    console.log('[Mock ESP32] Connected to Broker');
    startPublishing();
});

function startPublishing() {
    let count = 0;
    let startTime = Date.now();
    let alt = 0;

    setInterval(() => {
        count++;
        const elapsed = (Date.now() - startTime) / 1000;

        // Simulate ascending rocket
        if (elapsed > 5) { // Launch after 5s
            alt += (elapsed - 5) * 2;
        }

        const packet = {
            version: "1.0",
            mission: "EKLAVYA_MOCK",
            timestamp_ms: Date.now(),
            packet: { count: count },
            gps: {
                latitude: 12.9716 + (count * 0.0001),
                longitude: 77.5946 + (count * 0.0001),
                altitude_m: alt,
                valid: true
            },
            imu: {
                acceleration: {
                    x_mps2: 0.1,
                    y_mps2: 0.2,
                    z_mps2: 9.8 + (elapsed > 5 ? 5 : 0) // Boost
                },
                gyroscope: {
                    x_rps: Math.sin(elapsed) * 0.1, // Wiggle
                    y_rps: 0,
                    z_rps: 0
                },
                calibrated: true
            },
            bmp280: {
                temperature_c: 25 - (alt / 100),
                pressure_hpa: 1013 - (alt / 10),
                altitude_m: alt,
                calibrated: true
            },
            structure: {
                thermocouple_c: 45,
                strain_microstrain: 120 + Math.random() * 10
            },
            radio: {
                rssi_dbm: -60 - Math.random() * 10,
                snr_db: 8
            }
        };

        const payload = JSON.stringify(packet);
        client.publish(MQTT_TOPIC, payload);
        console.log(`[Mock ESP32] Sent packet #${count}`);

    }, 100); // 10Hz
}
