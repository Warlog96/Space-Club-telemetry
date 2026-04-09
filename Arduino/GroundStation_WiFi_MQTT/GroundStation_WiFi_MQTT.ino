#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <RadioLib.h>

#define LED 2

// ===================== WIFI & FIREBASE =====================
const char* ssid = "Avaneesh";          // <-- CHANGE THIS to your Hotspot Name
const char* password = "123456789";  // <-- CHANGE THIS to your Hotspot Password
String FIREBASE_URL = "https://test-d0075-default-rtdb.firebaseio.com/telemetry/"; // Your Firebase Database

// ===================== BINARY PACKET STRUCT (must match TX exactly) =====================
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
  int16_t  thermoTemp;
  int16_t  strain;
};
#pragma pack(pop)

// ===================== LORA =====================
SX1262 radio = new Module(5, 26, 14, 27);

void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);

  Serial.begin(115200);
  delay(500);

  SPI.begin(18, 19, 23);   // SCK, MISO, MOSI

  Serial.println("Booting RX Ground Station (Firebase Mode)...");

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP Address: ");
  Serial.println(WiFi.localIP());

  int state = radio.begin();
  if (state != RADIOLIB_ERR_NONE) {
    Serial.print("LoRa init failed: ");
    Serial.println(state);
    while (true) delay(10);
  }

  // === MUST MATCH STRICTLY WITH TRANSMITTER ===
  radio.setFrequency(868.0);
  radio.setBandwidth(250.0);
  radio.setSpreadingFactor(12); // Updated to 7 to match your new TX code!
  radio.setCodingRate(4);
  radio.setPreambleLength(8);
  radio.setCRC(true);

  Serial.println("Ground Station Ready! Send this terminal to the Serial Bridge.");
}

void loop() {
  // ===== Receive LoRa Packet as RAW BINARY (matching TX struct) =====
  uint8_t rxBuf[sizeof(TelemetryPacket)];
  size_t rxLen = sizeof(TelemetryPacket);
  int state = radio.receive(rxBuf, rxLen);

  if (state == RADIOLIB_ERR_NONE) {
    digitalWrite(LED, HIGH);

    // Validate packet size
    if (rxLen != sizeof(TelemetryPacket)) {
      Serial.print("-> Ignored Packet: Wrong size. Got ");
      Serial.print(rxLen);
      Serial.print(" bytes, expected ");
      Serial.println(sizeof(TelemetryPacket));
      digitalWrite(LED, LOW);
      return;
    }

    // ===== Deserialize binary struct =====
    TelemetryPacket pkt;
    memcpy(&pkt, rxBuf, sizeof(TelemetryPacket));

    // Decode fields (reverse the scaling applied by TX)
    uint16_t pktCount   = pkt.packetCount;
    double   lat        = pkt.lat  / 1e6;
    double   lng        = pkt.lng  / 1e6;
    float    gpsAlt     = (float)pkt.gpsAlt;

    float ax = pkt.ax / 100.0f;
    float ay = pkt.ay / 100.0f;
    float az = pkt.az / 100.0f;

    float gx = pkt.gx / 100.0f;
    float gy = pkt.gy / 100.0f;
    float gz = pkt.gz / 100.0f;

    float temperature = pkt.temperature / 100.0f;
    float pressure    = (float)pkt.pressure;       // stored as integer hPa
    float bmpAlt      = (float)pkt.bmpAlt;

    float thermoTemp  = pkt.thermoTemp / 100.0f;
    float strain      = pkt.strain     / 10000.0f;

    unsigned long timestamp = millis();
    float rssi = radio.getRSSI();
    float snr  = radio.getSNR();

    // ===== Build JSON for Firebase =====
    String json = "{";
    json += "\"version\":\"1.0\",";
    json += "\"mission\":\"EKLAVYA_LIVE\",";
    json += "\"timestamp_ms\":" + String(timestamp) + ",";
    json += "\"packet\":{\"count\":" + String(pktCount) + "},";

    json += "\"gps\":{";
    json += "\"latitude\":"  + String(lat, 6) + ",";
    json += "\"longitude\":" + String(lng, 6) + ",";
    json += "\"altitude_m\":" + String(gpsAlt, 2) + ",";
    json += "\"valid\":true},";

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

    json += "\"structure\":{";
    json += "\"thermocouple_c\":"      + String(thermoTemp, 2) + ",";
    json += "\"strain_microstrain\":" + String(strain, 4) + "},";

    json += "\"radio\":{";
    json += "\"rssi_dbm\":" + String(rssi, 1) + ",";
    json += "\"snr_db\":"+   String(snr, 1) + "}";
    json += "}";

    // ===== Debug print =====
    Serial.println(json);

    // ===== Push to Firebase =====
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      String putUrl = FIREBASE_URL + String(timestamp) + ".json";
      http.begin(putUrl);
      http.addHeader("Content-Type", "application/json");
      int httpResponseCode = http.PUT(json);
      if (httpResponseCode > 0) {
        Serial.print("Firebase OK! Code: ");
        Serial.println(httpResponseCode);
      } else {
        Serial.print("Firebase Error: ");
        Serial.println(httpResponseCode);
      }
      http.end();
    } else {
      Serial.println("WiFi Disconnected, skipping Firebase push");
    }

    delay(30);
    digitalWrite(LED, LOW);

  } else if (state == RADIOLIB_ERR_RX_TIMEOUT) {
    // Normal — just waiting for a packet
  } else {
    Serial.print("LoRa RX Error: ");
    Serial.println(state);
  }
}
