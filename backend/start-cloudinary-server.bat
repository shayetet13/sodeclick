@echo off
echo ============================================
echo   Starting Server with Cloudinary Support
echo ============================================
echo.

REM Kill existing node processes
taskkill /F /IM node.exe >nul 2>&1

REM Wait for processes to close
timeout /t 2 /nobreak >nul

echo Starting backend server...
echo.
echo Check console for:
echo   - Cloudinary configured successfully
echo.

cd /d "%~dp0"
npm start

pause

