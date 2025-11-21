@echo off
setlocal
cd /d %~dp0backend
echo Starting Spring Boot backend (profile: mssql)...
call mvn spring-boot:run -Dspring-boot.run.profiles=mssql
endlocal

