# Data Analyzer — Test-Data Analysis Web App

Side project, 2025. Not actively maintained.

## Starting point

The idea came from analysing batch test data for electronic parts. Each comparison
repeated the same spreadsheet steps: merge files, line up columns, remove outliers,
group, chart, export. I wanted to see whether those steps could become one fixed
workflow in a web app.

## What I noticed

- Files from different instruments name the same field differently (`Point_ID`,
  `Node_ID`, `Unit_Code` …), so a fixed schema does not work. The ID column has to be
  configurable or detected.
- Some metrics are text (PASS / FAIL / WARN), not numbers, and need their own handling.
- Some questions need the raw rows, others a grouped summary, so both views are needed.

## Tools I built

- A five-step workflow: upload → clean → format → chart → export.
- Configurable unique-ID column with auto-detection.
- Cleaning: missing-value handling, IQR / Z-score outlier detection, range filters,
  before/after preview.
- Row-level view (multi-key sort) and grouped summary (mean / count / min / max / sum).
- Chart suggestions based on column types; PNG / SVG chart export; multi-sheet Excel export.
- `generate_test_files.py` — creates three synthetic datasets with different column names
  to test the ID detection. All data in `data/` is synthetic.

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript, Plotly.js, Chart.js |
| Backend | Node.js, Express, TypeScript |
| Tooling | ESLint, Prettier, Husky, commitlint |

```bash
npm run install:all
npm run dev
```

Scoping notes: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_FLOW_GUIDE.md`.

---

# Data Analyzer - 電子測試數據分析平台

一個專為電子製造業設計的現代化 Web 數據分析平台，提供完整的數據處理工作流程，從上傳、清理、多維度檢視、可視化到結果匯出。

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ 核心特色

### 🎯 專業數據分析
- **5步驟分析工作流程**: 上傳 → 清理 → 數據格式設置 → 圖表配置與預覽 → 匯出
- **2種數據檢視模式**: 逐筆資料檢視（支援主要/次要排序）、分組彙總檢視
- **3種專業圖表**: 散點圖 (Plotly.js)、線性圖 (Chart.js)、點狀圖 (Chart.js)
- **智能推薦系統**: 根據資料特性自動推薦適用圖表類型
- **數值/字串指標分類**: 自動區分數值型與字串型指標，提供精準的分析選項

### 🔧 靈活配置功能
- **可配置唯一識別碼** ⭐ NEW:
  - 支援自訂任何欄位作為唯一識別碼（不限於 Point_ID）
  - 自動偵測模式（Point_ID/PointId/point_id）
  - 自動生成 ID 並支援自訂格式
  - 完全向後相容

### 🧹 強大數據清理
- **缺失值處理**: 刪除/插值/填充預設值
- **異常值檢測**: IQR 方法 / Z-Score 方法
- **數值範圍過濾**: 自訂最小/最大值
- **即時預覽**: 清理前後數據對比

### 📊 多維度資料檢視
- **逐筆資料檢視**: 保留所有原始記錄，支援主要/次要排序，適合詳細分析
- **分組彙總檢視**: 依選定欄位聚合，產生統計摘要（mean/count/min/max/sum）

### 📁 多格式匯出
- **數據匯出**: Excel (多工作表結構：Data Overview + 逐筆數據 + 分組彙總 + 統計報告) / CSV (UTF-8 with BOM)
- **圖表匯出**: PNG (高解析度) / SVG (向量圖，僅 Plotly 圖表)
- **完整數據結構**: 一次匯出包含資料總覽、詳細數據與統計資訊，相容 Minitab/MATLAB

### 👥 協作功能（規劃中）
- 即時多人協作 (Socket.io)
- 專案分享和權限管理
- 版本控制和歷史記錄

---

## 🚀 快速開始

### 前置需求

#### 系統要求
- **作業系統**: Windows 10/11 (64-bit), Ubuntu 20.04+, macOS 11+
- **處理器**: 2 核心 @ 2.0 GHz 或更高 (推薦 4 核心 @ 2.5 GHz+)
- **記憶體**: 4 GB RAM (推薦 8 GB+)
- **硬碟空間**: 10 GB 可用空間

#### 必需軟體
- **Node.js**: 16.x 或更高版本（推薦 18.x LTS）
  - 下載地址: [https://nodejs.org/](https://nodejs.org/)
- **npm**: 8.x 或更高版本（通常隨 Node.js 安裝）
- **Git**: 2.x+ (可選但推薦)

#### 支援的瀏覽器
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

> **💡 詳細環境配置**: 請參閱 [環境要求文檔](docs/ENVIRONMENT_REQUIREMENTS.md)

### 安裝

#### 方式 1: 使用自動安裝腳本（Windows 推薦）

**Windows CMD:**
```cmd
REM 下載或解壓縮專案後，執行安裝腳本
install.bat
```

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

安裝腳本會自動完成:
- ✅ 檢查 Node.js 和 npm 版本
- ✅ 安裝所有專案依賴
- ✅ 創建必要的目錄
- ✅ 配置環境變數檔案

#### 方式 2: 手動安裝

1. **複製專案**

   **Windows CMD:**
   ```cmd
   git clone <repository-url>
   cd dataanalyzer
   ```

   **Linux/macOS:**
   ```bash
   git clone <repository-url>
   cd dataanalyzer
   ```

2. **安裝所有依賴**

   **Windows CMD:**
   ```cmd
   npm run install:all
   ```

   **Linux/macOS:**
   ```bash
   npm run install:all
   ```

### 運行

#### 方式 1: 使用啟動腳本（Windows 推薦）

**Windows CMD:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

#### 方式 2: 手動啟動

**Windows CMD:**
```cmd
npm run dev
```

**Linux/macOS:**
```bash
npm run dev
```

應用啟動後可訪問:
- 前端: http://localhost:3000
- 後端API: http://localhost:3001

#### 環境驗證

使用環境檢查腳本驗證配置:

**Windows CMD:**
```cmd
check-environment.bat
```

**Linux/macOS:**
```bash
chmod +x check-environment.sh
./check-environment.sh
```

#### 生產環境構建

**Windows CMD:**
```cmd
npm run frontend:build
npm run backend:build
```

**Linux/macOS:**
```bash
npm run frontend:build
npm run backend:build
```

---

## 📂 專案結構

```
dataanalyzer/
├── frontend/                 # React 前端應用
│   ├── src/
│   │   ├── components/          # 可重用組件
│   │   │   ├── DataUpload/          # 資料上傳
│   │   │   ├── DataCleaning/        # 資料清理
│   │   │   ├── DataAnalysis/        # 資料分析
│   │   │   │   └── UniqueIdSelector.tsx  # 識別碼配置 (NEW)
│   │   │   ├── Charts/              # 圖表組件
│   │   │   └── Export/              # 匯出功能
│   │   ├── pages/              # 頁面組件
│   │   ├── contexts/           # React Context (狀態管理)
│   │   ├── services/           # API 服務層
│   │   ├── utils/              # 工具函數
│   │   │   ├── dataViews.ts           # 資料檢視邏輯
│   │   │   └── chartRecommendations.ts # 圖表推薦
│   │   └── types/              # TypeScript 類型定義
│   └── public/             # 靜態資源
├── backend/                 # Node.js 後端API
│   ├── src/
│   │   ├── routes/             # API 路由
│   │   ├── controllers/        # 控制器
│   │   ├── services/           # 業務邏輯
│   │   │   ├── exportService.ts    # 匯出服務
│   │   │   └── dataCleaningService.ts  # 數據清理服務
│   │   ├── middleware/         # 中介軟體
│   │   ├── handlers/           # Socket.io 事件處理
│   │   └── utils/              # 工具函數（資料庫等）
│   ├── uploads/            # 上傳檔案暫存
│   └── exports/            # 匯出檔案暫存
├── shared/                  # 前後端共享代碼
│   └── types/                  # 共享類型定義
├── data/                    # 樣本數據檔案
└── docs/                    # 專案文檔
    ├── PRD.md                     # 產品需求文檔
    ├── ARCHITECTURE.md            # 系統架構文檔
    ├── USER_GUIDE.md              # 使用者指南
    ├── API_REFERENCE.md           # API 文檔
    ├── DEPLOYMENT.md              # 部署指南
    └── SETUP.md                   # 環境設定指南
```

---

## 📋 數據格式支援

系統支援電子測試數據，包含以下欄位（不強制所有欄位都存在）:

### 識別欄位
- **唯一識別碼** (可配置): `Point_ID`, `PointId`, `point_id` 或任何自訂欄位
- **來源檔案**: `Source_File` (系統自動添加)

### 位置資訊
- `Location_X`, `Location_Y`: 測試點座標

### 電子參數（數值型）
- `Voltage`: 電壓
- `Current`: 電流
- `Temperature`: 溫度
- `Resistance`: 電阻
- `Capacitance`: 電容
- `Power`: 功率
- `Frequency`: 頻率
- `Impedance`: 阻抗
- `Phase_Angle`: 相位角
- `Signal_Quality`: 訊號品質

### 測試資訊（分類型）
- `Test_Time`: 測試時間
- `Operator`: 操作員
- `Equipment_ID`: 設備ID
- `Batch_No`: 批次號
- `Test_Result`: 測試結果 (PASS/Fail/Warning)

---

## 🛠 技術棧

### 前端
- **框架**: React 18 + TypeScript 4.9+
- **UI 組件庫**: Material-UI 5
- **圖表引擎**: Chart.js 4.x + Plotly.js 2.x
- **路由**: React Router 6
- **HTTP 客戶端**: Axios
- **狀態管理**: React Context API

### 後端
- **運行環境**: Node.js 16+ + Express 4.x
- **語言**: TypeScript 4.9+
- **資料庫**: SQLite 3 (開發) / PostgreSQL (生產)
- **實時通訊**: Socket.io 4.x
- **檔案處理**: multer + papaparse + xlsx.js

### 數據分析
- **分析工具整合**: Minitab, MATLAB 相容格式匯出

---

## 📚 文檔

完整文檔位於 `docs/` 目錄:

### 核心文檔
- **[產品需求文檔 (PRD)](docs/PRD.md)**: 功能需求、使用場景
- **[系統架構文檔](docs/ARCHITECTURE.md)**: 技術架構、資料流程、設計決策
- **[使用者指南](docs/USER_GUIDE.md)**: 操作教學、常見問題
- **[API 文檔](docs/API_REFERENCE.md)**: REST API 端點說明

### 開發文檔
- **[前端開發指南](frontend/README.md)**: React 前端開發規範和最佳實踐
- **[後端開發指南](backend/README.md)**: Node.js 後端 API 開發指南
- **[資料流程指南](docs/DATA_FLOW_GUIDE.md)**: 數據流轉詳解、createDataViews 核心處理邏輯
- **[組件開發指南](docs/COMPONENT_GUIDE.md)**: React 組件架構、Props 定義、開發最佳實踐
- **[常見任務指南](docs/COMMON_TASKS.md)**: 新增組件/API、修改清理邏輯、調試技巧
- **[故障排查指南](docs/TROUBLESHOOTING.md)**: 常見問題診斷與解決方案
- **[貢獻指南](CONTRIBUTING.md)**: 代碼貢獻流程、代碼規範、PR 流程

### 部署與環境
- **[環境設定](docs/SETUP.md)**: 開發環境設定
- **[環境要求](docs/ENVIRONMENT_REQUIREMENTS.md)**: 詳細環境配置需求
- **[部署指南](docs/DEPLOYMENT.md)**: 生產環境部署步驟
- **[部署快速開始](docs/DEPLOYMENT_QUICK_START.md)**: 簡化的快速部署流程
- **[分發指南](docs/DISTRIBUTION_GUIDE.md)**: 打包與分發系統給其他使用者

### 項目維護
- **[文檔更新日誌](docs/DOCUMENTATION_UPDATE_LOG.md)**: 文檔變更歷史記錄

---

## 📦 打包與分發

### 將系統分發給其他使用者

如果您想要將 Data Analyzer 打包分發給其他使用者使用，請參閱 **[分發指南 (DISTRIBUTION_GUIDE.md)](docs/DISTRIBUTION_GUIDE.md)**。

#### 快速打包步驟

**Windows CMD:**
```cmd
REM 1. 清理專案（刪除 node_modules, .env, 使用者資料）
rmdir /s /q node_modules
rmdir /s /q frontend\node_modules
rmdir /s /q backend\node_modules
del /f /q backend\.env
del /f /q backend\data\*.db

REM 2. 打包成 ZIP
powershell Compress-Archive -Path dataanalyzer -DestinationPath DataAnalyzer-v1.0-Windows.zip
```

**Linux/macOS:**
```bash
# 1. 清理專案
rm -rf node_modules frontend/node_modules backend/node_modules
rm -f backend/.env backend/data/*.db

# 2. 打包成 tar.gz
tar -czf DataAnalyzer-v1.0-Linux.tar.gz dataanalyzer/
```

#### 使用者最低環境要求

分發給其他使用者時，確保他們的系統滿足:
- ✅ **Node.js 16+** (推薦 18.x LTS)
- ✅ **npm 8+**
- ✅ **4 GB RAM** (推薦 8 GB)
- ✅ **10 GB 硬碟空間**
- ✅ **Windows 10/11, Ubuntu 20.04+, 或 macOS 11+**

使用者安裝步驟:
1. 解壓縮檔案
2. 執行 `install.bat` (Windows) 或 `./install.sh` (Linux/macOS)
3. 執行 `start.bat` (Windows) 或 `./start.sh` (Linux/macOS)
4. 開啟瀏覽器訪問 http://localhost:3000

詳細說明請參考 [DISTRIBUTION_GUIDE.md](docs/DISTRIBUTION_GUIDE.md)。

---

## 🔍 使用場景

### 電子製造業
- FPC (柔性電路板) 批次測試數據分析
- 生產線品質控制
- 設備性能監控和趨勢分析

### 研發實驗室
- 實驗數據可視化
- 統計分析報告生成
- 數據預處理和清理

### 教育培訓
- 數據分析教學演示
- 統計學實習專案
- 可視化技能培養

---

## 🎯 核心功能演示

### 1. 可配置唯一識別碼 (NEW)

```typescript
// 使用者可選擇任何欄位作為唯一識別碼
interface UniqueIdConfig {
  fieldName: string;           // 欄位名稱 (例: 'Sample_ID', 'Test_ID')
  autoGenerate: boolean;       // 欄位不存在時是否自動生成
  generationPattern?: string;  // 生成格式 (例: '{source}_P{index}')
}

// 自動偵測模式（預設）
{ fieldName: '_auto', autoGenerate: true }

// 自訂欄位模式
{ fieldName: 'Sample_ID', autoGenerate: true, generationPattern: 'S{index}' }
```

### 2. 兩種資料檢視模式

```typescript
// 逐筆資料檢視 - 保留所有原始記錄，支援排序
flattenedData: [
  { Point_ID: 'P001', Source_File: 'Batch1', Voltage: 5.2, Batch_No: 'B001', ... },
  { Point_ID: 'P002', Source_File: 'Batch1', Voltage: 5.3, Batch_No: 'B001', ... },
  ...
]
// 可使用主要排序 (primarySort) 和次要排序 (secondarySort) 進行排序
// 例如: 主要排序 = Batch_No, 次要排序 = Operator

// 分組彙總檢視 - 依選定欄位聚合
groupedData: [
  { Batch_No: 'B001', Voltage_mean: 5.25, Voltage_count: 100, Voltage_min: 5.0, Voltage_max: 5.5, ... },
  { Batch_No: 'B002', Voltage_mean: 5.18, Voltage_count: 98, Voltage_min: 4.9, Voltage_max: 5.4, ... },
]
// 自動計算每個分組的 mean, count, min, max, sum
```

---

## 🤝 貢獻

我們歡迎所有形式的貢獻！無論是代碼、文檔、Bug 回報或功能建議。

請閱讀我們的 **[貢獻指南 (CONTRIBUTING.md)](CONTRIBUTING.md)** 了解完整的貢獻流程、代碼規範和最佳實踐。

### 快速開始

1. Fork 本專案並 clone 到本地
2. 創建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交變更：`git commit -m "feat: add some amazing feature"`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 開啟 Pull Request

詳細流程和規範請參閱 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📝 授權

本專案採用 MIT License - 詳見 [LICENSE](LICENSE) 檔案

---

## 📧 聯絡方式

有任何問題或建議，歡迎聯繫專案維護者。

---

**⭐ 如果這個專案對您有幫助，請給我們一個星標！**
