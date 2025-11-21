@echo off
setlocal
cd /d %~dp0backend
echo Starting Spring Boot backend (profile: postgres)...
call mvn spring-boot:run -Dspring-boot.run.profiles=postgres
endlocal

