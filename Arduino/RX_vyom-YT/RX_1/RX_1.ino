#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <PubSubClient.h>

// ================= PIN DEFINITIONS =================
#define NSS   5
#define RST   14
#define DIO0  26
#define LED_PIN 2   // D2 LED

// ================= WIFI CONFIGURATION =================
const char* ssid = "Aditya";          // Your WiFi/Hotspot Name
const char* password = "asmbhav@9";   // Your WiFi Password

// ================= MQTT CONFIGURATION =================
const char* mqtt_server = "192.168.43.86";  // UPDATE THIS IP TO YOUR PC'S IP!
const int   mqtt_port = 1883;
const char* mqtt_topic = "rocket/telemetry";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ================= STATE VARIABLES =================
unsigned long lastReconnectAttempt = 0;
unsigned long packetCount = 0;
bool wifiConnected = false;
bool mqttConnected = false;

// ================= WIFI CONNECTION =================
void connectWiFi() {
  Serial.println("\n[WiFi] Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n[WiFi] Connected!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n[WiFi] Connection FAILED!");
  }
}

// ================= MQTT CONNECTION =================
void connectMQTT() {
  if (!wifiConnected) return;
  
  Serial.print("[MQTT] Connecting to broker...");
  
  if (mqttClient.connect("ESP32_EKLAVYA_RX")) {
    mqttConnected = true;
    Serial.println("Connected!");
  } else {
    mqttConnected = false;
    Serial.print("FAILED! rc=");
    Serial.println(mqttClient.state());
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("\n========================================");
  Serial.println("ESP32 LoRa Receiver + MQTT Publisher");
  Serial.println("GPS + MPU6050 System");
  Serial.println("========================================\n");

  // ---------- LoRa Initialization ----------
  LoRa.setPins(NSS, RST, DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("[LoRa] Init FAILED!");
    while (1) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  }

  // ===== MATCH TRANSMITTER SETTINGS =====
  LoRa.setSpreadingFactor(10);      // SF10 (matches Tx)
  LoRa.setSignalBandwidth(125E3);   // 125 kHz (matches Tx)
  LoRa.setCodingRate4(5);           // CR 4/5 (matches Tx)

  Serial.println("[LoRa] Initialized successfully!");
  Serial.println("[LoRa] Frequency: 433 MHz");
  Serial.println("[LoRa] Spreading Factor: 10");
  Serial.println("[LoRa] Bandwidth: 125 kHz");
  Serial.println("[LoRa] Coding Rate: 4/5\n");

  // ---------- WiFi Connection ----------
  connectWiFi();

  // ---------- MQTT Setup ----------
  if (wifiConnected) {
    mqttClient.setServer(mqtt_server, mqtt_port);
    mqttClient.setBufferSize(1024);
    connectMQTT();
  }

  Serial.println("\n========================================");
  Serial.println("System Ready - Waiting for packets...");
  Serial.println("========================================\n");
}

// ================= PARSE PKT DATA AND CREATE JSON =================
String parseAndCreateJSON(String pktData, int rssi, float snr) {
  // Expected format from transmitter: PKT:packetNo,lat,lon,alt,ax,ay,az,gx,gy,gz
  // Example: PKT:1,28.123456,77.654321,100.50,0.12,-0.05,9.81,0.001,0.002,-0.001
  
  // Remove "PKT:" prefix if present
  String csvData = pktData;
  if (csvData.startsWith("PKT:")) {
    csvData = csvData.substring(4);
  }
  
  int fieldIndex = 0;
  String fields[10];  // Only 10 fields now: pktNo, lat, lon, alt, ax, ay, az, gx, gy, gz
  int lastComma = -1;
  
  // Parse CSV
  for (int i = 0; i < csvData.length(); i++) {
    if (csvData[i] == ',' || i == csvData.length() - 1) {
      if (i == csvData.length() - 1 && csvData[i] != ',') {
        fields[fieldIndex] = csvData.substring(lastComma + 1);
      } else {
        fields[fieldIndex] = csvData.substring(lastComma + 1, i);
      }
      lastComma = i;
      fieldIndex++;
      if (fieldIndex >= 10) break;
    }
  }
  
  // Build JSON payload matching backend expectations
  String json = "{";
  json += "\"version\":\"1.0\",";
  json += "\"mission\":\"EKLAVYA_LIVE\",";
  json += "\"timestamp_ms\":" + String(millis()) + ",";
  
  // Packet info
  json += "\"packet\":{\"count\":" + fields[0] + "},";
  
  // GPS data
  json += "\"gps\":{";
  json += "\"latitude\":" + fields[1] + ",";
  json += "\"longitude\":" + fields[2] + ",";
  json += "\"altitude_m\":" + fields[3] + ",";
  json += "\"valid\":true},";
  
  // IMU data (MPU6050)
  json += "\"imu\":{";
  json += "\"acceleration\":{";
  json += "\"x_mps2\":" + fields[4] + ",";
  json += "\"y_mps2\":" + fields[5] + ",";
  json += "\"z_mps2\":" + fields[6] + "},";
  json += "\"gyroscope\":{";
  json += "\"x_rps\":" + fields[7] + ",";
  json += "\"y_rps\":" + fields[8] + ",";
  json += "\"z_rps\":" + fields[9] + "},";
  json += "\"calibrated\":true},";
  
  // BMP280 - Use GPS altitude as fallback since we don't have BMP
  json += "\"bmp280\":{";
  json += "\"temperature_c\":25.0,";      // Default/placeholder
  json += "\"pressure_hpa\":1013.25,";    // Default/placeholder
  json += "\"altitude_m\":" + fields[3] + ",";  // Use GPS altitude
  json += "\"calibrated\":false},";
  
  // Structure sensors - Placeholder data
  json += "\"structure\":{";
  json += "\"thermocouple_c\":0.0,";
  json += "\"strain_microstrain\":0.0},";
  
  // Radio signal quality
  json += "\"radio\":{";
  json += "\"rssi_dbm\":" + String(rssi) + ",";
  json += "\"snr_db\":" + String(snr, 2) + "}";
  json += "}";
  
  return json;
}

// ================= MAIN LOOP =================
void loop() {
  // Maintain MQTT connection
  if (wifiConnected && mqttConnected) {
    if (!mqttClient.connected()) {
      unsigned long now = millis();
      if (now - lastReconnectAttempt > 5000) {
        lastReconnectAttempt = now;
        connectMQTT();
      }
    } else {
      mqttClient.loop();
    }
  }
  
  // Check for LoRa packets
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    digitalWrite(LED_PIN, HIGH);

    // Read received data
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }

    // Read RSSI & SNR
    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();

    // Print raw packet data
    Serial.println("\n--- PACKET RECEIVED ---");
    Serial.print("Raw Data: ");
    Serial.println(received);
    Serial.print("RSSI: ");
    Serial.print(rssi);
    Serial.print(" dBm | SNR: ");
    Serial.print(snr);
    Serial.println(" dB");

    // Create JSON payload
    String jsonPayload = parseAndCreateJSON(received, rssi, snr);
    
    Serial.println("\nJSON Payload:");
    Serial.println(jsonPayload);

    // Publish to MQTT
    if (wifiConnected && mqttConnected) {
      bool success = mqttClient.publish(mqtt_topic, jsonPayload.c_str(), false);
      
      if (success) {
        Serial.println("\n✓ MQTT Published Successfully!");
      } else {
        Serial.println("\n✗ MQTT Publish FAILED!");
      }
    } else {
      Serial.println("\n⚠ MQTT Not Connected - Skipping publish");
      if (!wifiConnected) Serial.println("  Reason: WiFi disconnected");
      if (!mqttConnected) Serial.println("  Reason: MQTT disconnected");
    }

    Serial.println("----------------------\n");

    packetCount++;
    delay(50);
    digitalWrite(LED_PIN, LOW);
  }
}
