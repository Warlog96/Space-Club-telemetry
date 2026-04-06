# Quick Start: Clean Up Your Firebase Database

## Current Situation

Your Firebase database now uses **session-based storage**. Each time the server starts, it creates a new session folder with a timestamp (e.g., `session_2026-01-09_15-00-25`).

## Remove Old Mock Data - 3 Easy Methods

### Method 1: Delete All Legacy Data (Recommended First Step)

This removes the old `missions/` structure completely:

```bash
# Get your auth token first (see below)
curl -X DELETE http://localhost:3001/api/firebase/legacy-missions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Method 2: Clean Up Old Test Sessions

Remove sessions older than 24 hours automatically:

```bash
curl -X POST http://localhost:3001/api/firebase/cleanup-mock \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"olderThanHours\": 24}"
```

---

### Method 3: Delete Specific Sessions

**Step 1:** See what sessions exist
```bash
curl http://localhost:3001/api/firebase/sessions
```

**Step 2:** Delete a specific session
```bash
curl -X DELETE http://localhost:3001/api/firebase/session/SESSION_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## How to Get Your Auth Token

**Option A: Via Admin Interface**
1. Open http://localhost:5173
2. Login with your admin credentials
3. Open browser DevTools (F12)
4. In Console, type: `localStorage.getItem('authToken')`
5. Copy the token value

**Option B: Via API Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"YOUR_USERNAME\",\"password\":\"YOUR_PASSWORD\"}"
```

The response will include your token.

---

## Nuclear Option: Delete Everything

> ⚠️ **WARNING:** This deletes ALL data from Firebase!

```bash
curl -X DELETE http://localhost:3001/api/firebase/all \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"confirmToken\": \"DELETE_ALL_DATA\"}"
```

---

## What Happens Now

✅ **Every server restart** creates a new session  
✅ **All telemetry data** goes into the current session  
✅ **Old sessions** stay in Firebase until you delete them  
✅ **Easy cleanup** via API or Firebase Console  

---

## Need More Help?

See the full documentation: [FIREBASE_FLOW.md](file:///e:/Admin%20Telemetry%20Interface/FIREBASE_FLOW.md)
