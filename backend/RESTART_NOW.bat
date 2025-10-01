@echo off
cls
echo ============================================
echo   RESTARTING SERVER WITH CLOUDINARY
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Stopping old server...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Copying environment file...
copy /Y env.development .env >nul

echo [3/3] Starting server...
echo.
echo Watch for this message:
echo   [OK] Cloudinary configured successfully
echo.

npm run dev

pause

