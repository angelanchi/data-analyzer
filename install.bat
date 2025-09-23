@echo off
REM ========================================
REM Data Analyzer - Windows 安裝腳本
REM 作者: An9
REM ========================================

echo.
echo ========================================
echo Data Analyzer 安裝程式
echo ========================================
echo.

REM 檢查 Node.js
echo [1/6] 檢查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] 錯誤: 未偵測到 Node.js
    echo.
    echo 請先安裝 Node.js 18.x LTS:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js 已安裝: %NODE_VERSION%

REM 檢查 npm
echo [2/6] 檢查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] 錯誤: 未偵測到 npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm 已安裝: %NPM_VERSION%

REM 清理舊的安裝
echo [3/6] 清理舊的安裝 (如果存在)...
if exist node_modules rmdir /s /q node_modules >nul 2>&1
if exist frontend\node_modules rmdir /s /q frontend\node_modules >nul 2>&1
if exist backend\node_modules rmdir /s /q backend\node_modules >nul 2>&1
echo [OK] 清理完成

REM 安裝依賴
echo [4/6] 安裝專案依賴 (這可能需要幾分鐘)...
echo.
call npm run install:all
if %errorlevel% neq 0 (
    echo.
    echo [X] 錯誤: 依賴安裝失敗
    echo 請檢查網路連線後重試
    pause
    exit /b 1
)
echo.
echo [OK] 依賴安裝完成

REM 創建必要目錄
echo [5/6] 創建必要目錄...
if not exist backend\data mkdir backend\data
if not exist backend\uploads mkdir backend\uploads
if not exist backend\exports mkdir backend\exports
if not exist backend\logs mkdir backend\logs
echo [OK] 目錄創建完成

REM 配置環境變數
echo [6/6] 配置環境變數...
if not exist backend\.env (
    if exist backend\.env.example (
        copy backend\.env.example backend\.env >nul
        echo [OK] 環境變數檔案已創建
    ) else (
        echo [!] 警告: backend\.env.example 不存在
    )
) else (
    echo [OK] 環境變數檔案已存在
)

echo.
echo ========================================
echo 安裝完成！
echo ========================================
echo.
echo 下一步:
echo 1. 執行 start.bat 啟動應用
echo 2. 開啟瀏覽器訪問 http://localhost:3000
echo 3. 參考 docs\USER_GUIDE.md 開始使用
echo.
echo ========================================
echo.
pause
