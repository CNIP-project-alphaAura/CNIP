@echo off
if "%JAVA_HOME%"=="" (
    if exist "C:\Users\dell\Downloads\jdk-25_windows-x64_bin\jdk-25.0.1" (
        set JAVA_HOME=C:\Users\dell\Downloads\jdk-25_windows-x64_bin\jdk-25.0.1
    )
)
set PATH=%JAVA_HOME%\bin;%~dp0tools\apache-maven-3.9.9\bin;%PATH%
call "%~dp0tools\apache-maven-3.9.9\bin\mvn.cmd" %*
