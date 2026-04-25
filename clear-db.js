import { initializeApp } from "firebase/app";
import { getDatabase, ref, remove } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://test-d0075-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log("Clearing Old Fake Data...");
remove(ref(db, "telemetry")).then(() => {
  console.log("Telemetry database cleared successfully.");
  process.exit(0);
}).catch((err) => {
  console.error("Error clearing DB:", err);
  process.exit(1);
});
