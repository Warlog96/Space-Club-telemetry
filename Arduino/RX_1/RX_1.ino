#include <SPI.h>
#include <LoRa.h>

// ================= PIN DEFINITIONS =================
#define NSS   5
#define RST   14
#define DIO0  26
#define LED_PIN 2   // D2 LED

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("ESP32 LoRa Receiver");

  // ---------- LoRa Pins ----------
  LoRa.setPins(NSS, RST, DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed");
    while (1);
  }

  // ===== MATCH TRANSMITTER SETTINGS =====
  LoRa.setSpreadingFactor(10);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setTxPower(17);   // not required for RX but safe

  Serial.println("LoRa init successful");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    // LED ON when packet received
    digitalWrite(LED_PIN, HIGH);

    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }

    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();

    Serial.print("Received: ");
    Serial.println(received);

    Serial.print("RSSI: ");
    Serial.print(rssi);
    Serial.print(" dBm | SNR: ");
    Serial.println(snr);

    delay(50);
    digitalWrite(LED_PIN, LOW);
  }
}
