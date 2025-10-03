@echo off
echo ========================================
echo Starting Backend and Frontend Servers
echo ========================================

cd backend
start "Backend Server" cmd /k "npm start"
timeout /t 3 /nobreak > nul

cd ../frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Servers are starting in separate windows
echo ========================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo ========================================
pause
