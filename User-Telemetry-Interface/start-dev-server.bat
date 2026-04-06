@echo off
echo Starting User Telemetry Interface...
echo.
cd /d "%~dp0"
call npm run dev
pause
