@echo off
setlocal

echo Stopping existing services...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":13001 :LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":15173 :LISTENING"') do taskkill /F /PID %%a >nul 2>&1

timeout /t 1 /nobreak >nul

cd /d "%~dp0server"
start "OPS Server" cmd /k "node index.js"

cd /d "%~dp0frontend"
start "OPS Frontend" cmd /k "npm run dev"

echo Starting OPS Management System...
echo Backend: http://localhost:13001
echo Frontend: http://localhost:15173