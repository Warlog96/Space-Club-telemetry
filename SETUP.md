# Setup Guide - Admin Telemetry Interface

This guide provides detailed setup instructions for the Admin Telemetry Interface system.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [Server Configuration](#server-configuration)
5. [Admin Credentials Setup](#admin-credentials-setup)
6. [Running the System](#running-the-system)
7. [ESP32 Hardware Setup](#esp32-hardware-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Mosquitto MQTT Broker**
   - Windows: Download from https://mosquitto.org/download/
   - Install and add to PATH
   - Verify installation: `mosquitto --help`

4. **Firebase Account**
   - Create account at: https://console.firebase.google.com/
   - Free tier is sufficient for testing

### Optional Tools

- **Git** - For version control
- **VS Code** - Recommended code editor
- **Arduino IDE** - For ESP32 programming

## Initial Setup

### 1. Install Dependencies

Open terminal in the project root directory:

```bash
# Install admin interface dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install user interface dependencies
cd User-Telemetry-Interface
npm install
cd ..
```

## Firebase Configuration

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name (e.g., "rocket-telemetry")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Realtime Database

1. In Firebase Console, go to **Build → Realtime Database**
2. Click "Create Database"
3. Choose location (closest to you)
4. Start in **test mode** (we'll update rules later)

### 3. Get Firebase Web Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register app with nickname (e.g., "User Interface")
5. Copy the `firebaseConfig` object

### 4. Get Firebase Admin SDK Key

1. In **Project Settings**, go to **Service accounts** tab
2. Click "Generate new private key"
3. Save the JSON file as `serviceAccountKey.json`
4. Move it to the `server/` directory

### 5. Update User Interface Firebase Config

Edit `User-Telemetry-Interface/src/services/HybridDataService.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 6. Set Firebase Database Rules

In Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "telemetry": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

Click **Publish** to save the rules.

## Server Configuration

### 1. Verify Mosquitto Configuration

The `mosquitto.conf` file should contain:

```
listener 1883
allow_anonymous true
```

### 2. Update Server Ports (if needed)

Edit `server/index.js` if you need to change ports:

```javascript
const PORT = 3001;  // Backend server port
const MQTT_BROKER = 'mqtt://localhost:1883';  // MQTT broker
```

### 3. Update WebSocket URL in User Interface

Edit `User-Telemetry-Interface/src/services/HybridDataService.js`:

```javascript
const wsUrl = 'ws://localhost:3001';  // Update if server port changed
```

## Admin Credentials Setup

### 1. Set Admin Password

```bash
cd server
node setup-password.js
```

Follow the prompts:
- Enter username (e.g., "admin")
- Enter password (will be hashed and stored securely)

This creates/updates `server/admin-credentials.json`.

### 2. Verify Credentials File

Check that `server/admin-credentials.json` exists and contains:

```json
{
  "username": "admin",
  "passwordHash": "hashed_password_here"
}
```

## Running the System

### Method 1: Automated Startup (Windows)

```bash
START-SERVER.bat
```

This will:
1. Start Mosquitto MQTT broker
2. Start the backend server
3. Open admin interface in browser

### Method 2: Manual Startup

**Terminal 1 - MQTT Broker:**
```bash
mosquitto -c mosquitto.conf
```

**Terminal 2 - Backend Server:**
```bash
cd server
node index.js
```

**Terminal 3 - Admin Interface:**
```bash
npm run dev
```

**Terminal 4 - User Interface:**
```bash
cd User-Telemetry-Interface
npm run dev
```

### 3. Access the Interfaces

- **Admin Interface**: http://localhost:5173
- **User Interface**: http://localhost:5174
- **Backend API**: http://localhost:3001

## ESP32 Hardware Setup

### 1. Configure ESP32 Code

Edit `Arduino/mqtt_ESPtest/mqtt_ESPtest.ino`:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_SERVER_IP";  // e.g., "192.168.1.100"
```

### 2. Upload to ESP32

1. Open Arduino IDE
2. Install ESP32 board support
3. Install required libraries:
   - PubSubClient (MQTT)
   - WiFi
4. Select board: "ESP32 Dev Module"
5. Select correct COM port
6. Click Upload

### 3. Verify Connection

Check Serial Monitor (115200 baud) for:
```
WiFi connected
MQTT connected
Publishing telemetry...
```

## Testing with Mock Data

Before connecting hardware, test with mock data:

```bash
cd server
node mock_publisher.js
```

This publishes simulated telemetry data to test the system.

## Troubleshooting

### Mosquitto won't start

**Error**: "Address already in use"
- **Solution**: Another MQTT broker is running. Stop it or change port.

**Error**: "mosquitto: command not found"
- **Solution**: Add Mosquitto to system PATH or use full path to executable.

### Server connection errors

**Error**: "EADDRINUSE: address already in use :::3001"
- **Solution**: Port 3001 is in use. Change PORT in `server/index.js`.

**Error**: "Firebase Admin SDK initialization failed"
- **Solution**: Verify `serviceAccountKey.json` is in `server/` directory.

### Interface won't load

**Error**: Blank page or "Cannot GET /"
- **Solution**: Ensure dev server is running (`npm run dev`).

**Error**: "Failed to fetch" in console
- **Solution**: Backend server is not running or wrong URL.

### No data appearing

**Problem**: Interface loads but no telemetry data
- Check MQTT broker is running
- Verify WebSocket connection status (should show "Connected")
- Test with mock publisher
- Check browser console for errors

### Firebase connection issues

**Error**: "Permission denied" in Firebase
- **Solution**: Update database rules to allow public read access.

**Error**: "Invalid API key"
- **Solution**: Verify Firebase config in `HybridDataService.js`.

## Environment Variables (Optional)

For production deployment, use environment variables:

Create `.env` file in `User-Telemetry-Interface/`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_WEBSOCKET_URL=ws://your_server:3001
```

Update `HybridDataService.js` to use:

```javascript
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    // ...
};
```

## Next Steps

After setup is complete:

1. ✅ Test admin login
2. ✅ Test user interface access
3. ✅ Verify mock data appears in both interfaces
4. ✅ Test with ESP32 hardware
5. ✅ Monitor for errors in browser console and server logs

---

**Need help?** Check the main [README.md](README.md) or review server logs for detailed error messages.
