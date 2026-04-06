//Tx- Final_string
//libraries
#include <SPI.h>
#include <RadioLib.h>
#include <TinyGPSPlus.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
//
#include <WiFi.h>
#include <PubSubClient.h>
//

// ===== WIFI =====
const char* ssid = "Aditya";          // Your WiFi/Hotspot Name
const char* password = "asmbhav@9";   // Your WiFi Password
// ===== MQTT =====
const char* mqtt_server = "172.22.46.176";  // <--- UPDATE THIS IP!
const int   mqtt_port = 1883;
const char* mqtt_topic = "rocket/telemetry";

WiFiClient espClient;
PubSubClient mqttClient(espClient);
//

//LoRa SX1262
SX1262 radio = new Module(5, 26, 14, 27);  // NSS, DIO1, NRST, BUSY

//GPS
TinyGPSPlus gps;
HardwareSerial GPS_Serial(2); // UART2

//MPU6050
Adafruit_MPU6050 mpu;
float ax_offset = 0, ay_offset = 0, az_offset = 0;
float gx_offset = 0, gy_offset = 0, gz_offset = 0;
bool imuCalibrated = false;

//BMP280
Adafruit_BMP280 bmp;
float temperature = 0, pressure = 0, altitude_raw = 0;
float base_pressure = 1013.25;  // fallback default
bool bmpCalibrated = false;

//State Lora+GPS
unsigned long packetCount = 0;
double lastLat = 0, lastLng = 0, lastAlt = 0;

//
// ===== THERMOCOUPLE + STRAIN GAUGE (UART DUMMY) =====
HardwareSerial AUX_Serial(1);   // UART1

float thermoTemp = 0.0;   // °C
float strainValue = 0.0;  // microstrain (με)
//


//COMMON FUNCTIONS
float computeVariance(float *arr, int n) {
  float mean = 0;
  for (int i = 0; i < n; i++) mean += arr[i];
  mean /= n;
  float var = 0;
  for (int i = 0; i < n; i++) var += (arr[i] - mean) * (arr[i] - mean);
  return var / n;
}

//IMU CALIBRATION
void calibrateIMU() {
  const int N = 200;
  double sum_ax = 0, sum_ay = 0, sum_az = 0;
  double sum_gx = 0, sum_gy = 0, sum_gz = 0;
  for (int i = 0; i < N; i++) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    sum_ax += a.acceleration.x;
    sum_ay += a.acceleration.y;
    sum_az += a.acceleration.z;
    sum_gx += g.gyro.x;
    sum_gy += g.gyro.y;
    sum_gz += g.gyro.z;
    delay(2);
  }
  ax_offset = sum_ax / N;
  ay_offset = sum_ay / N;
  az_offset = (sum_az / N) - 9.81;
  gx_offset = sum_gx / N;
  gy_offset = sum_gy / N;
  gz_offset = sum_gz / N;
}

//BMP QUICK CALIBRATION (ground-level only)
float quickCalibrateBMP() {
  float sum = 0;
  for (int i = 0; i < 20; i++) {
    sum += bmp.readPressure() / 100.0F;  // hPa
    delay(20);
  }
  return sum / 20.0;
}
//
void connectWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}
//

//
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect("ESP32_EKLAVYA_TX")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      delay(2000);
    }
  }
}
//

//setup
void setup() {
  Serial.begin(115200);
  delay(500);   // power settle (GPS + LoRa + IMU + BMP)

  //SPI (LoRa)
  SPI.begin(18, 19, 23);    // SCK, MISO, MOSI

  //GPS
  GPS_Serial.begin(9600, SERIAL_8N1, 16, 17);  // RX=16, TX=17

  //I2C (MPU + BMP)
  Wire.begin(21, 22);
  Wire.setClock(400000);

  //MPU6050 INIT
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found!");
    while (true);
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  delay(50);

  //IMU MOTION CHECK
  {
    const int N = 20;
    float gx_vals[N], gy_vals[N], gz_vals[N];
    float ax_vals[N], ay_vals[N], az_vals[N];

    for (int i = 0; i < N; i++) {
      sensors_event_t a, g, t;
      mpu.getEvent(&a, &g, &t);

      gx_vals[i] = g.gyro.x;
      gy_vals[i] = g.gyro.y;
      gz_vals[i] = g.gyro.z;

      ax_vals[i] = a.acceleration.x;
      ay_vals[i] = a.acceleration.y;
      az_vals[i] = a.acceleration.z;

      delay(2);
    }

    float gyro_var = computeVariance(gx_vals, N) +
                     computeVariance(gy_vals, N) +
                     computeVariance(gz_vals, N);

    float accel_var = computeVariance(ax_vals, N) +
                      computeVariance(ay_vals, N) +
                      computeVariance(az_vals, N);

    bool isStill = (gyro_var < 0.0005) && (accel_var < 0.5);

    if (!isStill) {
      Serial.println("IMU move → NO calibration");
      imuCalibrated = false;
    } else {
      calibrateIMU();
      imuCalibrated = true;
      Serial.println("IMU calibration OK");
    }
  }

  //BMP280 INIT
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 not found!");
    while (true);
  }

  bmp.setSampling(
    Adafruit_BMP280::MODE_NORMAL,
    Adafruit_BMP280::SAMPLING_X2,
    Adafruit_BMP280::SAMPLING_X4,
    Adafruit_BMP280::FILTER_X2,
    Adafruit_BMP280::STANDBY_MS_63
  );

  delay(100);  // small warm-up

  //BMP FAST MOTION CHECK
  {
    const int N = 20;
    float readings[N];

    for (int i = 0; i < N; i++) {
      readings[i] = bmp.readPressure() / 100.0F;  // hPa
      delay(10);
    }

    float variance = computeVariance(readings, N);

    if (variance < 0.5) {
      base_pressure = quickCalibrateBMP();
      bmpCalibrated = true;
      Serial.println("BMP calibrated on ground.");
    } else {
      Serial.println("BMP: Motion detected — skipping calibration.");
      bmpCalibrated = false;
    }

    Serial.print("Base pressure: ");
    Serial.println(base_pressure);
  }

  //LoRa
  int state = radio.begin();
  if (state != RADIOLIB_ERR_NONE) {
    Serial.print("LoRa init failed: ");
    Serial.println(state);
    while (true);
  }
  Serial.println("LoRa Ready");

  radio.setFrequency(868.0);
  radio.setBandwidth(400.0);
  radio.setSpreadingFactor(7);
  radio.setCodingRate(4);
  radio.setOutputPower(20);
  radio.setPreambleLength(8);
  radio.setCRC(true);

  Serial.println("Transmitter ready.\n");

//
// UART1 for Thermocouple + Strain Gauge (dummy for now)
AUX_Serial.begin(115200, SERIAL_8N1, 32, 33);  

//
  //
  connectWiFi();

mqttClient.setServer(mqtt_server, mqtt_port);
mqttClient.setBufferSize(1024); // Double ensure size
connectMQTT();
//
}
//
void readDummyThermoStrain() {
  // Simulate realistic rocket values
  thermoTemp = 25.0 + 15.0 * sin(millis() / 3000.0);   // 25–40 °C
  strainValue = 100.0 + 50.0 * sin(millis() / 1500.0); // 50–150 με
}
//
//Loop
void loop() {

  // ===== GPS READ =====
  while (GPS_Serial.available() > 0) {
    gps.encode(GPS_Serial.read());
  }

  if (gps.location.isUpdated() && gps.location.isValid()) {
    lastLat = gps.location.lat();
    lastLng = gps.location.lng();
    lastAlt = gps.altitude.isValid() ? gps.altitude.meters() : 0.0;
  }

  //IMU READ 
  sensors_event_t a, g, t;
  mpu.getEvent(&a, &g, &t);

  float ax = a.acceleration.x - ax_offset;
  float ay = a.acceleration.y - ay_offset;
  float az = a.acceleration.z - az_offset;

  float gx = g.gyro.x - gx_offset;
  float gy = g.gyro.y - gy_offset;
  float gz = g.gyro.z - gz_offset;

  // ===== BMP READ =====
  temperature   = bmp.readTemperature();
  pressure      = bmp.readPressure() / 100.0F;              // hPa
  altitude_raw  = bmp.readAltitude(base_pressure);          // meters

  //
  // ===== THERMOCOUPLE + STRAIN (DUMMY READ) =====
readDummyThermoStrain();
//

  //LoRa Packet format
  //Format:packet Number, lat,lng,alt_gps,ax,ay,az,gx,gy,gz, temp,pressure,alt_bmp

  
 String packet =
    String(packetCount) + "," +
    String(lastLat, 6) + "," +
    String(lastLng, 6) + "," +
    String(lastAlt, 2) + "," +
    String(ax, 2) + "," +
    String(ay, 2) + "," +
    String(az, 2) + "," +
    String(gx, 3) + "," +
    String(gy, 3) + "," +
    String(gz, 3) + "," +
    String(temperature, 2) + "," +
    String(pressure, 2) + "," +
    String(altitude_raw, 2) + "," +
    String(thermoTemp, 2) + "," +
    String(strainValue, 1);


  // Transmit
  int st = radio.transmit(packet);

  if (st == RADIOLIB_ERR_NONE) {
    Serial.print("TX $");
    Serial.print(packetCount);
    Serial.print(" : ");
    Serial.println(packet);
  } else {
    Serial.print("The lora is off and..");
    Serial.print("TX ERR #");
    Serial.print(packetCount);
    Serial.print(" : ");
    Serial.println(st);
  }

  // packetCount moved to end of loop

  //
  unsigned long now = millis();

String jsonPayload = "{";
jsonPayload += "\"version\":\"1.0\",";
jsonPayload += "\"mission\":\"EKLAVYA_TEST\",";
jsonPayload += "\"timestamp_ms\":" + String(now) + ",";

jsonPayload += "\"packet\":{\"count\":" + String(packetCount) + "},";

jsonPayload += "\"gps\":{";
jsonPayload += "\"latitude\":" + String(lastLat,6) + ",";
jsonPayload += "\"longitude\":" + String(lastLng,6) + ",";
jsonPayload += "\"altitude_m\":" + String(lastAlt,2) + ",";
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
jsonPayload += "\"altitude_m\":" + String(altitude_raw,2) + ",";
jsonPayload += "\"calibrated\":true},";

jsonPayload += "\"structure\":{";
jsonPayload += "\"thermocouple_c\":" + String(thermoTemp,2) + ",";
jsonPayload += "\"strain_microstrain\":" + String(strainValue,1) + "},";

jsonPayload += "\"radio\":{";
jsonPayload += "\"rssi_dbm\":-112,";
jsonPayload += "\"snr_db\":7.5}";
jsonPayload += "}";
//
//
mqttClient.loop();

bool success = mqttClient.publish(mqtt_topic, jsonPayload.c_str(), false);

if (success) {
  Serial.println("MQTT TX: OK");
} else {
  Serial.println("MQTT TX: FAILED (Too Big or Disconnected)");
}
Serial.println(jsonPayload);
Serial.println(jsonPayload);

packetCount++;
delay(100);   // 10 Hz for smoother animation
//
}