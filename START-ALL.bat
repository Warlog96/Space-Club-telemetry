@echo off
echo ========================================
echo   TELEMETRY SYSTEM - COMPLETE STARTUP
echo ========================================
echo.
echo This script will:
echo  [1] Start Backend Server (connects to ESP32)
echo  [2] Start Admin Interface
echo  [3] Open Admin Interface in browser
echo.
echo Make sure:
echo  - Mosquitto is installed and in PATH
echo  - ESP32 is configured to connect to this MQTT broker
echo  - npm install has been run
echo.
echo Press any key to start all services...
pause >nul

cd /d "%~dp0"

echo.
echo ========================================
echo Starting Services...
echo ========================================
echo.


REM Start Backend Server
echo [1/3] Starting Backend Server...
start "Backend Server" cmd /k "cd server && node index.js"
timeout /t 3 /nobreak >nul

REM Start Serial Bridge
echo [2/3] Starting Serial Bridge USB Link...
start "Serial Bridge Gateway" cmd /k "cd server && node serial-bridge.js"
timeout /t 2 /nobreak >nul

REM Start Admin Interface
echo [3/3] Starting Admin Interface...
start "Admin Interface" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo All Services Started!
echo ========================================
echo.
echo Services running:
echo  - MQTT Broker: localhost:1883
echo  - Backend Server: localhost:3000 (WebSocket) / localhost:3001 (HTTP)
echo  - Admin Interface: http://localhost:5173
echo.
echo Login Credentials:
echo  Username: admin
echo  Password: admin123
echo.
echo ESP32 Connection:
echo  - Configure ESP32 to publish to: mqtt://YOUR_IP:1883
echo  - Topic: rocket/telemetry
echo  - Find your IP: ipconfig (look for IPv4 Address)
echo.
echo Opening Admin Interface in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo System Ready!
echo ========================================
echo.
echo To stop all services:
echo  - Close each service window (Mosquitto, Backend, Admin)
echo  - Or press Ctrl+C in each window
echo.
echo This window can be closed safely.
echo Services will continue running in their own windows.
echo.
pause
