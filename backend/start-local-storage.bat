@echo off
echo ============================================
echo   Starting Server - LOCAL STORAGE MODE
echo ============================================
echo.
echo This will use LOCAL DISK STORAGE
echo (Not Cloudinary - for testing)
echo.

cd /d "%~dp0"

echo Creating uploads folder...
if not exist "uploads\users" mkdir uploads\users
echo.

echo Starting server...
npm run dev

pause

