# Data Analyzer - 環境配置要求

**作者**: An9
**版本**: 2.0
**最後更新**: 2025-01-22

---

## 📋 目錄

1. [系統要求](#系統要求)
2. [軟體依賴](#軟體依賴)
3. [Windows 環境配置](#windows-環境配置)
4. [Linux/macOS 環境配置](#linuxmacos-環境配置)
5. [環境驗證](#環境驗證)
6. [常見問題](#常見問題)

---

## 系統要求

### 最低硬體要求

| 組件 | 開發環境 | 生產環境 |
|------|---------|---------|
| **處理器** | 2 核心 @ 2.0 GHz | 4 核心 @ 2.5 GHz+ |
| **記憶體** | 4 GB RAM | 8 GB RAM+ |
| **硬碟空間** | 10 GB 可用空間 | 50 GB+ (取決於數據量) |
| **網路** | 寬頻連線 (1 Mbps+) | 高速連線 (10 Mbps+) |

### 支援的作業系統

✅ **Windows 10/11** (64-bit) - 主要開發環境
✅ **Ubuntu 20.04 LTS+**
✅ **macOS 11 (Big Sur)+**
✅ **CentOS 8+** / **Red Hat Enterprise Linux 8+**

---

## 軟體依賴

### 必需軟體 (Required)

#### 1. **Node.js**
- **版本要求**: 16.x 或更高版本
- **推薦版本**: 18.x LTS (Long Term Support)
- **用途**: 運行前端 (React) 和後端 (Express) 應用

**安裝方式**:

**Windows CMD:**
```cmd
REM 從官方網站下載安裝程式
REM https://nodejs.org/

REM 驗證安裝
node --version
npm --version
```

**Linux/macOS:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (使用 Homebrew)
brew install node@18

# 驗證安裝
node --version
npm --version
```

**預期輸出**:
```
v18.x.x
9.x.x (或更高版本)
```

#### 2. **npm (Node Package Manager)**
- **版本要求**: 8.x 或更高版本
- **說明**: 通常隨 Node.js 一起安裝
- **用途**: 管理 JavaScript 套件依賴

#### 3. **Git** (可選但強烈推薦)
- **版本要求**: 2.x+
- **用途**: 版本控制、程式碼管理

**Windows CMD:**
```cmd
REM 從官方網站下載安裝程式
REM https://git-scm.com/download/win

REM 驗證安裝
git --version
```

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# 驗證安裝
git --version
```

### 可選軟體 (Optional)

#### 4. **資料庫管理工具**
- **SQLite Browser**: 用於檢視開發環境資料庫
- **pgAdmin**: 用於管理生產環境 PostgreSQL 資料庫（如使用）

**Windows CMD:**
```cmd
REM 下載 DB Browser for SQLite
REM https://sqlitebrowser.org/

REM 下載 pgAdmin (如需要)
REM https://www.pgadmin.org/
```

**Linux:**
```bash
# Ubuntu/Debian - SQLite Browser
sudo apt install sqlitebrowser

# Ubuntu/Debian - pgAdmin (如需要)
sudo apt install pgadmin4
```

**macOS:**
```bash
# 使用 Homebrew
brew install --cask db-browser-for-sqlite
brew install --cask pgadmin4  # 如需要
```

---

## Windows 環境配置

### 步驟 1: 安裝 Node.js

1. 訪問 [https://nodejs.org/](https://nodejs.org/)
2. 下載 "LTS" (長期支援) 版本安裝程式
3. 執行安裝程式，選擇「安裝所有工具」選項
4. 完成安裝後重新啟動 Windows CMD

### 步驟 2: 驗證安裝

**Windows CMD:**
```cmd
REM 檢查 Node.js 版本
node --version

REM 檢查 npm 版本
npm --version

REM 檢查 npm 全域安裝路徑
npm config get prefix
```

### 步驟 3: 配置環境變數 (如果需要)

1. 右鍵點擊「本機」→ 選擇「屬性」
2. 點擊「進階系統設定」
3. 點擊「環境變數」
4. 確認 `PATH` 中包含 Node.js 安裝路徑:
   - `C:\Program Files\nodejs\`
   - `C:\Users\<您的使用者名稱>\AppData\Roaming\npm`

### 步驟 4: 克隆專案

**Windows CMD:**
```cmd
REM 導航到您想要安裝專案的目錄
cd C:\Users\<您的使用者名稱>\Desktop

REM 克隆專案（如果使用 Git）
git clone <repository-url> dataanalyzer
cd dataanalyzer

REM 或直接解壓縮專案壓縮檔到目錄
```

### 步驟 5: 安裝依賴

**Windows CMD:**
```cmd
REM 安裝所有依賴（前端 + 後端）
npm run install:all

REM 或分別安裝
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 步驟 6: 配置後端環境變數

**Windows CMD:**
```cmd
REM 複製環境變數範本
copy backend\.env.example backend\.env

REM 使用記事本編輯環境變數檔案
notepad backend\.env
```

確保以下設定正確:
```ini
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_PATH=./data/analyzer.db
UPLOAD_PATH=./uploads
EXPORT_PATH=./exports
```

### 步驟 7: 啟動應用

**Windows CMD:**
```cmd
REM 同時啟動前端和後端
npm run dev

REM 或在兩個 CMD 視窗分別啟動
REM CMD 視窗 1
npm run backend:dev

REM CMD 視窗 2
npm run frontend:dev
```

### 步驟 8: 驗證運行

開啟瀏覽器並訪問:
- **前端**: [http://localhost:3000](http://localhost:3000)
- **後端 API**: [http://localhost:3001/health](http://localhost:3001/health)

---

## Linux/macOS 環境配置

### 步驟 1: 安裝 Node.js

**Ubuntu/Debian:**
```bash
# 更新套件列表
sudo apt update

# 安裝 Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
node --version
npm --version
```

**macOS:**
```bash
# 使用 Homebrew 安裝
brew install node@18

# 驗證安裝
node --version
npm --version
```

### 步驟 2: 克隆專案

```bash
# 導航到目標目錄
cd ~/Desktop

# 克隆專案
git clone <repository-url> dataanalyzer
cd dataanalyzer
```

### 步驟 3: 安裝依賴

```bash
# 安裝所有依賴
npm run install:all
```

### 步驟 4: 配置環境變數

```bash
# 複製環境變數範本
cp backend/.env.example backend/.env

# 編輯環境變數
nano backend/.env
# 或
vi backend/.env
```

### 步驟 5: 啟動應用

```bash
# 同時啟動前端和後端
npm run dev

# 或在兩個終端機分別啟動
# 終端機 1
npm run backend:dev

# 終端機 2
npm run frontend:dev
```

---

## 環境驗證

### 自動驗證腳本

**Windows CMD** (check-environment.bat):
```cmd
@echo off
echo ========================================
echo Data Analyzer 環境檢查
echo ========================================
echo.

echo [1/5] 檢查 Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js 未安裝
    exit /b 1
) else (
    node --version
)

echo [2/5] 檢查 npm...
npm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm 未安裝
    exit /b 1
) else (
    npm --version
)

echo [3/5] 檢查 Python (可選)...
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python 未安裝 (可選，用於進階分析)
) else (
    python --version
)

echo [4/5] 檢查專案依賴...
if exist node_modules\ (
    echo [OK] 根目錄依賴已安裝
) else (
    echo [X] 根目錄依賴未安裝，請執行: npm install
)

echo [5/5] 檢查後端環境變數...
if exist backend\.env (
    echo [OK] 後端環境變數檔案存在
) else (
    echo [X] 後端環境變數檔案不存在，請複製: backend\.env.example
)

echo.
echo ========================================
echo 環境檢查完成
echo ========================================
```

**Linux/macOS** (check-environment.sh):
```bash
#!/bin/bash

echo "========================================"
echo "Data Analyzer 環境檢查"
echo "========================================"
echo ""

echo "[1/5] 檢查 Node.js..."
if command -v node &> /dev/null; then
    node --version
else
    echo "[X] Node.js 未安裝"
    exit 1
fi

echo "[2/5] 檢查 npm..."
if command -v npm &> /dev/null; then
    npm --version
else
    echo "[X] npm 未安裝"
    exit 1
fi

echo "[3/5] 檢查 Python (可選)..."
if command -v python3 &> /dev/null; then
    python3 --version
else
    echo "[!] Python 未安裝 (可選，用於進階分析)"
fi

echo "[4/5] 檢查專案依賴..."
if [ -d "node_modules" ]; then
    echo "[OK] 根目錄依賴已安裝"
else
    echo "[X] 根目錄依賴未安裝，請執行: npm install"
fi

echo "[5/5] 檢查後端環境變數..."
if [ -f "backend/.env" ]; then
    echo "[OK] 後端環境變數檔案存在"
else
    echo "[X] 後端環境變數檔案不存在，請複製: backend/.env.example"
fi

echo ""
echo "========================================"
echo "環境檢查完成"
echo "========================================"
```

### 手動驗證清單

- [ ] Node.js 版本 >= 16.x
- [ ] npm 版本 >= 8.x
- [ ] 專案依賴已安裝 (`node_modules/` 目錄存在)
- [ ] 後端環境變數已配置 (`backend/.env` 檔案存在)
- [ ] 後端資料庫目錄已創建 (`backend/data/` 目錄存在)
- [ ] 後端可以正常啟動 (訪問 http://localhost:3001/health 返回 OK)
- [ ] 前端可以正常啟動 (訪問 http://localhost:3000 顯示應用介面)
- [ ] Python 3.8+ 已安裝 (如果需要使用分析管線)
- [ ] Python 依賴已安裝 (`pip install -r requirements.txt`)

---

## 常見問題

### Q1: 安裝 npm 依賴時出現權限錯誤

**Windows:**
```cmd
REM 以管理員身分執行 CMD，然後重新安裝
npm cache clean --force
npm run install:all
```

**Linux/macOS:**
```bash
# 不要使用 sudo npm install，而是修正 npm 權限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# 然後重新安裝
npm run install:all
```

### Q2: 後端啟動失敗 (端口已被佔用)

**Windows CMD:**
```cmd
REM 查看佔用 3001 端口的進程
netstat -ano | findstr :3001

REM 結束該進程 (PID 為上一步查到的進程 ID)
taskkill //F //PID <PID>
```

**Linux/macOS:**
```bash
# 查看佔用 3001 端口的進程
lsof -i :3001

# 結束該進程
kill -9 <PID>
```

### Q3: 前端無法連接到後端 API

**檢查事項**:
1. 確認後端已正常啟動 (檢查 http://localhost:3001/health)
2. 確認 `backend/.env` 中的 `PORT=3001`
3. 確認 `frontend/package.json` 中的 `"proxy": "http://localhost:3001"`
4. 檢查防火牆設定是否阻擋本地連線

### Q4: Python 分析管線無法執行

**Windows CMD:**
```cmd
REM 確認 Python 已安裝
python --version

REM 確認依賴已安裝
pip list

REM 重新安裝依賴
pip install -r requirements.txt --upgrade
```

**Linux/macOS:**
```bash
# 確認 Python 3 已安裝
python3 --version

# 確認依賴已安裝
pip3 list

# 重新安裝依賴
pip3 install -r requirements.txt --upgrade
```

### Q5: TypeScript 編譯錯誤

```bash
# 清除快取並重新安裝
cd backend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Q6: 記憶體不足錯誤

**增加 Node.js 記憶體限制**:

**Windows CMD:**
```cmd
set NODE_OPTIONS=--max_old_space_size=4096
npm run dev
```

**Linux/macOS:**
```bash
export NODE_OPTIONS=--max_old_space_size=4096
npm run dev
```

---

## 總結

完成以上環境配置後，您應該能夠:

✅ 在本機開發環境運行 Data Analyzer
✅ 上傳和分析 CSV/Excel 數據檔案
✅ 生成數據清理報告和圖表
✅ 匯出分析結果
✅ 使用 Python 分析管線 (可選)

如需更多資訊，請參考:
- [安裝指南 (SETUP.md)](SETUP.md)
- [部署指南 (DEPLOYMENT.md)](DEPLOYMENT.md)
- [分發指南 (DISTRIBUTION_GUIDE.md)](DISTRIBUTION_GUIDE.md)
