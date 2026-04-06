#include <SPI.h>
#include <RadioLib.h>
#include <WiFi.h>
#include <PubSubClient.h>

#define LED 2

// ===== WIFI =====
// Replace with your current WiFi Network details
const char* ssid = "Avaneesh";
const char* password = "123456789";

// ===== MQTT =====
// Ensure this is the correct IPv4 address of your PC running Mosquitto (check using 'ipconfig')
const char* mqtt_server = "10.43.149.185"; 
const int   mqtt_port = 1883;
const char* mqtt_topic = "rocket/telemetry";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===== PACKET STRUCT =====
#pragma pack(push, 1)
struct TelemetryPacket {
  uint16_t packetCount;

  int32_t lat;
  int32_t lng;
  int16_t gpsAlt;

  int16_t ax, ay, az;
  int16_t gx, gy, gz;

  int16_t temperature;
  uint16_t pressure;
  int16_t bmpAlt;

  int16_t thermoTemp;
  int16_t strain;
};
#pragma pack(pop)

TelemetryPacket rxPacket;

// SX1262 setup
SX1262 radio = new Module(5, 26, 14, 27);

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  if (mqttClient.connected()) return;
  
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT... ");
    // Generate a random client ID to prevent connection drops in case of duplication
    String clientId = "ESP32_GroundStation_" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected to Mosquitto broker!");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" -> retrying in 2 seconds");
      delay(2000);
    }
  }
}

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(115200);

  SPI.begin(18, 19, 23);

  Serial.print("Initializing Radio... ");
  int state = radio.begin();
  if (state == RADIOLIB_ERR_NONE) {
    Serial.println("Success!");
  } else {
    Serial.print("Failed, code ");
    Serial.println(state);
    while (true); // block forever
  }
  
  radio.setFrequency(868.0);
  radio.setBandwidth(500.0);
  radio.setSpreadingFactor(5);
  radio.setCodingRate(4);
  radio.setPreambleLength(8);
  radio.setCRC(true);

  connectWiFi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setBufferSize(1024); // Ensure enough space for the large JSON packet
  connectMQTT();

  Serial.println("Ground Station Ready! Listening for telemetry...");
}

void loop() {
  // This will block until a packet is actually received
  int state = radio.receive((uint8_t*)&rxPacket, sizeof(rxPacket));

  // The moment we receive a packet, we must ensure our connections (WiFi + MQTT) are still alive.
  // Because 'radio.receive' was blocking, the connection may have timed out if there was a long delay.
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  mqttClient.loop();

  // Process the packet if received properly
  if (state == RADIOLIB_ERR_NONE) {

    digitalWrite(LED, HIGH);

    // ===== Convert Values =====
    double lat = rxPacket.lat / 1e6;
    double lng = rxPacket.lng / 1e6;
    double gpsAlt = rxPacket.gpsAlt;

    float ax = rxPacket.ax / 100.0;
    float ay = rxPacket.ay / 100.0;
    float az = rxPacket.az / 100.0;

    float gx = rxPacket.gx / 100.0;
    float gy = rxPacket.gy / 100.0;
    float gz = rxPacket.gz / 100.0;

    float temperature = rxPacket.temperature / 100.0;
    float pressure = rxPacket.pressure;
    float bmpAlt = rxPacket.bmpAlt;

    float thermoTemp = rxPacket.thermoTemp / 100.0;
    float strain = rxPacket.strain / 10000.0;

    unsigned long now = millis();

    // ===== Create JSON =====
    String jsonPayload = "{";
    jsonPayload += "\"version\":\"1.0\",";
    jsonPayload += "\"mission\":\"EKLAVYA_TEST\",";
    jsonPayload += "\"timestamp_ms\":" + String(now) + ",";

    jsonPayload += "\"packet\":{\"count\":" + String(rxPacket.packetCount) + "},";

    jsonPayload += "\"gps\":{";
    jsonPayload += "\"latitude\":" + String(lat,6) + ",";
    jsonPayload += "\"longitude\":" + String(lng,6) + ",";
    jsonPayload += "\"altitude_m\":" + String(gpsAlt,2) + ",";
    jsonPayload += "\"valid\":true},";

    jsonPayload += "\"imu\":{";
    jsonPayload += "\"acceleration\":{";
    jsonPayload += "\"x_mps2\":" + String(ax,2) + ",";
    jsonPayload += "\"y_mps2\":" + String(ay,2) + ",";
    jsonPayload += "\"z_mps2\":" + String(az,2) + "},";
    jsonPayload += "\"gyroscope\":{";
    jsonPayload += "\"x_rps\":" + String(gx,3) + ",";
    jsonPayload += "\"y_rps\":" + String(gy,3) + ",";
    jsonPayload += "\"z_rps\":" + String(gz,3) + "},";
    jsonPayload += "\"calibrated\":true},";

    jsonPayload += "\"bmp280\":{";
    jsonPayload += "\"temperature_c\":" + String(temperature,2) + ",";
    jsonPayload += "\"pressure_hpa\":" + String(pressure,2) + ",";
    jsonPayload += "\"altitude_m\":" + String(bmpAlt,2) + ",";
    jsonPayload += "\"calibrated\":true},";

    jsonPayload += "\"structure\":{";
    jsonPayload += "\"thermocouple_c\":" + String(thermoTemp,2) + ",";
    jsonPayload += "\"strain_microstrain\":" + String(strain,1) + "},";

    jsonPayload += "\"radio\":{";
    jsonPayload += "\"rssi_dbm\":" + String(radio.getRSSI()) + ",";
    jsonPayload += "\"snr_db\":" + String(radio.getSNR()) + "}";

    jsonPayload += "}";

    // Publish to the local MQTT broker
    bool published = mqttClient.publish(mqtt_topic, jsonPayload.c_str(), false);

    Serial.println(jsonPayload);
    if(published) {
      Serial.println(" -> Successfully published to WiFi MQTT");
    } else {
      Serial.println(" -> FAILED to publish to MQTT");
    }

    delay(30);
    digitalWrite(LED, LOW);
  }
}
