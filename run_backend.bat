@echo off
title NetTrack - Spring Boot Backend Runner
echo ========================================================
echo   NetTrack - University E-Learning Network Simulator
echo   Java Spring Boot + MySQL + NS-2 Backend
echo ========================================================

set JAVA_HOME=C:\Users\dell\Downloads\jdk-25_windows-x64_bin\jdk-25.0.1
set PATH=%JAVA_HOME%\bin;%~dp0tools\apache-maven-3.9.9\bin;%PATH%

echo [1/3] Using Java version:
java -version
echo.

echo [2/3] Using Maven version:
call mvn -version
echo.

echo [3/3] Starting Spring Boot REST API Server on port 8080...
echo Database: MySQL localhost:3306/nettrack_db (with H2 auto-fallback)
echo REST Endpoints: http://localhost:8080/api/simulation/metrics
echo.

call mvn spring-boot:run
pause

