@echo off
cd /d "%~dp0"

echo ============================================
echo   SKC Monthly Profit Analysis - one-click start
echo ============================================

if not exist "node_modules" (
    echo [1/2] Dependencies not found, installing...
    call npm install
    if errorlevel 1 (
        echo Install failed. Please check Node.js environment.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Dependencies ready.
)

echo [2/2] Starting dev server, opening browser...

rem Open the app in default browser after a short delay (background helper)
start "" cmd /c "ping -n 4 127.0.0.1 >nul & start http://localhost:5173/skc-profit-analysis/"

echo Local URL: http://localhost:5173/skc-profit-analysis/
echo Close this window to stop the server.

call npm run dev

pause