@echo off
setlocal ENABLEDELAYEDEXPANSION

echo TNT Sales — Start (Postgres)
echo.
echo This will run backend (Spring Boot, postgres), PC frontend (Vite),
echo and Mobile frontend (Vite) in this same CMD window. Logs will be interleaved.
echo in this same CMD window. Logs will be interleaved.
echo.
echo Press Enter to start. Press Ctrl+C to stop.
pause >nul

REM Move to script directory (tnt_sales)
cd /d "%~dp0"

REM Start backend (postgres) in background, same window
echo Starting backend (profiles: postgres)...
start "tnt-sales-backend" /b cmd /c "cd /d backend && mvn spring-boot:run -Dspring-boot.run.profiles=postgres"

REM Give backend a moment
timeout /t 2 >nul

REM Start frontend (installs deps if missing)
echo Starting PC frontend (Vite dev server on http://localhost:5173)...
start "tnt-sales-frontend" /b cmd /c "cd /d frontend && if not exist node_modules (echo Installing dependencies... && npm install) && npm run dev"

REM Start mobile frontend on port 5174
echo Starting Mobile frontend (Vite dev server on http://localhost:5174)...
if exist "frontend_mb" (
  start "tnt-sales-frontend-mobile" /b cmd /c "cd /d frontend_mb && if not exist node_modules (echo Installing dependencies... && npm install) && npm run dev"
) else (
  echo [WARN] frontend_mb directory not found. Mobile frontend will not start.
)

echo.
echo Launched. Logs will appear below. Press Ctrl+C to stop.
echo.

REM Keep this window alive so you can see logs
:hold
timeout /t 86400 >nul
goto hold
