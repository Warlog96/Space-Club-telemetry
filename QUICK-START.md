# Quick Start Guide

## 🚀 One-Click Startup

### For Admin Only
**Double-click:** `START-ALL.bat`

This will:
- ✅ Start MQTT Broker (Mosquitto)
- ✅ Start Backend Server
- ✅ Start Admin Interface
- ✅ Open Admin Interface in browser

### For Admin + Public Viewing
**Double-click:** `START-ALL-WITH-PUBLIC.bat`

This will:
- ✅ Start MQTT Broker (Mosquitto)
- ✅ Start Backend Server
- ✅ Start Admin Interface
- ✅ Start Public Interface
- ✅ Open both interfaces in browser

---

## 📡 ESP32 Connection

### 1. Find Your Computer's IP Address
```bash
ipconfig
```
Look for **IPv4 Address** (e.g., `192.168.1.100`)

### 2. Configure ESP32
Update your ESP32 code with:
- **MQTT Broker:** `mqtt://YOUR_IP:1883`
- **Topic:** `rocket/telemetry`

Example:
```cpp
const char* mqtt_server = "192.168.1.100";  // Your computer's IP
const int mqtt_port = 1883;
const char* mqtt_topic = "rocket/telemetry";
```

### 3. Upload and Run
- Upload code to ESP32
- ESP32 will automatically connect to the MQTT broker
- Data will appear in the Admin Interface

---

## 🔐 Login Credentials

**Admin Interface:**
- Username: `admin`
- Password: `admin123`

**Public Interface:**
- No login required
- Just enter your name

---

## 🌐 Access URLs

| Service | URL |
|---------|-----|
| Admin Interface | http://localhost:5173 |
| Public Interface | http://localhost:5174 |
| Backend HTTP API | http://localhost:3001 |
| Backend WebSocket | ws://localhost:3000 |
| MQTT Broker | mqtt://localhost:1883 |

---

## 🛑 Stopping Services

**Option 1:** Close each service window individually

**Option 2:** Press `Ctrl+C` in each window

**Option 3:** Close all command windows

---

## 🧪 Testing Without ESP32

Use mock data generator:
```bash
node server/mock-telemetry.js
```

This simulates ESP32 telemetry data for testing.

---

## ⚠️ Troubleshooting

### Mosquitto not found
- Install Mosquitto: https://mosquitto.org/download/
- Add to PATH or use full path in script

### Port already in use
- Close other instances of the services
- Check Task Manager for node.exe processes

### ESP32 not connecting
- Verify IP address is correct
- Check firewall settings
- Ensure ESP32 and computer are on same network
- Check MQTT broker is running (look for "Mosquitto Broker" window)

### No data appearing
- Check ESP32 is publishing to correct topic
- Verify MQTT broker window shows incoming connections
- Check Backend Server window for telemetry logs

---

## 📚 More Information

- Full setup guide: `SETUP.md`
- Firebase configuration: `FIREBASE_FLOW.md`
- Deployment guide: `DEPLOYMENT.md`
