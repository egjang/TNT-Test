@echo off
setlocal
rem Launch backend (postgres) and frontend in separate windows
start tnt-sales-backend-postgres cmd /k %~dp0start-backend-postgres.bat
timeout /t 2 >nul
start tnt-sales-frontend cmd /k %~dp0start-frontend.bat
echo Launched backend (postgres) and frontend in separate windows.
endlocal

