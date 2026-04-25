import { initializeApp } from "firebase/app";
import { getDatabase, ref, query, limitToLast, get } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://test-d0075-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const q = query(ref(db, "telemetry"), limitToLast(2));

get(q).then(snapshot => {
  console.log("LAST 2 KEYS:");
  snapshot.forEach(child => {
    console.log("  =>", child.key);
  });
  process.exit(0);
});
