const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mqtt = require('mqtt');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'rocket/telemetry';

const args = process.argv.slice(2);
let portName = args[0];
const baudRate = parseInt(args[1]) || 115200;

console.log("=========================================");
console.log("      SMART SERIAL TO MQTT BRIDGE        ");
console.log("=========================================\n");

async function autoConnectToPort() {
    if (!portName) {
        console.log("Scanning for active USB Serial devices...");
        const ports = await SerialPort.list();
        
        if (ports.length === 0) {
            console.error("❌ CRITICAL ERROR: No serial ports found!");
            console.error("Please plug in your ESP32 Ground Station via USB.");
            process.exit(1);
        }

        // Filter out obvious system ports, look for CH340, CP210x, FTDI
        let selectedPort = ports.find(p => p.manufacturer && (p.manufacturer.includes('wch.cn') || p.manufacturer.includes('Silicon Labs') || p.manufacturer.includes('FTDI') || p.manufacturer.includes('Arduino')));
        
        // If we didn't find an obvious ESP32, fallback to simply taking the last (highest) COM port which is usually the newest plugged device
        if (!selectedPort) {
            selectedPort = ports[ports.length - 1];
        }

        portName = selectedPort.path;
        console.log(`✅ Auto-Detected ESP32 Device on: ${portName} [${selectedPort.manufacturer || 'Generic'}]`);
    }

    console.log(`\nAttempting to open ${portName} at ${baudRate} baud...`);
    
    const port = new SerialPort({ path: portName, baudRate: baudRate }, function (err) {
      if (err) {
        console.log(`\n❌ [ERROR] Failed to open port ${portName}:`, err.message);
        console.log("Make sure you CLOSED the Serial Monitor in the Arduino IDE!");
        process.exit(1);
      }
    });

    console.log(`Connecting to MQTT broker at ${MQTT_BROKER}...`);
    const mqttClient = mqtt.connect(MQTT_BROKER);

    mqttClient.on('connect', () => {
        console.log(`[MQTT] Connected successfully. Ready to forward data!\n`);
    });

    mqttClient.on('error', (err) => {
        console.error(`[MQTT ERROR]: ${err.message}`);
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', output => {
        try {
            const text = output.trim();
            if (!text) return;
            
            // Log the raw data so the user sees something is happening
            console.log(`[Serial RX]: ${text}`);

            // If the hardware sends valid JSON telemetry packet, we bridge it.
            if (text.startsWith('{') && text.endsWith('}')) {
                // Validate JSON
                JSON.parse(text); 
                mqttClient.publish(MQTT_TOPIC, text);
            } else if (text.startsWith('RX $')) {
                // Parse CSV format from the Arduino
                const parts = text.split(' : ');
                if (parts.length === 2) {
                    const csvData = parts[1].split(',');
                    if (csvData.length >= 10) { 
                        const packetCount = parseInt(csvData[0]) || 0;
                        const jsonPayload = {
                            version: "1.0",
                            mission: "EKLAVYA_LIVE",
                            timestamp_ms: Date.now(),
                            packet: { count: packetCount },
                            gps: {
                                latitude: parseFloat(csvData[1]) || 0,
                                longitude: parseFloat(csvData[2]) || 0,
                                altitude_m: parseFloat(csvData[3]) || 0,
                                valid: true
                            },
                            imu: {
                                acceleration: {
                                    x_mps2: parseFloat(csvData[4]) || 0,
                                    y_mps2: parseFloat(csvData[5]) || 0,
                                    z_mps2: parseFloat(csvData[6]) || 0
                                },
                                gyroscope: {
                                    x_rps: parseFloat(csvData[7]) || 0,
                                    y_rps: parseFloat(csvData[8]) || 0,
                                    z_rps: parseFloat(csvData[9]) || 0
                                },
                                calibrated: true
                            },
                            bmp280: {
                                temperature_c: parseFloat(csvData[10] || 0),
                                pressure_hpa: parseFloat(csvData[11] || 0),
                                altitude_m: parseFloat(csvData[12] || 0),
                                calibrated: true
                            },
                            structure: {
                                thermocouple_c: parseFloat(csvData[13] || 0),
                                strain_microstrain: parseFloat(csvData[14] || 0)
                            },
                            radio: {
                                rssi_dbm: 0,
                                snr_db: 0
                            }
                        };
                        
                        mqttClient.publish(MQTT_TOPIC, JSON.stringify(jsonPayload));
                        console.log(` -> Parsed CSV and forwarded packet to MQTT. Keys: ${csvData.length}`);
                        return;
                    } else {
                        console.log(` -> (Line ignored: CSV format too short. Length: ${csvData.length})`);
                    }
                } else {
                    console.log(` -> (Line ignored: Could not find ' : ' separator)`);
                }
            } else {
                console.log(` -> (Line ignored: Not a JSON telemetry packet or recognized format)`);
            }
        } catch (err) {
            console.log(` -> (Line ignored: Invalid JSON)`);
        }
    });

    port.on('error', err => {
        console.error(`\n[SERIAL ERROR]: ${err.message}`);
    });
}

// Start sequence
autoConnectToPort();
