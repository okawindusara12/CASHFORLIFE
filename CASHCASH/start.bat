@echo off
title Cash Tracker Pro
echo =======================================================
echo          MEMBUKA CASH TRACKER PRO V2.0
echo =======================================================
echo Memeriksa sistem...

set AGY_NODE="C:\Users\ACER\AppData\Roaming\Antigravity\bin\agy-node.cmd"

if exist %AGY_NODE% (
    echo Menjalankan local server via Node...
    call %AGY_NODE% server.js
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Menjalankan local server via Node...
        node server.js
    ) else (
        echo Membuka aplikasi langsung di peramban browser...
        start index.html
    )
)
pause
