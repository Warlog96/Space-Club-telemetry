const mqtt = require('mqtt');

const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = '#';

console.log(`[Verifier] Connecting to ${MQTT_BROKER}...`);
const client = mqtt.connect(MQTT_BROKER);

const timeout = setTimeout(() => {
    console.log('[Verifier] Timeout: No packets received in 15 seconds.');
    console.log('[Verifier] Check ESP32 Serial Monitor for WiFi/MQTT errors.');
    client.end();
    process.exit(0);
}, 15000);

client.on('connect', () => {
    console.log('[Verifier] Connected to Broker. Listening for ESP32...');
    client.subscribe(MQTT_TOPIC, (err) => {
        if (err) console.error('Subscribe Error:', err);
    });
});

client.on('message', (topic, message) => {
    clearTimeout(timeout);
    console.log(`[Verifier] SUCCESS! Received packet on ${topic}`);
    console.log(`[Verifier] Payload snippet: ${message.toString().substring(0, 100)}...`);
    console.log('[Verifier] ESP32 is ONLINE and TRANSMITTING.');
    client.end();
    process.exit(0);
});
