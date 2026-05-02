@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
cls
echo ========================================
echo  Image Recognition Server - Port 8000
echo ========================================
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
pause