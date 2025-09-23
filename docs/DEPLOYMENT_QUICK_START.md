# Data Analyzer 部署快速指南

**版本**: 2.0
**最後更新**: 2025-01-12

> 本文檔提供在新電腦上部署 Data Analyzer 的完整指南

---

## 📋 目標電腦系統需求

### 必須預先安裝
- **Node.js**: 18.x LTS 或更高版本
  - 下載地址: https://nodejs.org/
  - 安裝時選擇 "Automatically install necessary tools"
  - 驗證安裝: `node --version` 和 `npm --version`

### 系統配置
- **作業系統**: Windows 10/11 (64-bit), Ubuntu 20.04+, 或 macOS 11+
- **處理器**: 2 核心 @ 2.0 GHz 或更高 (推薦 4 核心)
- **記憶體**: 最低 4GB RAM (推薦 8GB)
- **硬碟空間**: 至少 2GB 可用空間
- **網路**: 首次安裝時需要網路連線

### 瀏覽器支援
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🚀 快速部署流程

### Step 1: 解壓縮專案
```
1. 將 DataAnalyzer-vX.X.zip 解壓到任意目錄
   建議路徑: C:\Apps\dataanalyzer 或 ~/Applications/dataanalyzer

2. 確保路徑中不包含中文或特殊字元
```

### Step 2: 安裝依賴

**Windows:**
```cmd
雙擊執行 install.bat
```

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**安裝過程說明:**
- ⏱️ 預計耗時: 5-10 分鐘
- 📦 下載大小: 約 300-500 MB
- ✅ 完成提示: "安裝完成！"

### Step 3: 啟動應用

**Windows:**
```cmd
雙擊執行 start.bat
```

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

### Step 4: 訪問應用

應用啟動後會自動開啟瀏覽器，或手動訪問:
- **前端介面**: http://localhost:3000
- **後端 API**: http://localhost:3001

---

## 📁 專案目錄結構說明

```
dataanalyzer/
├── frontend/               # 前端應用 (React)
│   ├── src/                  # 源碼
│   ├── public/               # 靜態資源
│   └── package.json          # 前端依賴配置
│
├── backend/                # 後端 API (Node.js)
│   ├── src/                  # 源碼
│   ├── data/                 # 數據庫存儲 (運行時自動創建)
│   ├── uploads/              # 上傳文件 (運行時自動創建)
│   ├── exports/              # 導出文件 (運行時自動創建)
│   ├── logs/                 # 日誌文件 (運行時自動創建)
│   ├── .env.example          # 環境變數範本
│   └── package.json          # 後端依賴配置
│
├── shared/                 # 前後端共享代碼
│   └── types/                # TypeScript 類型定義
│
├── docs/                   # 完整文檔
│   ├── USER_GUIDE.md         # 使用者指南
│   ├── API_REFERENCE.md      # API 文檔
│   ├── ARCHITECTURE.md       # 架構說明
│   └── DEPLOYMENT.md         # 詳細部署指南
│
├── install.bat             # Windows 安裝腳本
├── start.bat               # Windows 啟動腳本
├── QUICK_START.txt         # 快速開始指南
└── README.md               # 專案說明
```

---

## ⚙️ 配置說明

### 環境變數配置 (backend/.env)

首次安裝時會從 `.env.example` 自動創建 `.env` 文件。

**預設配置:**
```env
PORT=3001                           # 後端服務端口
FRONTEND_URL=http://localhost:3000  # 前端地址（CORS設置）
DATABASE_PATH=./data/analyzer.db    # SQLite 數據庫路徑
```

**如需修改:**
1. 編輯 `backend/.env` 文件
2. 修改所需配置項
3. 重新啟動應用

**常見配置調整:**
- **端口衝突**: 修改 `PORT=3001` 為其他端口 (如 3002)
- **跨域設置**: 修改 `FRONTEND_URL` 匹配前端地址
- **文件大小限制**: 調整 `MAX_FILE_SIZE` (預設 50MB)

---

## 🔧 故障排除

### 問題 1: 無法啟動 - 端口被佔用

**錯誤訊息:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決方案:**
1. 找出佔用端口的程序:
   ```cmd
   netstat -ano | findstr :3000
   ```
2. 結束該程序，或修改 `.env` 中的端口配置

### 問題 2: install.bat 失敗

**可能原因:**
- Node.js 未正確安裝
- 網路連線問題
- 權限不足

**解決方案:**
1. 驗證 Node.js: `node --version` (應顯示版本號)
2. 以管理員身份運行 `install.bat`
3. 檢查網路連線，確保可訪問 npm 倉庫
4. 手動安裝: `npm run install:all`

### 問題 3: 前端無法連接後端

**錯誤訊息:**
```
Network Error
```

**解決方案:**
1. 確認後端已啟動 (檢查 http://localhost:3001/health)
2. 檢查防火牆設置，允許 3000 和 3001 端口
3. 驗證 `frontend/package.json` 中的 proxy 設置:
   ```json
   "proxy": "http://localhost:3001"
   ```

### 問題 4: 數據庫初始化失敗

**解決方案:**
1. 刪除 `backend/data/analyzer.db`
2. 重新啟動應用，會自動重新創建

### 問題 5: TypeScript 編譯錯誤

**解決方案:**
1. 清理構建緩存:
   ```cmd
   cd backend
   npm run build
   ```
2. 重新安裝依賴:
   ```cmd
   rmdir /s /q node_modules
   npm install
   ```

---

## 🔐 安全注意事項

### 開發環境 vs 生產環境

**當前配置適用於開發/測試環境**

如需用於生產環境，請:
1. 修改 `backend/.env` 中的安全密鑰:
   ```env
   JWT_SECRET=請使用強隨機密鑰
   SESSION_SECRET=請使用強隨機密鑰
   ```
2. 將 `NODE_ENV` 設置為 `production`
3. 使用反向代理 (Nginx/Apache) 而非直接訪問
4. 啟用 HTTPS
5. 考慮使用 PostgreSQL 替代 SQLite

### 防火牆設置
- 開發環境: 允許本機訪問 3000 和 3001 端口
- 生產環境: 僅開放必要的公開端口，後端 API 應受反向代理保護

---

## 📊 性能優化建議

### 開發模式 (當前)
- 前端: `npm run dev` - 熱重載，調試友好
- 後端: `npm run dev` - 自動重啟，即時編譯

### 生產模式 (建議)
```cmd
REM 構建前端
cd frontend
npm run build

REM 構建後端
cd ../backend
npm run build

REM 使用 PM2 或類似工具管理進程
npm install -g pm2
pm2 start dist/index.js --name data-analyzer
```

---

## 📞 獲取幫助

### 文檔資源
- **使用者指南**: `docs/USER_GUIDE.md`
- **API 文檔**: `docs/API_REFERENCE.md`
- **架構文檔**: `docs/ARCHITECTURE.md`
- **完整部署指南**: `docs/DEPLOYMENT.md`

### 常用命令
```cmd
REM 檢查 Node.js 版本
node --version

REM 檢查 npm 版本
npm --version

REM 查看後端日誌
type backend\logs\*.log

REM 測試後端健康狀態
curl http://localhost:3001/health

REM 完全重新安裝
rmdir /s /q node_modules frontend\node_modules backend\node_modules
npm run install:all
```

---

## ✅ 部署檢查清單

部署前確認:
- [ ] 目標電腦已安裝 Node.js 18.x+
- [ ] 已下載並解壓專案
- [ ] 路徑中無中文或特殊字元
- [ ] 有足夠的硬碟空間 (至少 2GB)
- [ ] 網路連線正常

安裝後驗證:
- [ ] 執行 `install.bat` 成功，無錯誤
- [ ] 執行 `start.bat` 後兩個服務都啟動
- [ ] 可訪問 http://localhost:3000
- [ ] 可訪問 http://localhost:3001/health
- [ ] 可以上傳測試文件
- [ ] 可以生成和導出圖表

---

## 🎉 部署成功！

如果以上步驟都順利完成，恭喜您已成功部署 Data Analyzer！

**開始使用:**
1. 訪問 http://localhost:3000
2. 註冊新帳號或使用測試帳號
3. 上傳數據文件開始分析
4. 參考 `docs/USER_GUIDE.md` 了解完整功能

**享受數據分析之旅！** 🚀
