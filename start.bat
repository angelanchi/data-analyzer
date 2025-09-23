@echo off
REM ========================================
REM Data Analyzer - Windows 啟動腳本
REM 作者: An9
REM ========================================

echo.
echo ========================================
echo Data Analyzer 啟動程式
echo ========================================
echo.

REM 檢查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] 錯誤: 未偵測到 Node.js
    echo 請先執行 install.bat 進行安裝
    pause
    exit /b 1
)

REM 檢查依賴是否已安裝
if not exist node_modules (
    echo [X] 錯誤: 專案依賴未安裝
    echo 請先執行 install.bat 進行安裝
    pause
    exit /b 1
)

REM 檢查環境變數檔案
if not exist backend\.env (
    echo [!] 警告: backend\.env 不存在
    echo 正在從範本創建...
    copy backend\.env.example backend\.env >nul
)

echo [OK] 環境檢查完成
echo.
echo 正在啟動 Data Analyzer...
echo.
echo 前端: http://localhost:3000
echo 後端: http://localhost:3001
echo.
echo 按 Ctrl+C 停止服務器
echo.
echo ========================================
echo.

REM 啟動應用
call npm run dev
