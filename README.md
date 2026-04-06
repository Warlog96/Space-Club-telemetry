# Admin Telemetry Interface

A comprehensive **dual-interface rocket telemetry monitoring system** with real-time data visualization, 3D rocket orientation tracking, GPS mapping, and advanced sensor monitoring.

## 🚀 System Overview

This project consists of **three main components**:

1. **Admin Interface** - Full-featured dashboard with authentication and control capabilities
2. **Public User Interface** - Read-only telemetry viewer for public access
3. **Backend Server** - Node.js server handling MQTT, WebSocket, and Firebase integration

### Key Features

- ✅ **16 Data Visualization Components** including graphs, 3D visualizations, and maps
- ✅ **Real-time Data Streaming** via MQTT and WebSocket
- ✅ **Firebase Integration** for data persistence and public access
- ✅ **Sci-Fi/Dashboard Aesthetic** with premium visuals and animations
- ✅ **Dual Interface System**: Admin (authenticated) vs Public (open access)
- ✅ **ESP32/Arduino Integration** for hardware telemetry transmission

## 📁 Project Structure

```
Admin Telemetry Interface/
├── server/                          # Backend Node.js server
│   ├── index.js                     # Main server (MQTT + WebSocket + Firebase)
│   ├── auth.js                      # Authentication middleware
│   ├── mock_publisher.js            # Mock data generator for testing
│   └── package.json                 # Server dependencies
├── src/                             # Admin Interface source code
│   ├── pages/                       # Page components
│   │   ├── LoginPage.jsx           # Admin login
│   │   ├── LandingPage.jsx         # Post-login landing
│   │   ├── Dashboard.jsx           # Main admin dashboard
│   │   └── PublicDashboard.jsx     # Public view
│   ├── components/                  # Reusable components
│   │   ├── Control/                # Control panels
│   │   ├── Data/                   # Data displays
│   │   ├── Graphs/                 # Chart components
│   │   ├── Modules/                # Specialized visualizations
│   │   ├── Navigation/             # Navigation components
│   │   └── Visuals/                # Visual effects
│   ├── context/                     # React Context for state
│   ├── services/                    # Data services
│   └── App.jsx                      # Main app component
├── User-Telemetry-Interface/       # Public Interface (separate app)
│   ├── src/                        # User interface source
│   ├── CONFIG.md                   # Configuration guide
│   └── package.json                # User interface dependencies
├── Arduino/                         # ESP32/Arduino code
│   └── mqtt_ESPtest/               # MQTT telemetry transmission
├── START-SERVER.bat                 # Windows startup script
├── START-SERVER.ps1                 # PowerShell startup script
├── mosquitto.conf                   # MQTT broker configuration
└── package.json                     # Admin interface dependencies
```

## 🛠️ Technology Stack

### Frontend
- **React 18/19** - UI framework
- **Vite** - Build tool and dev server
- **Three.js + React Three Fiber** - 3D rocket visualization
- **Recharts** - Graph/chart library
- **Leaflet + React-Leaflet** - Map tracking
- **Framer Motion** - Animations

### Backend
- **Node.js + Express** - Server framework
- **MQTT.js** - MQTT client for hardware communication
- **WebSocket (ws)** - Real-time data streaming
- **Firebase Admin SDK** - Authentication and database

### Hardware
- **ESP32/Arduino** - Telemetry data transmission via MQTT

## 🚦 Quick Start

> **⚡ NEW: One-Click Startup!** See [QUICK-START.md](QUICK-START.md) for the fastest way to get started.

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Mosquitto MQTT Broker** (for MQTT communication)
- **Firebase Account** (for database and public access)

### 1. Install Dependencies

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

### 2. Configure Firebase

See [SETUP.md](SETUP.md) for detailed Firebase configuration instructions.

### 3. Start the System

**🎯 RECOMMENDED: One-Click Startup (Windows)**

**For Admin Interface Only:**
```bash
START-ALL.bat
```
This starts MQTT broker, backend server, admin interface, and opens it in your browser.

**For Admin + Public Interfaces:**
```bash
START-ALL-WITH-PUBLIC.bat
```
This starts everything including the public viewer interface.

---

**Alternative: Manual Startup**
```bash
# Terminal 1: Start Mosquitto MQTT Broker
mosquitto -c mosquitto.conf

# Terminal 2: Start Backend Server
cd server
node index.js

# Terminal 3: Start Admin Interface
npm run dev

# Terminal 4: Start User Interface (optional)
cd User-Telemetry-Interface
npm run dev
```


### 4. Access the Interfaces

- **Admin Interface**: http://localhost:5173 (authenticated admin dashboard)
- **User Interface**: http://localhost:5174 (public read-only viewer)
- **Backend Server**: http://localhost:3001 (API and WebSocket)

## 🔐 Admin Login

Default admin credentials are set using the password setup script:

```bash
cd server
node setup-password.js
```

Follow the prompts to set your admin username and password.

## 🧪 Testing with Mock Data

To test the system without hardware:

```bash
cd server
node mock_publisher.js
```

This will publish simulated telemetry data to the MQTT broker.

## 📊 Dashboard Features

### Admin Interface
- 🔒 Authentication required
- 🎮 Ignition controls
- 📍 Admin location tracking
- 💾 CSV data export
- 📈 All 16 visualization components
- 🗺️ GPS tracking map
- 🚀 3D rocket orientation viewer

### Public User Interface
- 🌐 No authentication required
- 👀 Read-only access
- 📈 Same visualization layout as admin
- 🔌 Hybrid data source (WebSocket + Firebase)
- ❌ No control capabilities

## 🗄️ Firebase Data Management

The system uses **session-based storage** in Firebase Realtime Database. Each server restart creates a new session with a timestamp, keeping your data organized and making cleanup easy.

### Session Structure
```
sessions/
  └── session_2026-01-09_14-55-01/
      ├── metadata/
      └── telemetry/
```

### Data Cleanup Options

**Via API Endpoints (Admin Only):**
- List all sessions: `GET /api/firebase/sessions`
- Delete specific session: `DELETE /api/firebase/session/:sessionId`
- Cleanup old test data: `POST /api/firebase/cleanup-mock`
- Clear all data: `DELETE /api/firebase/all`

**Via Firebase Console:**
- Navigate to your Firebase project
- Go to Realtime Database → Data
- Manually delete session folders

For detailed information, see [FIREBASE_FLOW.md](FIREBASE_FLOW.md).

## 📖 Additional Documentation

- [SETUP.md](SETUP.md) - Detailed setup and configuration guide
- [FIREBASE_FLOW.md](FIREBASE_FLOW.md) - Firebase server flow and data management
- [User-Telemetry-Interface/CONFIG.md](User-Telemetry-Interface/CONFIG.md) - User interface specific configuration

## 🐛 Troubleshooting

### Server won't start
- Ensure Mosquitto is installed and running
- Check that port 3001 is not in use
- Verify Firebase credentials are configured

### Interface won't load
- Check that all dependencies are installed (`npm install`)
- Ensure the dev server is running (`npm run dev`)
- Check browser console for errors

### No data appearing
- Verify MQTT broker is running
- Check WebSocket connection status in the interface
- Test with mock data publisher

## 📝 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

This is a custom telemetry system. For modifications or improvements, please document changes thoroughly.

---

**Built with ❤️ for rocket telemetry monitoring**
