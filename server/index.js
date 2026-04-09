const mqtt = require('mqtt');
const WebSocket = require('ws');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
// Auth removed — no login required
const serviceAccount = require('./serviceAccountKey.json');
const FirebaseManager = require('./firebase-manager');

// Configuration - Use environment variables with fallbacks
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'rocket/telemetry';
const WS_PORT = process.env.WS_PORT || process.env.PORT || 3000;
const HTTP_PORT = process.env.HTTP_PORT || (process.env.PORT ? parseInt(process.env.PORT) + 1 : 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

// --- 0. Firebase Setup ---
let db = null;
let firebaseManager = null;

try {
    if (serviceAccount.project_id === "YOUR_PROJECT_ID_HERE") {
        console.warn("[Backend] Firebase Key is MOCK. Cloud logging disabled.");
    } else {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
        });
        db = admin.database();
        console.log("[Backend] Firebase Admin Initialized");

        // Initialize Firebase Manager and create session
        firebaseManager = new FirebaseManager(db);
        firebaseManager.createSession().then(sessionId => {
            if (sessionId) {
                console.log(`[Backend] ✓ Session-based storage ready: ${sessionId}`);
            }
        }).catch(err => {
            console.error("[Backend] Session creation error:", err.message);
        });

        // =====================================================================
        // FIREBASE REAL-TIME LISTENER
        // The ESP32 Ground Station writes directly to /telemetry/{timestamp}.
        // This listener picks up every new entry and feeds it into the normal
        // processPacket pipeline → WebSocket → UI.
        // =====================================================================
        const telemetryRef = db.ref('telemetry');

        // limitToLast(1) on 'value' fires once to skip historical data.
        // Then we switch to 'child_added' which fires for every NEW entry.
        telemetryRef.limitToLast(1).once('value', () => {
            console.log('[Firebase Listener] Skipped historical data. Now watching for new packets...');

            telemetryRef.limitToLast(1).on('child_added', (snapshot) => {
                try {
                    const packet = snapshot.val();
                    if (!packet) return;

                    // Avoid duplicate processing — only handle packets <10 seconds old
                    const age = Date.now() - (packet.timestamp_ms || 0);
                    if (age > 10000) return;

                    console.log(`[Firebase Listener] New packet received from ESP32: ts=${packet.timestamp_ms}`);
                    processPacket(packet);
                } catch (e) {
                    console.error('[Firebase Listener] Error processing packet:', e.message);
                }
            });
        });
    }
} catch (e) {
    console.error("[Backend] Firebase Init Error:", e.message);
}

// --- 0.5. Ignition State Management ---
let ignitionState = {
    isIgnited: false,
    ignitionTimestamp: null,
    activityLog: [],
    csvSeparatorAdded: false
};

// --- 0.6. Watchdog Timer State ---
let watchdogState = {
    lastDataReceived: null,
    wdtTimeout: 5000 // 5 seconds timeout
};

function logIgnitionEvent(event, username = 'SYSTEM') {
    const entry = {
        timestamp: new Date().toISOString(),
        realTimeClock: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        event: event,
        username: username
    };
    ignitionState.activityLog.push(entry);
    console.log(`[Ignition] ${event} by ${username} at ${entry.realTimeClock}`);
}

function getMissionElapsedTime() {
    if (!ignitionState.ignitionTimestamp) return 0;
    return Date.now() - ignitionState.ignitionTimestamp;
}

function getWatchdogStatus() {
    if (!ignitionState.isIgnited) {
        return { active: false, timeSinceLastData: 0 };
    }

    if (!watchdogState.lastDataReceived) {
        return { active: true, timeSinceLastData: Date.now() - ignitionState.ignitionTimestamp };
    }

    const timeSinceLastData = Date.now() - watchdogState.lastDataReceived;
    return {
        active: timeSinceLastData > watchdogState.wdtTimeout,
        timeSinceLastData: timeSinceLastData
    };
}

// --- 1. MQTT Client Setup ---
console.log(`[Backend] Connecting to MQTT Broker at ${MQTT_BROKER}...`);
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
    console.log('[Backend] MQTT Connected!');
    mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (err) console.error('[Backend] Subscribe Error:', err);
        else console.log(`[Backend] Subscribed to ${MQTT_TOPIC}`);
    });
});

mqttClient.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
        // No MQTT broker running locally — this is normal when no hardware is connected.
        // The rest of the server (WebSocket, HTTP API, Firebase) continues to work fine.
        console.warn('[Backend] MQTT broker not available at ' + MQTT_BROKER + ' — no hardware connected. Waiting for broker...');
    } else {
        console.error('[Backend] MQTT Error:', err.message);
    }
});

// --- 2. HTTP Server Setup (for authentication) ---
const app = express();

// CORS Configuration - Allow deployed frontend
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow configured frontend URL
        if (origin === FRONTEND_URL) {
            return callback(null, true);
        }

        // Allow any Vercel deployment URLs (for preview deployments)
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            mqtt: mqttClient.connected,
            firebase: db !== null,
            websocket: wss ? wss.clients.size : 0
        }
    });
});

// Auth endpoints removed — no login required

// Ignition status endpoint (public)
app.get('/api/ignition/status', (req, res) => {
    res.json({
        ignitionOn: ignitionState.isIgnited,
        launchTime: ignitionState.ignitionTimestamp,
        missionElapsedTime: getMissionElapsedTime(),
        activityLog: ignitionState.activityLog,
        watchdog: getWatchdogStatus()
    });
});

// Trigger ignition endpoint (admin only)
app.post('/api/ignition/trigger', (req, res) => {
    const { ignite } = req.body;
    const username = 'admin';

    if (ignite && !ignitionState.isIgnited) {
        // Turn ON ignition
        ignitionState.isIgnited = true;
        ignitionState.ignitionTimestamp = Date.now();
        ignitionState.csvSeparatorAdded = false;
        watchdogState.lastDataReceived = null; // Reset watchdog
        logIgnitionEvent('IGNITION ON - Rocket Ignited', username);

        // Broadcast ignition event to all connected clients
        broadcast({
            type: 'ignition',
            isIgnited: true,
            timestamp: ignitionState.ignitionTimestamp
        });

        res.json({
            success: true,
            message: 'Ignition triggered',
            ignitionTimestamp: ignitionState.ignitionTimestamp
        });
    } else if (!ignite && ignitionState.isIgnited) {
        // Turn OFF ignition
        ignitionState.isIgnited = false;
        const previousTimestamp = ignitionState.ignitionTimestamp;
        ignitionState.ignitionTimestamp = null;
        watchdogState.lastDataReceived = null; // Reset watchdog
        logIgnitionEvent('IGNITION OFF - System Reset', username);

        // Broadcast ignition off event
        broadcast({
            type: 'ignition',
            isIgnited: false,
            timestamp: null
        });

        res.json({
            success: true,
            message: 'Ignition turned off',
            previousTimestamp: previousTimestamp
        });
    } else {
        res.json({
            success: false,
            message: ignite ? 'Already ignited' : 'Already off'
        });
    }
});

// Download ignition log as CSV
app.get('/api/ignition/log/download', (req, res) => {
    const headers = ['Timestamp', 'Real-Time Clock', 'Event', 'Admin User'];
    const rows = ignitionState.activityLog.map(entry => [
        entry.timestamp,
        entry.realTimeClock,
        entry.event,
        entry.username
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ignition_log_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
});

// --- Firebase Data Management Endpoints ---

// Get current session info
app.get('/api/firebase/current-session', (req, res) => {
    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const sessionId = firebaseManager.getCurrentSessionId();
    res.json({
        sessionId,
        serverStartTime: firebaseManager.sessionMetadata?.serverStartTime,
        serverStartTimestamp: firebaseManager.sessionMetadata?.serverStartTimestamp
    });
});

// List all sessions
app.get('/api/firebase/sessions', async (req, res) => {
    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    try {
        const sessions = await firebaseManager.listSessions();
        res.json({ sessions });
    } catch (error) {
        console.error('[API] Error listing sessions:', error);
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

// Get specific session data
app.get('/api/firebase/session/:sessionId', async (req, res) => {
    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    try {
        const { sessionId } = req.params;
        const sessionData = await firebaseManager.getSessionData(sessionId);

        if (!sessionData) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(sessionData);
    } catch (error) {
        console.error('[API] Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session data' });
    }
});

// Delete specific session (admin only)
app.delete('/api/firebase/session/:sessionId', async (req, res) => {
    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    try {
        const { sessionId } = req.params;
        await firebaseManager.deleteSession(sessionId);
        res.json({
            success: true,
            message: `Session ${sessionId} deleted`,
            deletedBy: 'admin'
        });
    } catch (error) {
        console.error('[API] Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Clear all Firebase data (admin only, requires confirmation)
app.delete('/api/firebase/all', async (req, res) => {
    // Require confirmation token in request body
    const { confirmToken } = req.body;
    if (confirmToken !== 'DELETE_ALL_DATA') {
        return res.status(400).json({
            error: 'Confirmation required',
            message: 'Send {"confirmToken": "DELETE_ALL_DATA"} to confirm deletion'
        });
    }

    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    try {
        await firebaseManager.clearAllData();
        res.json({
            success: true,
            message: 'All Firebase data cleared',
            deletedBy: 'admin',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[API] Error clearing all data:', error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

// Cleanup mock/test data (admin only)
app.post('/api/firebase/cleanup-mock', async (req, res) => {
    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    try {
        const { olderThanHours = 24 } = req.body;
        const deletedSessions = await firebaseManager.cleanupMockData(olderThanHours);
        res.json({
            success: true,
            message: `Cleaned up ${deletedSessions.length} sessions`,
            deletedSessions,
            cleanedBy: 'admin'
        });
    } catch (error) {
        console.error('[API] Error cleaning up mock data:', error);
        res.status(500).json({ error: 'Failed to cleanup mock data' });
    }
});

// Delete legacy missions data (admin only)
app.delete('/api/firebase/legacy-missions', async (req, res) => {
    if (!firebaseManager) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }

    try {
        await firebaseManager.deleteLegacyMissions();
        res.json({
            success: true,
            message: 'Legacy missions data deleted',
            deletedBy: 'admin'
        });
    } catch (error) {
        console.error('[API] Error deleting legacy missions:', error);
        res.status(500).json({ error: 'Failed to delete legacy missions' });
    }
});


app.listen(HTTP_PORT, () => {
    console.log(`[Backend] HTTP Server started on port ${HTTP_PORT}`);
});

// --- 3. WebSocket Server Setup ---
const wss = new WebSocket.Server({ port: WS_PORT });
console.log(`[Backend] WebSocket Server started on port ${WS_PORT}`);

wss.on('connection', (ws) => {
    console.log('[Backend] UI Client Connected');

    // Send latest state immediately on connection if available
    if (latestPacket) {
        ws.send(JSON.stringify(latestPacket));
    }

    ws.on('close', () => console.log('[Backend] UI Client Disconnected'));
});

// Broadcast function — serialize ONCE, send to all clients
function broadcast(data) {
    const msg = JSON.stringify(data); // single serialization for all clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// --- 3. Telemetry Processing ---
let latestPacket = null;

// --- Orientation State (Complementary Filter) ---
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

    // 1. Calculate Accelerometer Angles (Gravity Reference)
    const ax = imu.acceleration.x_mps2 || 0;
    const ay = imu.acceleration.y_mps2 || 0;
    const az = imu.acceleration.z_mps2 || 0;

    // Pitch: Tilt in Z-direction vs Vertical (-X)
    const accelPitch = Math.atan2(az, -ax) * (180 / Math.PI);
    // Roll: Tilt in Y-direction vs Vertical (-X)
    const accelRoll = Math.atan2(ay, -ax) * (180 / Math.PI);

    // 2. Auto-Calibration (Tare on start)
    if (!orientationState.calibrated && Math.abs(ax) > 8) {
        orientationState.pitchOffset = accelPitch;
        orientationState.rollOffset = accelRoll;
        orientationState.pitch = 0; // Start fresh
        orientationState.roll = 0;
        orientationState.yaw = 0;
        orientationState.calibrated = true;
        console.log(`[Backend] Calibrated. Offsets -> Pitch: ${accelPitch.toFixed(2)}°, Roll: ${accelRoll.toFixed(2)}°`);
    }

    // 3. Gyroscope Integration (Rate -> Angle change)
    // Gyro X = Roll rate (around X axis) - Wait, X is vertical? 
    // MPU6050 mounting: X vertical.
    // Gyro X measures spin around Vertical (Yaw).
    // Gyro Y measures rotation around Y (Pitch).
    // Gyro Z measures rotation around Z (Roll).
    
    // Convert radians/sec to degrees/sec
    const gyroX_deg = (imu.gyroscope?.x_rps || 0) * (180 / Math.PI);
    const gyroY_deg = (imu.gyroscope?.y_rps || 0) * (180 / Math.PI);
    const gyroZ_deg = (imu.gyroscope?.z_rps || 0) * (180 / Math.PI);

    // 4. Complementary Filter
    const alpha = 0.98; // Trust Gyro 98%, Accel 2% (Smooths out jitter, corrects drift)

    if (orientationState.calibrated) {
        // Pitch (Around Y axis)
        orientationState.pitch = alpha * (orientationState.pitch + gyroY_deg * dt) + (1 - alpha) * (accelPitch - orientationState.pitchOffset);
        
        // Roll (Around Z axis)
        orientationState.roll = alpha * (orientationState.roll + gyroZ_deg * dt) + (1 - alpha) * (accelRoll - orientationState.rollOffset);
        
        // Yaw (Around X axis - Pure Gyro, no compass reference)
        orientationState.yaw = orientationState.yaw + (gyroX_deg * dt);
    }

    return {
        roll: parseFloat(orientationState.roll.toFixed(2)),
        pitch: parseFloat(orientationState.pitch.toFixed(2)),
        yaw: parseFloat(orientationState.yaw.toFixed(2))
    };
}

function processPacket(packet) {
    // Basic Validation
    if (!packet.timestamp_ms || !packet.gps || !packet.imu) {
        console.warn('[Backend] Invalid Packet Structure');
        return;
    }

    // Compute Orientation using Complementary Filter
    if (packet.imu) {
        const orientation = calculateOrientation(packet.imu, packet.timestamp_ms);
        packet.imu.roll  = orientation.roll;
        packet.imu.pitch = orientation.pitch;
        packet.imu.yaw   = orientation.yaw;
        
        // Vertical acceleration (Gravity compensated)
        packet.imu.vertical_accel_mps2 = parseFloat((-packet.imu.acceleration.x_mps2 - 9.807).toFixed(3));
    }

    // Expose a top-level altitude_m
    packet.altitude_m = packet.bmp280?.altitude_m ?? packet.gps?.altitude_m ?? 0;

    console.log(`[Telemetery] Pkt ${packet.packet?.count} | Alt: ${packet.altitude_m}m | P: ${packet.imu?.pitch}° R: ${packet.imu?.roll}°`);

    // Update watchdog timer
    watchdogState.lastDataReceived = Date.now();

    // Add CSV separator marker if ignition just happened
    if (ignitionState.isIgnited && !ignitionState.csvSeparatorAdded) {
        packet._csvSeparator = true; // Mark this packet to trigger separator in CSV export
        ignitionState.csvSeparatorAdded = true;
        console.log('[Backend] CSV Separator marker added to telemetry');
    }

    // Add mission elapsed time to packet if ignited
    if (ignitionState.isIgnited) {
        packet.missionElapsedTime = getMissionElapsedTime();
    }

    // Store locally
    latestPacket = packet;

    // Relay to UI — highest priority, runs immediately
    broadcast(packet);

    // Firebase Log — deferred OFF the hot path + throttled to every 3rd packet
    // This ensures broadcast is never delayed by a slow Firebase write
    const pktNum = packet.packet?.count || 0;
    if (firebaseManager && packet.timestamp_ms && pktNum % 3 === 0) {
        setImmediate(() => {
            firebaseManager.saveTelemetry(packet)
                .catch(e => console.error('[Firebase] Write Error:', e.message));
        });
    }
}

mqttClient.on('message', (topic, message) => {
    if (topic === MQTT_TOPIC) {
        try {
            const rawString = message.toString();
            const packet = JSON.parse(rawString);
            processPacket(packet);
        } catch (e) {
            console.error('[Backend] JSON Parse Error:', e.message);
        }
    }
});

// Test Endpoint for Mock Data (HTTP Injection)
app.post('/api/test/telemetry', (req, res) => {
    try {
        const packet = req.body;
        processPacket(packet);
        res.json({ success: true, message: 'Packet processed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Backend] Shutting down...');
    mqttClient.end();
    wss.close();
    process.exit();
});
