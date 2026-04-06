#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <MPU6050.h>
#include <SPI.h>
#include <LoRa.h>

// ========== GPS ==========
TinyGPSPlus gps;
SoftwareSerial gpsSerial(4, 3); // RX, TX

// ========== LoRa Pins ==========
#define LORA_SS   10
#define LORA_RST  9
#define LORA_DIO0 2

// ========== MPU6050 ==========
MPU6050 mpu;

float ax_off = 0, ay_off = 0, az_off = 0;
float gx_off = 0, gy_off = 0, gz_off = 0;

// Packet counter
unsigned long pktNo = 0;

// ======================================================
//                   IMU CALIBRATION
// ======================================================
void calibrateIMU() {
  long ax=0, ay=0, az=0, gx=0, gy=0, gz=0;
  const int N = 150;

  Serial.println("Calibrating MPU6050... Keep steady");

  for (int i = 0; i < N; i++) {
    int16_t raX, raY, raZ, rgX, rgY, rgZ;
    mpu.getMotion6(&raX, &raY, &raZ, &rgX, &rgY, &rgZ);

    ax += raX;
    ay += raY;
    az += (raZ - 16384); // remove gravity

    gx += rgX;
    gy += rgY;
    gz += rgZ;

    delay(4);
  }

  ax_off = ax / N;
  ay_off = ay / N;
  az_off = az / N;

  gx_off = gx / N;
  gy_off = gy / N;
  gz_off = gz / N;

  Serial.println("MPU Calibration DONE");
}

// ======================================================
//                         SETUP
// ======================================================
void setup() {
  Serial.begin(9600);
  gpsSerial.begin(9600);

  Serial.println("GPS + MPU6050 + LoRa Setup Starting...");

  // MPU Init
  Wire.begin();
  mpu.initialize();
  delay(200);

  calibrateIMU();

  // LoRa Init
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed!");
    while (1);
  }

  LoRa.setTxPower(17);
  LoRa.setSpreadingFactor(10);        // Faster TX than SF12
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);

  Serial.println("System Ready!");
}

// ======================================================
//                         LOOP
// ======================================================
void loop() {

  // ---------------- GPS ----------------
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // When new GPS data arrives
  if (gps.location.isUpdated()) {

    float lat = gps.location.lat();
    float lng = gps.location.lng();
    float alt = gps.altitude.meters();

    // ---------------- MPU6050 ----------------
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    // Apply calibration
    float ax_c = (ax - ax_off) / 16384.0 * 9.81;
    float ay_c = (ay - ay_off) / 16384.0 * 9.81;
    float az_c = (az - az_off) / 16384.0 * 9.81;

    float gx_c = (gx - gx_off) / 131.0;
    float gy_c = (gy - gy_off) / 131.0;
    float gz_c = (gz - gz_off) / 131.0;

    pktNo++;

    // ---------------- PACKET ----------------
    // Light packet for Nano
    String packet = "PKT:";
    packet += pktNo;
    packet += ",";
    packet += String(lat, 6);
    packet += ",";
    packet += String(lng, 6);
    packet += ",";
    packet += String(alt, 2);
    packet += ",";
    packet += String(ax_c, 2);
    packet += ",";
    packet += String(ay_c, 2);
    packet += ",";
    packet += String(az_c, 2);
    packet += ",";
    packet += String(gx_c, 2);
    packet += ",";
    packet += String(gy_c, 2);
    packet += ",";
    packet += String(gz_c, 2);

    // ---------------- LoRa Send ----------------
    LoRa.beginPacket();
    LoRa.print(packet);
    LoRa.endPacket();

    // Debug print
    Serial.println(packet);
   
  }
}
