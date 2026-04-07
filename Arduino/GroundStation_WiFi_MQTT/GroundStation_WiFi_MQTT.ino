#include <SPI.h>
#include <RadioLib.h>

#define LED 2

// ===================== LORA =====================
SX1262 radio = new Module(5, 26, 14, 27);

void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);

  Serial.begin(115200);
  delay(500);

  SPI.begin(18, 19, 23);   // SCK, MISO, MOSI

  Serial.println("Booting RX Ground Station (Serial USB Mode)...");

  int state = radio.begin();
  if (state != RADIOLIB_ERR_NONE) {
    Serial.print("LoRa init failed: ");
    Serial.println(state);
    while (true) delay(10);
  }

  // === MUST MATCH STRICTLY WITH TRANSMITTER ===
  radio.setFrequency(868.0);
  radio.setBandwidth(125.0);
  radio.setSpreadingFactor(7); // Updated to 7 to match your new TX code!
  radio.setCodingRate(4);
  radio.setPreambleLength(8);
  radio.setCRC(true);

  Serial.println("Ground Station Ready! Send this terminal to the Serial Bridge.");
}

void loop() {
  // Receive LoRa Packet as an ASCII String
  String rxStr;
  int state = radio.receive(rxStr);

  if (state == RADIOLIB_ERR_NONE) {
    digitalWrite(LED, HIGH);

    // ===== Parse the comma-separated string =====
    int count = 0;
    double vals[15] = {0}; // Double precision array to protect GPS decimals
    int startIdx = 0;

    for (int i = 0; i <= rxStr.length(); i++) {
      if (rxStr.charAt(i) == ',' || i == rxStr.length()) {
        String token = rxStr.substring(startIdx, i);
        if (count < 15) {
          vals[count] = token.toDouble();
          count++;
        }
        startIdx = i + 1;
      }
    }

    // Ensure we got at least the 13 required variables from your TX
    if (count >= 13) {
      uint16_t pktCount = (uint16_t)vals[0];
      double lat = vals[1];
      double lng = vals[2];
      float gpsAlt = vals[3];

      float ax = vals[4];
      float ay = vals[5];
      float az = vals[6];

      float gx = vals[7]; // Raw gyro rates from Tx!
      float gy = vals[8];
      float gz = vals[9];

      float temperature = vals[10];
      float pressure = vals[11];
      float bmpAlt = vals[12];
      
      // Default to 0 for missing elements
      float thermoTemp = 0.0;
      float strain = 0.0;
      
      unsigned long timestamp = millis();
      float rssi = radio.getRSSI();
      float snr = radio.getSNR();

      // ===== Create Pristine JSON for Backend Serial Bridge =====
      String json = "{";
      json += "\"version\":\"1.0\",";
      json += "\"mission\":\"EKLAVYA_LIVE\",";
      json += "\"timestamp_ms\":" + String(timestamp) + ",";
      json += "\"packet\":{\"count\":" + String(pktCount) + "},";

      json += "\"gps\":{";
      json += "\"latitude\":" + String(lat, 6) + ",";
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
      json += "\"altitude_m\":" + String(bmpAlt, 2) + ",";
      json += "\"calibrated\":true},";

      json += "\"structure\":{";
      json += "\"thermocouple_c\":" + String(thermoTemp, 2) + ",";
      json += "\"strain_microstrain\":" + String(strain, 4) + "},";

      json += "\"radio\":{";
      json += "\"rssi_dbm\":" + String(rssi, 1) + ",";
      json += "\"snr_db\":" + String(snr, 1) + "}";
      json += "}";

      // ===== OUTPUT TO USB SERIAL BRIDGE =====
      // The serial-bridge.js script natively reads this JSON line instantly!
      Serial.println(json);

    } else {
       Serial.println("-> Ignored Packet: Too few CSV arguments received.");
    }

    delay(30);
    digitalWrite(LED, LOW);
  }
}
