import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, child, limitToLast, query } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDcnnG9oHHmC4rC7NgiqeBiIvaHxlRRQHQ",
  authDomain: "test-d0075.firebaseapp.com",
  databaseURL: "https://test-d0075-default-rtdb.firebaseio.com",
  projectId: "test-d0075",
  storageBucket: "test-d0075.firebasestorage.app",
  messagingSenderId: "292384353842",
  appId: "1:292384353842:web:f0960cb3c29085e44fd62b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function check() {
  const rootRef = ref(db);
  const snap = await get(child(rootRef, 'telemetry'));
  if (snap.exists()) {
    const data = snap.val();
    const keys = Object.keys(data);
    console.log("Total packets in telemetry:", keys.length);
    console.log("Latest packet:", data[keys[keys.length - 1]]);
    
    // Check if there's any weird nested paths
    for (const k of keys) {
      if (data[k] && typeof data[k] === 'object' && !data[k].timestamp_ms) {
        console.log("WEIRD DATA DETECTED at key", k, ":", data[k]);
        break; // just show one
      }
    }
  } else {
    console.log("No data at /telemetry");
  }
  process.exit(0);
}
check();
