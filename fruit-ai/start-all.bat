@echo off
echo ========================================
echo  HALONA FRUITS AI SERVERS
echo ========================================
echo.
echo Starting Image Recognition Server...
start cmd /k "cd image-recognition && start.bat"
timeout /t 3 /nobreak >nul
echo Starting Chatbot Server...
start cmd /k "cd chatbot && start.bat"
echo.
echo ======================================== 
echo  Both servers started successfully!
echo  - Image Recognition: http://localhost:8000
echo  - Chatbot: http://localhost:8001
echo ========================================
pause