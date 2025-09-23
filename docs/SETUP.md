# Data Analyzer 安裝和運行指南

**版本**: 2.0
**最後更新**: 2025-01-22

## 系統要求

- Node.js 16+
- npm 或 yarn
- Windows 11 (已針對Windows環境優化)

## 快速開始

### 1. 安裝依賴

**Windows CMD:**
```cmd
REM 安裝根目錄依賴
npm install

REM 安裝所有專案依賴（前端+後端）
npm run install:all
```

**Linux/macOS:**
```bash
# 安裝根目錄依賴
npm install

# 安裝所有專案依賴（前端+後端）
npm run install:all
```

### 2. 環境配置

**Windows CMD:**
```cmd
REM 複製後端環境變數文件
copy backend\.env.example backend\.env
```

**Linux/macOS:**
```bash
# 複製後端環境變數文件
cp backend/.env.example backend/.env
```

編輯 `backend\.env` 文件（Windows）或 `backend/.env` 文件（Linux/macOS），配置您的環境變數。

### 3. 啟動開發服務器

**Windows CMD (推薦):**
```cmd
REM 同時啟動前端和後端服務器
npm run dev
```

**或者在兩個CMD視窗分別啟動：**

CMD視窗 1 (後端):
```cmd
REM 啟動後端API服務器 (端口3001)
npm run backend:dev
```

CMD視窗 2 (前端):
```cmd
REM 啟動前端開發服務器 (端口3000)
npm run frontend:dev
```

**Linux/macOS:**
```bash
# 同時啟動前端和後端服務器
npm run dev

# 或在兩個終端機分別啟動
npm run backend:dev  # 終端機 1
npm run frontend:dev  # 終端機 2
```

### 4. 訪問應用

- 前端應用: http://localhost:3000
- 後端API: http://localhost:3001
- API健康檢查: http://localhost:3001/health

## 功能概覽

### ✅ 核心功能 (v2.0)

1. **數據上傳和解析**
   - 支援 CSV、Excel 格式文件上傳
   - 拖拽上傳界面
   - 實時數據預覽和統計
   - 數據格式自動檢測
   - 批次上傳支援

2. **數據清理引擎**
   - 缺失值處理（刪除或填充）
   - 異常值檢測和標記
   - 數據範圍過濾
   - 數據清理報告生成

3. **數據檢視模式** (2種)
   - **逐筆資料檢視**：保留所有原始記錄，支援主要/次要排序
   - **分組彙總檢視**：依選定欄位分組，計算統計值（mean, count, min, max, sum）

4. **指標分類系統**
   - 數值型指標（Numeric Metrics）：用於計算和彙總
   - 字串型指標（Categorical Metrics）：用於分組和標籤
   - 自動欄位類型檢測

5. **圖表類型與渲染**
   - **散點圖** (Plotly.js)：支援圖例分組
   - **線性圖** (Chart.js)：多組數據對比
   - **點狀圖** (Chart.js)：類別數據比較
   - 智能圖表類型推薦
   - 互動式圖表操作

6. **數據匯出功能**
   - **Excel 匯出**：多工作表結構（Data Overview + Flattened Data + Grouped Data + Statistics）
   - **CSV 匯出**：分段式結構，UTF-8 with BOM 編碼
   - **圖表匯出**：PNG/SVG 格式（前端處理）
   - 支援排序參數匯出

### 🔮 計劃中功能 (v2.1+)

7. **協作功能**
   - Socket.io 即時協作
   - 版本控制
   - 評論系統

8. **進階分析**
   - 統計檢定整合
   - 相關性分析
   - 趨勢預測

## 開發指南

### 目錄結構

```
dataanalyzer/
├── frontend/              # React前端應用
├── backend/              # Node.js後端API
├── shared/               # 共享類型定義
├── data/                 # 樣本數據文件
└── docs/                 # 項目文檔
```

### 開發工作流

1. **添加新功能**
   - 更新shared/types中的類型定義
   - 實現後端API端點
   - 創建前端組件
   - 更新路由和頁面

2. **測試**

   **Windows CMD:**
   ```cmd
   REM 前端測試
   cd frontend
   npm test
   cd ..

   REM 後端測試
   cd backend
   npm test
   cd ..
   ```

   **Linux/macOS:**
   ```bash
   # 前端測試
   cd frontend && npm test

   # 後端測試
   cd backend && npm test
   ```

3. **構建**

   **Windows CMD:**
   ```cmd
   REM 構建前端
   npm run frontend:build

   REM 構建後端
   npm run backend:build
   ```

   **Linux/macOS:**
   ```bash
   # 構建前端
   npm run frontend:build

   # 構建後端
   npm run backend:build
   ```

## 故障排除

### 常見問題

1. **端口衝突**
   - 前端默認端口3000，後端默認端口3001
   - 可通過環境變數修改端口設置

2. **依賴安裝失敗**

   **Windows CMD:**
   ```cmd
   REM 清除緩存重新安裝
   npm cache clean --force
   npm run install:all
   ```

   **Linux/macOS:**
   ```bash
   # 清除緩存重新安裝
   npm cache clean --force
   npm run install:all
   ```

3. **數據庫初始化失敗**
   - 確保backend/data目錄存在
   - 檢查SQLite權限設置

### 日誌查看

- 前端：瀏覽器開發者工具
- 後端：終端輸出或log文件

## 貢獻指南

1. Fork項目

2. 創建特性分支

   **Windows CMD:**
   ```cmd
   git checkout -b feature/AmazingFeature
   ```

   **Linux/macOS:**
   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. 提交變更

   **Windows CMD:**
   ```cmd
   git commit -m "Add some AmazingFeature"
   ```

   **Linux/macOS:**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```

4. 推送到分支

   **Windows CMD:**
   ```cmd
   git push origin feature/AmazingFeature
   ```

   **Linux/macOS:**
   ```bash
   git push origin feature/AmazingFeature
   ```

5. 創建Pull Request

## 授權

MIT License - 詳見 [LICENSE](../LICENSE) 文件