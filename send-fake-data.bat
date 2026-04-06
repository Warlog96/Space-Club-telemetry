@echo off
echo ========================================
echo   FAKE TELEMETRY DATA SENDER
echo ========================================
echo.
echo Sending simulated rocket telemetry to:
echo  - HTTP:  http://localhost:3001/api/test/telemetry
echo.
echo Make sure the backend server is running!
echo (Run START-ALL.bat first if needed)
echo.
echo Press Ctrl+C to stop sending data.
echo.
timeout /t 2 /nobreak >nul

cd /d "%~dp0"
node send-fake-data.js

echo.
echo [Done] Data sender stopped.
pause
