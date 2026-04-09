// Firebase Web SDK Configuration
// Reads from the same Firebase project that the ESP32 Ground Station writes to.
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

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
export const db = getDatabase(app);
