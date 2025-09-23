# Data Analyzer - 打包分發指南

**作者**: An9
**版本**: 2.0
**最後更新**: 2025-01-22

---

## 📋 目錄

1. [概述](#概述)
2. [打包前準備](#打包前準備)
3. [Windows 打包方式](#windows-打包方式)
4. [Linux/macOS 打包方式](#linuxmacos-打包方式)
5. [使用者安裝指南](#使用者安裝指南)
6. [常見問題](#常見問題)

---

## 概述

本指南說明如何將 Data Analyzer 打包並分發給其他使用者使用。打包後的系統可以在相同作業系統上快速部署，無需重新下載依賴。

### 打包內容清單

✅ **必須包含**:
- 完整原始碼 (frontend/, backend/, shared/)
- 配置範本 (backend/.env.example)
- 安裝腳本 (install.bat / install.sh)
- 啟動腳本 (start.bat / start.sh)
- 說明文檔 (README.md, docs/)
- 範例數據 (data/)

❌ **不應包含**:
- node_modules/ 目錄 (太大，需重新安裝)
- backend/.env (包含敏感資訊)
- backend/data/*.db (使用者資料庫)
- backend/uploads/ (上傳的檔案)
- backend/exports/ (匯出的檔案)
- .git/ (版本控制資料)

---

## 打包前準備

### 步驟 1: 清理專案

**Windows CMD:**
```cmd
REM 刪除 node_modules 目錄
rmdir /s /q node_modules
rmdir /s /q frontend\node_modules
rmdir /s /q backend\node_modules

REM 刪除使用者資料
del /f /q backend\data\*.db
rmdir /s /q backend\uploads
rmdir /s /q backend\exports

REM 刪除環境變數檔案
del /f /q backend\.env
```

**Linux/macOS:**
```bash
# 刪除 node_modules 目錄
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules

# 刪除使用者資料
rm -f backend/data/*.db
rm -rf backend/uploads
rm -rf backend/exports

# 刪除環境變數檔案
rm -f backend/.env
```

### 步驟 2: 驗證檔案清單

確認以下檔案存在：
```
dataanalyzer/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   ├── .env.example
│   └── package.json
├── shared/
│   └── types/
├── data/
│   └── (範例 CSV 檔案)
├── docs/
│   ├── ENVIRONMENT_REQUIREMENTS.md
│   ├── SETUP.md
│   └── ...
├── install.bat (Windows 安裝腳本)
├── start.bat (Windows 啟動腳本)
├── install.sh (Linux/macOS 安裝腳本)
├── start.sh (Linux/macOS 啟動腳本)
├── check-environment.bat / .sh (環境檢查腳本)
├── package.json
└── README.md
```

---

## Windows 打包方式

### 方式 A: ZIP 壓縮檔 (推薦)

**步驟 1: 創建安裝腳本**

已在下一節創建 `install.bat` 和 `start.bat`

**步驟 2: 打包**

**Windows CMD:**
```cmd
REM 使用 PowerShell 創建 ZIP 檔案
powershell Compress-Archive -Path dataanalyzer -DestinationPath DataAnalyzer-v1.0-Windows.zip

REM 或使用 7-Zip (如果已安裝)
"C:\Program Files\7-Zip\7z.exe" a -tzip DataAnalyzer-v1.0-Windows.zip dataanalyzer\
```

### 方式 B: 自解壓縮執行檔

使用 7-Zip 創建自解壓縮檔案：

**Windows CMD:**
```cmd
"C:\Program Files\7-Zip\7z.exe" a -sfx DataAnalyzer-v1.0-Windows.exe dataanalyzer\
```

### 分發清單

打包完成後應包含：
- `DataAnalyzer-v1.0-Windows.zip` 或 `.exe`
- `INSTALL_WINDOWS.md` - 安裝說明文檔

---

## Linux/macOS 打包方式

### 方式 A: tar.gz 壓縮檔 (推薦)

**Linux/macOS:**
```bash
# 創建 tar.gz 壓縮檔
tar -czf DataAnalyzer-v1.0-Linux.tar.gz dataanalyzer/

# 或使用 zip 格式
zip -r DataAnalyzer-v1.0-Linux.zip dataanalyzer/
```

### 分發清單

- `DataAnalyzer-v1.0-Linux.tar.gz`
- `INSTALL_UNIX.md` - 安裝說明文檔

---

## 使用者安裝指南

### Windows 使用者安裝步驟

#### 步驟 1: 解壓縮檔案

1. 下載 `DataAnalyzer-v1.0-Windows.zip`
2. 右鍵點擊 → 選擇「解壓縮全部」
3. 解壓縮到任意位置 (例如: `C:\DataAnalyzer`)

#### 步驟 2: 執行環境檢查

**Windows CMD:**
```cmd
cd C:\DataAnalyzer
check-environment.bat
```

#### 步驟 3: 執行安裝腳本

**Windows CMD:**
```cmd
install.bat
```

安裝腳本會自動：
- 檢查 Node.js 是否已安裝
- 安裝所有 npm 依賴
- 創建必要的目錄
- 配置環境變數檔案

#### 步驟 4: 啟動應用

**Windows CMD:**
```cmd
start.bat
```

#### 步驟 5: 訪問應用

開啟瀏覽器並訪問:
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:3001/health

### Linux/macOS 使用者安裝步驟

#### 步驟 1: 解壓縮檔案

```bash
# 解壓縮 tar.gz 檔案
tar -xzf DataAnalyzer-v1.0-Linux.tar.gz
cd dataanalyzer

# 或解壓縮 zip 檔案
unzip DataAnalyzer-v1.0-Linux.zip
cd dataanalyzer
```

#### 步驟 2: 執行環境檢查

```bash
chmod +x check-environment.sh
./check-environment.sh
```

#### 步驟 3: 執行安裝腳本

```bash
chmod +x install.sh
./install.sh
```

#### 步驟 4: 啟動應用

```bash
chmod +x start.sh
./start.sh
```

#### 步驟 5: 訪問應用

開啟瀏覽器並訪問:
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:3001/health

---

## 使用者最低環境要求

確保使用者系統滿足以下要求：

### 硬體要求
- **處理器**: 2 核心 @ 2.0 GHz 或更高
- **記憶體**: 4 GB RAM (推薦 8 GB)
- **硬碟空間**: 10 GB 可用空間

### 軟體要求
- **必需**: Node.js 16+ (推薦 18.x LTS)
- **必需**: npm 8+

### 作業系統
- Windows 10/11 (64-bit)
- Ubuntu 20.04+ / Debian 10+
- macOS 11 (Big Sur) 或更高版本

---

## 安裝後驗證

### 自動驗證

安裝完成後，系統會自動執行健康檢查：

```
========================================
Data Analyzer 安裝完成
========================================

✓ Node.js 已安裝: v18.x.x
✓ npm 已安裝: 9.x.x
✓ 專案依賴已安裝
✓ 環境變數已配置
✓ 必要目錄已創建

下一步:
1. 執行 start.bat (Windows) 或 ./start.sh (Linux/macOS)
2. 開啟瀏覽器訪問 http://localhost:3000
3. 參考 docs/USER_GUIDE.md 開始使用

========================================
```

### 手動驗證

**驗證後端**:
```cmd
curl http://localhost:3001/health
```

預期輸出:
```json
{"status":"OK","timestamp":"2025-10-16T...","uptime":...}
```

**驗證前端**:
開啟瀏覽器訪問 http://localhost:3000，應該看到 Data Analyzer 主介面。

---

## 更新與維護

### 版本更新

當有新版本發布時，使用者可以：

**方式 1: 完整重新安裝**
1. 備份重要資料 (backend/data/, backend/uploads/)
2. 刪除舊版本目錄
3. 安裝新版本
4. 還原備份的資料

**方式 2: 增量更新 (進階)**
```bash
# 備份資料
cp -r backend/data backend/data.backup
cp -r backend/uploads backend/uploads.backup

# 拉取更新 (如果使用 Git)
git pull origin master

# 重新安裝依賴
npm run install:all

# 重啟應用
npm run dev
```

---

## 常見問題

### Q1: 使用者沒有安裝 Node.js

**解決方案**:
在 `INSTALL_WINDOWS.md` 或 `INSTALL_UNIX.md` 中提供 Node.js 下載連結：
- Windows: https://nodejs.org/ (下載 LTS 版本安裝程式)
- Linux: 使用套件管理器安裝 (`apt install nodejs npm`)
- macOS: 使用 Homebrew (`brew install node`)

### Q2: 安裝腳本執行失敗

**檢查清單**:
1. 確認 Node.js 和 npm 已正確安裝
2. 確認有網路連線 (需要下載 npm 套件)
3. 確認有足夠的硬碟空間 (至少 2-3 GB)
4. 檢查防火牆設定

### Q3: 啟動後無法訪問應用

**檢查步驟**:
1. 確認後端已啟動 (檢查 CMD/Terminal 輸出)
2. 確認端口 3000 和 3001 沒有被其他程式佔用
3. 檢查防火牆是否阻擋本地連線
4. 嘗試使用 http://127.0.0.1:3000 而不是 localhost

---

## 分發檢查清單

在分發前，請確認：

- [ ] 已清理所有 node_modules 目錄
- [ ] 已刪除 backend/.env (保留 .env.example)
- [ ] 已刪除使用者資料 (.db 檔案)
- [ ] 已刪除 .git 目錄 (如果不是 Git 分發)
- [ ] 已包含所有安裝腳本 (install.bat/.sh, start.bat/.sh)
- [ ] 已包含環境檢查腳本 (check-environment.bat/.sh)
- [ ] 已包含完整的文檔 (README.md, docs/)
- [ ] 已包含範例數據 (data/)
- [ ] 已測試安裝腳本在乾淨環境中可以執行
- [ ] 檔案大小合理 (應該 < 50 MB，不含 node_modules)

---

## 授權與版權

確保在分發時包含適當的授權資訊：

**MIT License 範例** (LICENSE 檔案):
```
MIT License

Copyright (c) 2025 An9

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 支援與回饋

使用者如遇問題，可以：
1. 查閱 `docs/` 目錄中的文檔
2. 檢查 [常見問題](#常見問題) 章節
3. 聯繫開發者 (提供聯繫方式)

---

## 總結

遵循本指南，您可以：
✅ 正確打包 Data Analyzer 系統
✅ 提供使用者友善的安裝體驗
✅ 確保系統在目標環境正常運行
✅ 處理常見安裝和部署問題

**祝您分發順利！**
