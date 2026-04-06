const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mqtt = require('mqtt');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'rocket/telemetry';

const args = process.argv.slice(2);
const portName = args[0];

if (!portName) {
    console.log("=========================================");
    console.log("        SERIAL TO MQTT BRIDGE            ");
    console.log("=========================================");
    console.log("\nPlease specify a COM port.");
    console.log("Usage: node serial-bridge.js <COM_PORT> [BAUD_RATE]");
    console.log("Example: node serial-bridge.js COM5 115200\n");
    console.log("Scanning for available active ports...");
    
    SerialPort.list().then(ports => {
        if (ports.length === 0) {
            console.log("No serial ports found!");
        } else {
            ports.forEach(p => console.log(` - ${p.path} [${p.manufacturer || 'Unknown Device'}]`));
        }
        process.exit(0);
    });
    return;
}

const baudRate = parseInt(args[1]) || 115200; // Hardware usually defaults to 115200 or 9600

console.log(`Attempting to open ${portName} at ${baudRate} baud...`);
const port = new SerialPort({ path: portName, baudRate: baudRate }, function (err) {
  if (err) {
    return console.log('\n[ERROR] Failed to open port: ', err.message);
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
            // console.log(` -> Forwarded packet to MQTT`);
        } else {
            console.log(` -> (Line ignored: Not a JSON telemetry packet)`);
        }
    } catch (err) {
        console.log(` -> (Line ignored: Invalid JSON)`);
    }
});

port.on('error', err => {
    console.error(`\n[SERIAL ERROR]: ${err.message}`);
});
