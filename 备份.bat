@echo off
title 单词全能王 - 自动备份
echo.
echo   ═══════════════════════════════════
echo     初中英语单词全能王 - 自动备份
echo   ═══════════════════════════════════
echo.
cd /d "%~dp0"

:: Set backup folder with date
set BACKUP_DIR=backups\%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%" 2>nul

:: Backup critical files
echo   正在备份核心文件...
copy /Y index.html "%BACKUP_DIR%\" >nul
copy /Y data.js "%BACKUP_DIR%\" >nul
copy /Y syllables.js "%BACKUP_DIR%\" >nul
copy /Y 初中英语单词早读.html "%BACKUP_DIR%\" >nul
copy /Y generate_audio.py "%BACKUP_DIR%\" >nul
copy /Y sw.js.disabled "%BACKUP_DIR%\" >nul
copy /Y manifest.json "%BACKUP_DIR%\" >nul

:: Git snapshot
echo   正在创建 Git 快照...
git add index.html data.js syllables.js 初中英语单词早读.html generate_audio.py manifest.json sw.js.disabled 2>nul
git commit -m "自动备份 %date% %time%" 2>nul

echo.
echo   ✅ 备份完成！
echo   备份位置: %BACKUP_DIR%
echo   Git 仓库已同步
echo.
pause
