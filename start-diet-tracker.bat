@echo off
setlocal

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-diet-tracker-clean-env.ps1" -OpenBrowser

echo.
echo App stopped.
pause
