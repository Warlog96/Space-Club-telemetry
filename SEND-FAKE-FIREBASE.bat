@echo off
echo ============================================
echo   Firebase Fake Telemetry Sender
echo   Sends 1 realistic packet/second
echo   directly to Firebase (no server needed)
echo ============================================
echo.
echo Press Ctrl+C in the next window to stop.
echo.
cd /d "%~dp0"
start "Firebase Fake Data" cmd /k "node firebase-fake-data.js"
