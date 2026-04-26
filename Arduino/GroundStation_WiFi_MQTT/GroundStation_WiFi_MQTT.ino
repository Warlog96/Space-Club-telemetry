#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <RadioLib.h>

#define LED 2

// ===================== WIFI & FIREBASE =====================
const char* ssid = "Avaneesh";          // <-- CHANGE THIS to your Hotspot Name
const char* password = "123456789";  // <-- CHANGE THIS to your Hotspot Password
String FIREBASE_URL = "https://test-d0075-default-rtdb.firebaseio.com/telemetry/"; // Your Firebase Database

// ===================== BINARY PACKET STRUCT =====================
#pragma pack(push, 1)
struct TelemetryPacket {
  uint16_t packetCount;
  int32_t  lat;
  int32_t  lng;
  int16_t  gpsAlt;
  int16_t  ax, ay, az;
  int16_t  gx, gy, gz;
  int16_t  temperature;
  uint16_t pressure;
  int16_t  bmpAlt;
  int16_t  strain1;
  int16_t  strain2;
  int16_t  thermo;
};
#pragma pack(pop)

// Structure to pass data safely between processor cores
struct QueueItem {
  TelemetryPacket pkt;
  unsigned long timestamp;
  float rssi;
  float snr;
};

// ===================== LORA =====================
SX1262 radio = new Module(5, 26, 14, 27);

// ===================== RTOS QUEUE =====================
QueueHandle_t telemetryQueue;

// ===================== CORE 0: FIREBASE UPLOADER =====================
// This task runs strictly on Core 0 and handles all internet connections
// in the background. It prevents HTTP timeouts from killing LoRa reception.
void firebaseUploadTask(void *pvParameters) {
  QueueItem item;
  while (true) {
    // Wait until a packet is pushed into the queue (blocks cleanly to save CPU)
    if (xQueueReceive(telemetryQueue, &item, portMAX_DELAY) == pdPASS) {
      
      uint16_t pktCount = item.pkt.packetCount;
      double lat = item.pkt.lat / 1e6;
      double lng = item.pkt.lng / 1e6;
      float gpsAlt = (float)item.pkt.gpsAlt;
      float ax = item.pkt.ax / 100.0f;
      float ay = item.pkt.ay / 100.0f;
      float az = item.pkt.az / 100.0f;
      float gx = item.pkt.gx / 100.0f;
      float gy = item.pkt.gy / 100.0f;
      float gz = item.pkt.gz / 100.0f;
      float temperature = item.pkt.temperature / 100.0f;
      float pressure = (float)item.pkt.pressure;
      float bmpAlt = (float)item.pkt.bmpAlt;
      
      // Load STR1 and STR2 properly
      float strain1 = item.pkt.strain1 / 100.0f;
      float strain2 = item.pkt.strain2 / 100.0f;
      float thermo = item.pkt.thermo / 100.0f;

      // Construct perfectly formatted JSON
      String json = "{";
      json += "\"version\":\"1.0\",";
      json += "\"mission\":\"EKLAVYA_LIVE\",";
      json += "\"timestamp_ms\":" + String(item.timestamp) + ",";
      json += "\"packet\":{\"count\":" + String(pktCount) + ",\"phase\":\"FLIGHT\"},";

      json += "\"gps\":{";
      json += "\"latitude\":"  + String(lat, 6) + ",";
      json += "\"longitude\":" + String(lng, 6) + ",";
      json += "\"altitude_m\":" + String(gpsAlt, 2) + ",";
      json += "\"valid\":true,";
      json += "\"satellites\":8},";

      json += "\"imu\":{";
      json += "\"acceleration\":{";
      json += "\"x_mps2\":" + String(ax, 2) + ",";
      json += "\"y_mps2\":" + String(ay, 2) + ",";
      json += "\"z_mps2\":" + String(az, 2) + "},";
      json += "\"gyroscope\":{";
      json += "\"x_rps\":" + String(gx, 3) + ",";
      json += "\"y_rps\":" + String(gy, 3) + ",";
      json += "\"z_rps\":" + String(gz, 3) + "},";
      json += "\"calibrated\":true},";

      json += "\"bmp280\":{";
      json += "\"temperature_c\":" + String(temperature, 2) + ",";
      json += "\"pressure_hpa\":" + String(pressure, 2) + ",";
      json += "\"altitude_m\":"   + String(bmpAlt, 2) + ",";
      json += "\"calibrated\":true},";

      // Fixed syntax crash here:
      json += "\"structure\":{";
      json += "\"strain_microstrain1\":" + String(strain1, 4) + ",";
      json += "\"strain_microstrain2\":" + String(strain2, 4) + ",";
      json += "\"thermocouple_c\":"      + String(thermo, 2) + "},";

      json += "\"radio\":{";
      json += "\"rssi_dbm\":" + String(item.rssi, 1) + ",";
      json += "\"snr_db\":"+   String(item.snr, 1) + "}";
      json += "}";

      if (WiFi.status() == WL_CONNECTED) {
        digitalWrite(LED, HIGH);
        HTTPClient http;
        String postUrl = FIREBASE_URL + ".json";
        http.begin(postUrl);
        http.addHeader("Content-Type", "application/json");
        int httpResponseCode = http.POST(json); // Use POST for automatic chronological Firebase entries
        
        if (httpResponseCode > 0) {
          Serial.print("Firebase OK! [Pending queue: ");
          Serial.print(uxQueueMessagesWaiting(telemetryQueue)); // Show queue length
          Serial.print("] Packet #");
          Serial.println(pktCount);
        } else {
          Serial.print("Firebase ERR: ");
          Serial.println(httpResponseCode);
        }
        http.end();
        digitalWrite(LED, LOW);
      }
    }
  }
}

// ===================== CORE 1: MAIN & LORA =====================
void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);

  Serial.begin(115200);
  delay(500);

  SPI.begin(18, 19, 23);   // SCK, MISO, MOSI

  Serial.println("Booting RX Ground Station (Async RTOS Mode)...");

  // Create a storage queue holding up to 50 packets buffering for internet
  telemetryQueue = xQueueCreate(50, sizeof(QueueItem));

  // Spawns the Internet Upload task natively on Core 0
  xTaskCreatePinnedToCore(
    firebaseUploadTask, 
    "FirebaseUpload", 
    8192,  // Stack memory
    NULL, 
    1,     // Priority
    NULL, 
    0      // Lock to Core 0!
  );

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  int state = radio.begin();
  if (state != RADIOLIB_ERR_NONE) {
    Serial.print("LoRa init failed: ");
    Serial.println(state);
    while (true) delay(10);
  }

  // === MUST MATCH STRICTLY WITH TRANSMITTER ===
  radio.setFrequency(868.0);
  radio.setBandwidth(500.0);   // Super-fast 500kHz throughput
  radio.setSpreadingFactor(7); // Shortest, fastest time-on-air
  radio.setCodingRate(4);
  radio.setPreambleLength(8);
  radio.setCRC(true);

  Serial.println("Ground Station Ready! Listening on Core 1 uninterrupted...");
}

void loop() {
  uint8_t rxBuf[sizeof(TelemetryPacket)];
  size_t rxLen = sizeof(TelemetryPacket);
  
  // Hangs here efficiently until LoRa module signals a complete packet
  int state = radio.receive(rxBuf, rxLen);

  if (state == RADIOLIB_ERR_NONE) {
    // Validate packet size strict rules
    if (rxLen != sizeof(TelemetryPacket)) {
      Serial.print("-> Ignored Packet: Expected ");
      Serial.print(sizeof(TelemetryPacket));
      Serial.println(" bytes.");
      return;
    }

    QueueItem newItem;
    memcpy(&newItem.pkt, rxBuf, sizeof(TelemetryPacket));
    newItem.timestamp = millis();
    newItem.rssi = radio.getRSSI();
    newItem.snr = radio.getSNR();

    // DOWN-SAMPLER: Your transmitter is running at an incredibly high 30Hz! 
    // WiFi and Firebase physically cannot upload 30 HTTP payloads per second.
    // We will perfectly sample it at 10 Frames-Per-Second to keep it real-time and stable.
    static unsigned long lastQueueTime = 0;
    if (millis() - lastQueueTime >= 100) { 
      if (xQueueSend(telemetryQueue, &newItem, 0) != errQUEUE_FULL) {
        lastQueueTime = millis();
      } else {
        // If WiFi lags momentarily, purge the oldest data in queue to stay real-time!
        QueueItem dummy;
        xQueueReceive(telemetryQueue, &dummy, 0); 
        xQueueSend(telemetryQueue, &newItem, 0);
        lastQueueTime = millis();
      }
    }

  } else if (state != RADIOLIB_ERR_RX_TIMEOUT) {
    Serial.print("LoRa RX Error: ");
    Serial.println(state);
  }
}