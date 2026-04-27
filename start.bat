@echo off

echo Stopping existing services...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":13001 :LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":15173 :LISTENING"') do taskkill /F /PID %%a >nul 2>&1

timeout /t 1 /nobreak >nul

set "ROOT=%~dp0"
start "OPS Management" cmd /k "pushd %ROOT%server && start /b node index.js && popd && pushd %ROOT%frontend && npm run dev"

echo Starting OPS Management System...
echo Backend: http://localhost:13001
echo Frontend: http://localhost:15173