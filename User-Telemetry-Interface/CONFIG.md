# User Telemetry Interface - Configuration Guide

## Overview

The **Public Telemetry Interface** is a read-only dashboard for viewing rocket telemetry data in real-time. It uses a hybrid data service that combines WebSocket (for live updates) and Firebase (for reliability and persistence).

## Firebase Setup

### 1. Create Firebase Project

If you haven't already created a Firebase project:
- Go to https://console.firebase.google.com/
- Create a new project or use existing one
- Enable **Realtime Database**

### 2. Get Firebase Config

1. Go to **Project Settings** → **General** → **Your apps**
2. Click the Web icon (`</>`) to add a web app
3. Copy the `firebaseConfig` object

### 3. Update HybridDataService.js

Edit `src/services/HybridDataService.js` (around line 6):

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

### 4. Update WebSocket URL

In `src/services/HybridDataService.js` (around line 113):

```javascript
const wsUrl = 'ws://YOUR_BACKEND_URL:3001';
// For local testing: 'ws://localhost:3001'
// For production: 'ws://your-server-ip:3001'
```

## Database Rules (Firebase Console)

Set these rules for public read access:

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

This allows:
- ✅ Anyone to **read** telemetry data (public access)
- ❌ Only authenticated users to **write** data (admin only)

## Running Locally

### Development Mode

```bash
npm run dev
```

Open http://localhost:5173 (or next available port)

### Production Build

```bash
npm run build
npm run preview
```

## Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow prompts to deploy

### Option 2: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm i -g firebase-tools
   ```

2. Login and initialize:
   ```bash
   firebase login
   firebase init hosting
   ```

3. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

## Environment Variables (Optional)

For better security, use environment variables:

Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_WEBSOCKET_URL=ws://your_backend:3001
```

Then update `HybridDataService.js`:
```javascript
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    // ...
};

const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
```

## Features

### ✅ Included Features
- Real-time telemetry visualization
- 3D rocket orientation viewer
- GPS tracking map
- 12 telemetry graphs
- 3 module data views
- Connection status indicator
- Hybrid data service (WebSocket + Firebase)
- No authentication required
- Public access

### ❌ Not Included (Admin Only)
- Ignition controls
- Admin location tracking
- CSV data downloads
- Authentication system

## Troubleshooting

### No Data Appearing

**Problem**: Interface loads but shows no telemetry data

**Solutions**:
1. Check connection status indicator (should show "Connected")
2. Verify WebSocket URL is correct in `HybridDataService.js`
3. Ensure backend server is running on port 3001
4. Check Firebase database rules allow public read
5. Open browser console and look for errors

### WebSocket Connection Failed

**Error**: "WebSocket connection failed" in console

**Solutions**:
1. Verify backend server is running: `cd server && node index.js`
2. Check WebSocket URL matches your server address
3. Ensure port 3001 is not blocked by firewall
4. For remote servers, use `ws://server-ip:3001` not `localhost`

### Firebase Permission Denied

**Error**: "Permission denied" when reading from Firebase

**Solutions**:
1. Go to Firebase Console → Realtime Database → Rules
2. Ensure read permission is set to `true` for telemetry path
3. Click "Publish" to save rules
4. Wait a few seconds for rules to propagate

### Build Errors

**Error**: Module not found or import errors

**Solutions**:
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Ensure all dependencies are installed
3. Check that all component imports are correct

### Blank Page After Build

**Problem**: Production build shows blank page

**Solutions**:
1. Check browser console for errors
2. Ensure base path is correct in `vite.config.js`
3. Verify all assets are being served correctly
4. Test with `npm run preview` before deploying

## Testing

### With Mock Data

If the backend server has mock data enabled, you should see simulated telemetry data flowing through the interface.

### With Real Hardware

Ensure your ESP32 is:
1. Connected to WiFi
2. Publishing to MQTT broker
3. Sending data in the correct format

Check the backend server logs to verify data is being received.

## Support

For detailed setup instructions, see the main project [SETUP.md](../SETUP.md) in the root directory.

For general project information, see [README.md](../README.md).

