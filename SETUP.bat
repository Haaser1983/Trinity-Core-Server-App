@echo off
echo ========================================
echo TrinityCore Companion App - Quick Setup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Installing Backend Dependencies...
cd backend
if not exist node_modules (
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed!
        pause
        exit /b 1
    )
) else (
    echo Backend dependencies already installed
)

echo.
echo [2/4] Checking Database Configuration...
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo.
    echo !! IMPORTANT !!
    echo Please edit backend\.env with your MySQL credentials:
    echo   DB_USER=trinity
    echo   DB_PASS=trinity
    echo.
)

echo.
echo [3/4] Testing Database Connection...
call npm run test-db 2>nul
if errorlevel 1 (
    echo WARNING: Database connection test failed
    echo Please ensure MySQL is running and credentials in .env are correct
)

echo.
echo [4/4] Setup Complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Edit backend\.env if needed (MySQL credentials)
echo 2. Run: cd backend
echo 3. Run: npm run dev
echo 4. Open http://localhost:3001 in browser
echo.
echo OR open this folder in VSCode:
echo    code "D:\Trinity Core\Tools\CompApp"
echo.
pause
