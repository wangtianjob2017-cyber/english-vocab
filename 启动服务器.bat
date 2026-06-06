@echo off
title 单词朗读 - 本地服务器
echo.
echo   ======================================
echo     初中英语单词朗读 - 本地服务器
echo   ======================================
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do set IP=%%a
set IP=%IP: =%
echo   手机浏览器打开:
echo.
echo   http://%IP%:8888
echo.
echo   按 Ctrl+C 关闭服务器
echo   ======================================
echo.
python -m http.server 8888
pause
