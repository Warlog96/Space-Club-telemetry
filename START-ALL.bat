@echo off
echo ========================================
echo   TELEMETRY SYSTEM - FIREBASE MODE
echo ========================================
echo.
echo This script will:
echo  [1] Start Admin Interface (Vite dev server)
echo  [2] Open Admin Interface in browser
echo.
echo Data source: Firebase Realtime Database
echo No backend server required.
echo.
echo Make sure:
echo  - npm install has been run in this folder
echo  - ESP32 Ground Station is powered and connected to WiFi
echo.
echo Press any key to start...
pause >nul

cd /d "%~dp0"

echo.
echo ========================================
echo Starting Admin Interface...
echo ========================================
echo.

REM Start Admin Interface (Vite)
echo [1/1] Starting Admin Interface...
start "Admin Interface" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo Admin Interface Started!
echo ========================================
echo.
echo Services running:
echo  - Admin Interface: http://localhost:5173
echo.
echo Telemetry is read directly from Firebase.
echo ESP32 Ground Station publishes to Firebase.
echo.
echo Opening Admin Interface in browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo System Ready!
echo ========================================
echo.
echo To stop: close the Admin Interface window or Ctrl+C
echo This window can be closed safely.
echo.
pause
