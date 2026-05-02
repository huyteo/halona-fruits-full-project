@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
cls
echo ========================================
echo  Chatbot Server - Port 8001
echo ========================================
python chatbot_server.py
pause