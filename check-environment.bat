@echo off
REM ========================================
REM Data Analyzer - 環境檢查腳本
REM 作者: An9
REM ========================================

echo.
echo ========================================
echo Data Analyzer 環境檢查
echo ========================================
echo.

REM 檢查 Node.js
echo [1/5] 檢查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js 未安裝
    echo 請從 https://nodejs.org/ 下載並安裝
) else (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js 已安裝: %%i
)

REM 檢查 npm
echo [2/5] 檢查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm 未安裝
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm 已安裝: %%i
)

REM 檢查 Python (可選)
echo [3/5] 檢查 Python (可選)...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python 未安裝 (可選，用於進階分析)
) else (
    for /f "tokens=*" %%i in ('python --version') do echo [OK] Python 已安裝: %%i
)

REM 檢查專案依賴
echo [4/5] 檢查專案依賴...
if exist node_modules (
    echo [OK] 根目錄依賴已安裝
) else (
    echo [X] 根目錄依賴未安裝
    echo 請執行: install.bat
)

if exist frontend\node_modules (
    echo [OK] 前端依賴已安裝
) else (
    echo [X] 前端依賴未安裝
)

if exist backend\node_modules (
    echo [OK] 後端依賴已安裝
) else (
    echo [X] 後端依賴未安裝
)

REM 檢查環境變數
echo [5/5] 檢查後端環境變數...
if exist backend\.env (
    echo [OK] 後端環境變數檔案存在
) else (
    echo [X] 後端環境變數檔案不存在
    echo 請執行: install.bat
)

echo.
echo ========================================
echo 環境檢查完成
echo ========================================
echo.
pause
