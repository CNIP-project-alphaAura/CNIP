@echo off
title NetTrack - Spring Boot Backend Runner
echo ========================================================
echo   NetTrack - University E-Learning Network Simulator
echo   Java Spring Boot + MySQL + NS-2 Backend
echo ========================================================

if "%JAVA_HOME%"=="" (
    if exist "C:\Users\dell\Downloads\jdk-25_windows-x64_bin\jdk-25.0.1" (
        set JAVA_HOME=C:\Users\dell\Downloads\jdk-25_windows-x64_bin\jdk-25.0.1
    )
)
set PATH=%JAVA_HOME%\bin;%~dp0tools\apache-maven-3.9.9\bin;%PATH%

echo [1/3] Using Java:
java -version
echo.

echo [2/3] Using Maven:
call mvn -version
echo.

echo [3/3] Starting Spring Boot REST API & Web Dashboard on port 8080...
echo Open your browser at: http://localhost:8080
echo.

call mvn spring-boot:run
pause
