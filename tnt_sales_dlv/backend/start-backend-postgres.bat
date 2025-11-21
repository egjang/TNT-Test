@echo off
setlocal enabledelayedexpansion

REM Change to this script's directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Application settings
set JAR_NAME=backend-0.0.1-SNAPSHOT.jar
set SPRING_PROFILES_ACTIVE=postgres

REM Optional: tune JVM memory if not provided
if "%JAVA_OPTS%"=="" set JAVA_OPTS=-Xms512m -Xmx1024m

REM Validate JAR presence
if not exist "%JAR_NAME%" (
  echo [ERROR] %JAR_NAME% not found in %CD%
  exit /b 1
)

REM Validate Java presence
where java >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Java runtime not found in PATH. Install JDK 21 and retry.
  exit /b 1
)

echo Starting backend with profile=%SPRING_PROFILES_ACTIVE% ...
echo Using JAVA_OPTS=%JAVA_OPTS%

REM Log directory (override by setting LOG_DIR before running)
if "%LOG_DIR%"=="" set LOG_DIR=logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Timestamp (for future use if needed)
set TIMESTAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Run Spring Boot app (foreground). Outputs are appended to logs.
java %JAVA_OPTS% -Dspring.profiles.active=%SPRING_PROFILES_ACTIVE% -jar "%JAR_NAME%" 1>>"%LOG_DIR%\stdout.log" 2>>"%LOG_DIR%\stderr.log"

endlocal
