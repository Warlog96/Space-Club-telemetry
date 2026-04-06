@echo off
echo ========================================
echo        MOSQUITTO MQTT BROKER
echo ========================================
echo.
echo Starting Mosquitto using configuration from:
echo C:\Program Files\Mosquitto\mosquitto.conf
echo.
"C:\Program Files\Mosquitto\mosquitto.exe" -c "C:\Program Files\Mosquitto\mosquitto.conf" -v
echo.
echo Mosquitto stopped running.
pause
