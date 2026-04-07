const mqtt = require('mqtt');
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = 'rocket/telemetry';

const mqttClient = mqtt.connect(MQTT_BROKER);

let orientationState = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    lastTimestamp: 0,
    calibrated: false,
    pitchOffset: 0,
    rollOffset: 0
};

function calculateOrientation(imu, timestamp) {
    if (!imu || !imu.acceleration) {
        return { roll: 0, pitch: 0, yaw: 0 };
    }

    const dt = orientationState.lastTimestamp ? (timestamp - orientationState.lastTimestamp) / 1000 : 0.1;
    orientationState.lastTimestamp = timestamp;

    const ax = imu.acceleration.x_mps2 || 0;
    const ay = imu.acceleration.y_mps2 || 0;
    const az = imu.acceleration.z_mps2 || 0;

    const accelPitch = Math.atan2(az, -ax) * (180 / Math.PI);
    const accelRoll = Math.atan2(ay, -ax) * (180 / Math.PI);

    if (!orientationState.calibrated && Math.abs(ax) > 8) {
        orientationState.pitchOffset = accelPitch;
        orientationState.rollOffset = accelRoll;
        orientationState.pitch = 0;
        orientationState.roll = 0;
        orientationState.yaw = 0;
        orientationState.calibrated = true;
    }

    const gyroX_deg = (imu.gyroscope?.x_rps || 0) * (180 / Math.PI);
    const gyroY_deg = (imu.gyroscope?.y_rps || 0) * (180 / Math.PI);
    const gyroZ_deg = (imu.gyroscope?.z_rps || 0) * (180 / Math.PI);

    const alpha = 0.98;

    if (orientationState.calibrated) {
        orientationState.pitch = alpha * (orientationState.pitch + gyroY_deg * dt) + (1 - alpha) * (accelPitch - orientationState.pitchOffset);
        orientationState.roll = alpha * (orientationState.roll + gyroZ_deg * dt) + (1 - alpha) * (accelRoll - orientationState.rollOffset);
        orientationState.yaw = orientationState.yaw + (gyroX_deg * dt);
    }

    return {
        roll: parseFloat(orientationState.roll.toFixed(2)),
        pitch: parseFloat(orientationState.pitch.toFixed(2)),
        yaw: parseFloat(orientationState.yaw.toFixed(2))
    };
}

function processPacket(packet) {
    if (!packet.timestamp_ms || !packet.gps || !packet.imu) {
        console.warn('Invalid Packet Structure');
        return;
    }

    if (packet.imu) {
        const orientation = calculateOrientation(packet.imu, packet.timestamp_ms);
        packet.imu.roll  = orientation.roll;
        packet.imu.pitch = orientation.pitch;
        packet.imu.yaw   = orientation.yaw;
        packet.imu.vertical_accel_mps2 = parseFloat((-packet.imu.acceleration.x_mps2 - 9.807).toFixed(3));
    }

    packet.altitude_m = packet.bmp280?.altitude_m ?? packet.gps?.altitude_m ?? 0;

    console.log(`Pkt ${packet.packet?.count} processed successfully. Alt: ${packet.altitude_m}`);
}

mqttClient.on('connect', () => {
    console.log('Connected to MQTT, listening for telemetry');
    mqttClient.subscribe(MQTT_TOPIC);
});

mqttClient.on('message', (topic, message) => {
    try {
        const packet = JSON.parse(message.toString());
        processPacket(packet);
        console.log('PACKET IS VALID AND READY FOR WEBSOCKET');
    } catch (e) {
        console.error('ERROR PARSING:', e.message);
    }
    process.exit(0);
});

setTimeout(() => process.exit(0), 4000);
