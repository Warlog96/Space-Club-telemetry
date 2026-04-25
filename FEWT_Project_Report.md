# Report Format for FEWT Project

---

## 1. Title Page

**Project/Experiment Title:** EKLAVYA – Real-Time Rocket Telemetry Monitoring System

**Name of Student(s):** Avaneesh (Team – Space Club)

**Roll Number / ID:** [Your Roll Number]

**Class / Semester:** [Your Class / Semester]

**College / Institution:** [Your College Name]

**Date:** April 2026

---

## 2. Introduction

EKLAVYA is a real-time rocket telemetry monitoring system built to capture, transmit, and display live sensor data from a model rocket during flight.
The rocket carries an Arduino Nano with GPS, IMU (MPU6050), barometer (BMP280), thermocouple, and strain gauge sensors, and transmits a compact binary packet wirelessly via LoRa radio to an ESP32-based ground station.
The ground station decodes the packet and pushes structured JSON data to Firebase Realtime Database over Wi-Fi, making it accessible globally.
A Node.js backend server listens to Firebase, processes each telemetry packet using a complementary filter to compute orientation (roll, pitch, yaw), and broadcasts the data in real-time over WebSocket to two React-based web dashboards.
This system replaces traditional serial-port ground stations with a fully cloud-connected, browser-accessible telemetry interface accessible from any device, anywhere in the world.

---

## 3. Objective

- To implement a low-cost, end-to-end wireless rocket telemetry pipeline using LoRa radio, ESP32, Firebase, and React for real-time data monitoring.
- To develop a dual-interface web dashboard (Admin with full control, Public with read-only access) featuring 16 live visualization components including 3D rocket orientation, GPS map tracking, and time-series sensor graphs.
- To analyze real-time accelerometer, gyroscope, GPS, barometric, and structural sensor data during flight and compute derived parameters such as roll, pitch, yaw, and vertical acceleration using a complementary filter algorithm.

---

## 4. Scope

- Can be used for model rocketry telemetry monitoring, high-altitude balloon tracking, and CubeSat ground-station applications.
- Helps in understanding practical integration of embedded systems (Arduino/ESP32), IoT protocols (LoRa, MQTT, WebSocket, Firebase), and modern web development (React 19, Three.js, Recharts, Leaflet).
- Limited to line-of-sight LoRa range (~2–5 km with SF12/868 MHz), Wi-Fi availability at the ground station, and GPS fix accuracy (~2.5 m CEP under open sky.

---

## 5. Screenshots / Figures

**Figure 1: System Architecture Block Diagram**
(Rocket TX → LoRa RF → ESP32 Ground Station → Firebase → Node.js Backend → Admin/Public Web Dashboard)

**Figure 2: Admin Dashboard – Live Telemetry View**
Real-time graphs for altitude, 3-axis acceleration, gyroscope, and 3D rocket orientation displayed in a sci-fi styled interface.

**Figure 3: GPS Map Tracking Panel**
Leaflet.js map showing the rocket's live GPS coordinates and flight path trail during the mission.

**Figure 4: Ground Station Hardware Setup**
ESP32 with SX1262 LoRa radio receiving binary telemetry packets from the rocket transmitter (Arduino Nano + SX1276) over 433/868 MHz.

---

## 6. Conclusion

The EKLAVYA project successfully demonstrated a fully functional, cloud-connected rocket telemetry system using affordable hardware and open-source software.
The project helped in understanding the integration of embedded sensors, LoRa wireless communication, Firebase cloud database, WebSocket real-time streaming, and React-based data visualization in a single end-to-end pipeline.
The implementation successfully delivered a live web dashboard accessible from any device worldwide, proving that professional-grade telemetry is achievable with student-level resources.

---

## 7. Future Enhancements

- Adding an Extended Kalman Filter (EKF) for more accurate GPS + IMU sensor fusion, enabling real-time velocity and 3D position estimation during flight.
- Integrating automatic parachute/recovery system deployment by detecting the rocket's apogee from BMP280 barometric altitude and triggering a GPIO signal for an ejection mechanism.
- Expanding the system to support two-way LoRa communication, allowing the ground station to send commands (abort, beacon activate) to the rocket during flight.

---
