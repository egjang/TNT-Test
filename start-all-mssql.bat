@echo off
setlocal
rem Launch backend (mssql) and frontend in separate windows
start tnt-sales-backend-mssql cmd /k %~dp0start-backend-mssql.bat
timeout /t 2 >nul
start tnt-sales-frontend cmd /k %~dp0start-frontend.bat
echo Launched backend (mssql) and frontend in separate windows.
endlocal

