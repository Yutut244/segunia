@echo off
chcp 65001 > nul

:: Asegurar que el directorio actual sea la carpeta del proyecto donde reside este script
cd /d "%~dp0"

echo ======================================================================
echo   SeguIA - Sistema Inteligente de Seguimiento Académico
echo   "La IA propone, los datos sustentan y el docente decide."
echo   Autores: Cristóbal Martínez & Jainer Salas
echo ======================================================================
echo.

set NODE_CMD=node

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
        set NODE_CMD="%APPDATA%\Antigravity\bin\agy-node.cmd"
    ) else (
        echo [ERROR] No se encontró Node.js en el sistema.
        pause
        exit /b 1
    )
)

echo Iniciando servidor SeguIA en http://localhost:3000 ...
echo Carpeta del proyecto: %CD%
echo Abriendo navegador web...
start http://localhost:3000

%NODE_CMD% "%~dp0server.js"
