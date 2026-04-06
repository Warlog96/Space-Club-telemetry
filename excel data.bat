@echo off
cd /d "%~dp0"
echo ===========================================
echo      Admin Telemetry - Excel Replay
echo ===========================================
echo.
echo [1/2] Parsing Excel file (YT.xlsx)...
python read_excel.py
if %errorlevel% neq 0 (
    echo Error: Failed to read Excel file.
    pause
    exit /b %errorlevel%
)
echo.
echo [2/2] Sending telemetry stream to http://localhost:3001...
node simulate_excel.cjs
pause
