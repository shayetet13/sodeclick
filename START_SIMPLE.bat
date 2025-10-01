@echo off
echo ========================================
echo   Starting Backend and Frontend Servers
echo ========================================
echo.

REM Kill existing node processes
echo Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm start"

timeout /t 3 >nul

echo.
echo Starting Frontend Server...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers are starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Network:  http://192.168.100.99:5173
echo.
echo Press any key to exit this window...
pause >nul

