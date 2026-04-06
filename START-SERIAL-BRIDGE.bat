@echo off
echo ========================================
echo        SERIAL TO MQTT BRIDGE
echo ========================================
echo.
echo Make sure your Mosquitto MQTT broker and Backend Server are running!
echo.
cd /d "%~dp0\server"

rem First, run it without arguments to show available ports
node serial-bridge.js

echo.
set /p COMPORT="Enter your COM Port (e.g. COM3, COM5) from above: "
set /p BAUDRATE="Enter Baud Rate (default 115200, press Enter to skip): "

if "%BAUDRATE%"=="" set BAUDRATE=115200

echo.
echo Starting Serial Bridge on %COMPORT% at %BAUDRATE% baud...
node serial-bridge.js %COMPORT% %BAUDRATE%

echo.
pause
