import { initializeApp } from "firebase/app";
import { getDatabase, ref, query, limitToLast, onValue } from "firebase/database";

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

const latestQuery = query(ref(db, "telemetry"), limitToLast(1));

console.log("Listening to Firebase...");
onValue(latestQuery, (snapshot) => {
  snapshot.forEach(child => {
    console.log("Key:", child.key, "Timestamp:", child.val()?.timestamp_ms);
  });
});
