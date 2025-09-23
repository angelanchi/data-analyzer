# 系統架構文檔 (Architecture Document)
# Data Analyzer - 電子測試數據分析平台

**版本**: 2.0
**最後更新**: 2025-01-22
**狀態**: 已實作

---

## 1. 系統概覽

### 1.1 架構風格
Data Analyzer 採用 **前後端分離** 的 Web 應用架構，使用 React SPA (Single Page Application) 前端搭配 Node.js RESTful API 後端。

### 1.2 技術棧總覽

**前端 (Frontend)**
- React 18 - UI 框架
- TypeScript 4.9+ - 類型安全
- Material-UI 5 - UI 組件庫
- Chart.js 4.x - 圖表引擎
- Plotly.js 2.x - 進階圖表引擎
- React Router 6 - 路由管理
- Axios - HTTP 客戶端

**後端 (Backend)**
- Node.js 16+ - 運行環境
- Express 4.x - Web 框架
- TypeScript 4.9+ - 類型安全
- Socket.io 4.x - 實時通訊
- SQLite 3 - 開發資料庫
- PostgreSQL - 生產資料庫

**數據處理**
- papaparse - CSV 解析
- xlsx.js - Excel 處理
- Node.js 原生數據處理

---

## 2. 系統架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         瀏覽器 (Browser)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              React 前端應用 (SPA)                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │   Pages     │  │ Components  │  │   Services  │       │  │
│  │  │ (頁面層)    │  │ (組件層)    │  │ (服務層)    │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │         │                 │                 │              │  │
│  │         └─────────────────┴─────────────────┘              │  │
│  │                          │                                  │  │
│  │                   Context API / State                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                       HTTP/WebSocket                             │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    Node.js 後端伺服器                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Express API                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │   Routes    │  │ Controllers │  │  Services   │       │  │
│  │  │ (路由層)    │  │ (控制層)    │  │ (業務邏輯)  │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                │                    │
│                   ┌────────┴────────┐      │                    │
│                   │                 │      │                    │
│         ┌─────────▼──────┐  ┌──────▼──────▼────┐               │
│         │   Socket.io    │  │  Database Layer  │               │
│         │ (實時通訊)     │  │  (資料持久化)    │               │
│         └────────────────┘  └──────────────────┘               │
└───────────────────────────────────────────────────────────────┘
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                    ┌───────▼────────┐  ┌──────▼──────────┐
                    │  SQLite/PG     │  │  File System    │
                    │  (結構化資料)  │  │  (檔案暫存)    │
                    └────────────────┘  └─────────────────┘
```

---

## 3. 前端架構

### 3.1 目錄結構

```
frontend/
├── public/              # 靜態資源
├── src/
│   ├── components/      # 可重用組件
│   │   ├── DataUpload/      # 資料上傳組件
│   │   ├── DataCleaning/    # 資料清理組件
│   │   ├── DataAnalysis/    # 資料分析組件
│   │   │   ├── UniqueIdSelector.tsx       # 識別碼配置組件
│   │   │   ├── DataParameterSelector.tsx  # 參數選擇器（含排序選項）
│   │   │   └── DataViewPreview.tsx        # 資料預覽
│   │   ├── Charts/          # 圖表組件
│   │   ├── Export/          # 匯出組件
│   │   └── collaboration/   # 協作功能組件
│   ├── pages/           # 頁面組件
│   │   └── AnalysisPage.tsx    # 主分析頁面
│   ├── contexts/        # React Context (狀態管理)
│   │   ├── UserContext.tsx
│   │   └── CollaborationContext.tsx
│   ├── services/        # API 服務層
│   │   └── api.ts
│   ├── utils/           # 工具函數
│   │   ├── dataViews.ts            # 資料檢視邏輯
│   │   └── chartRecommendations.ts # 圖表推薦邏輯
│   ├── types/           # TypeScript 類型定義
│   │   └── index.ts     # 包含 UniqueIdConfig 等類型
│   └── App.tsx          # 應用主入口
└── package.json
```

### 3.2 核心模組說明

#### 3.2.1 資料處理流程 (dataViews.ts)

**關鍵函數**: `createDataViews()`

**功能**:
- 接收原始數據和配置選項（包含 `UniqueIdConfig`）
- 自動偵測或使用自訂唯一識別碼欄位
- 生成兩種資料檢視：扁平化（支援排序）、分組彙總
- 計算欄位類型（數值型、分類型）
- 產生統計聚合資訊
- 支援主要/次要排序功能

**輸入參數**:
```typescript
interface CreateDataViewsOptions {
  numericMetrics?: string[];      // 數值指標欄位選擇
  categoricalMetrics?: string[];  // 字串指標欄位選擇
  groupFields?: string[];         // 分組欄位選擇
  primarySort?: string | null;    // 主要排序欄位
  secondarySort?: string | null;  // 次要排序欄位
  uniqueIdConfig?: UniqueIdConfig; // 唯一識別碼配置
}
```

**輸出結構**:
```typescript
interface BatchViewResult {
  flattenedData: Array<Record<string, unknown>>;  // 扁平化資料（可排序）
  groupedData: Array<Record<string, unknown>>;    // 分組彙總資料
  metadata: BatchViewMetadata;  // 元資訊（包含欄位分類、統計等）
}
```

#### 3.2.2 唯一識別碼配置 (UniqueIdConfig)

**類型定義**:
```typescript
interface UniqueIdConfig {
  fieldName: string;           // 欄位名稱 ('_auto' = 自動偵測)
  autoGenerate: boolean;       // 是否自動生成
  generationPattern?: string;  // 生成格式 (例: '{source}_P{index}')
}
```

**處理邏輯**:
1. **自動偵測模式** (`fieldName === '_auto'`):
   - 依序搜尋: `Point_ID` → `PointId` → `point_id`
   - 若皆不存在且 `autoGenerate === true`，則自動生成

2. **自訂欄位模式**:
   - 使用使用者指定的欄位名稱
   - 若欄位不存在：
     - `autoGenerate === true`: 自動生成 ID
     - `autoGenerate === false`: 回退到自動偵測邏輯

3. **ID 生成規則**:
   - 預設格式: `{source}_P{index}`
   - 範例: `Batch1_P001`, `TestData_P042`

#### 3.2.3 圖表推薦系統 (chartRecommendations.ts)

**功能**:
- 分析資料特性（數值/分類欄位比例、記錄數）
- 根據資料檢視模式推薦適用圖表
- 支援自訂識別碼欄位 (`uniqueIdFieldName`)

**推薦規則**:
```typescript
// 扁平化檢視
if (categoricalColumns.includes(uniqueIdField)) {
  recommend('line', `Cross-point analysis: ${metricField} across ${uniqueIdField}`);
}

// 分組檢視
if (groupField && metricValues.length > 0) {
  recommend('bar', `Compare ${metric} across ${groupField}`);
}
```

---

## 4. 後端架構

### 4.1 目錄結構

```
backend/
├── src/
│   ├── index.ts            # 應用入口
│   ├── routes/             # 路由定義
│   │   ├── upload.ts           # 檔案上傳路由
│   │   ├── analysis.ts         # 分析路由
│   │   ├── export.ts           # 匯出路由
│   │   └── collaboration.ts    # 協作路由
│   ├── controllers/        # 控制器層
│   ├── services/           # 業務邏輯層
│   │   ├── exportService.ts             # 資料匯出服務
│   │   ├── dataProcessingService.ts     # 資料處理服務
│   │   └── collaborationService.ts      # 協作服務
│   ├── models/             # 資料模型
│   │   └── database.ts         # 資料庫設定
│   └── types/              # TypeScript 類型
└── package.json
```

### 4.2 API 端點設計

#### 4.2.1 檔案上傳 API

**POST** `/api/upload`

**Request**:
```typescript
Content-Type: multipart/form-data
Body: {
  file: File (CSV/Excel)
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    fileId: string,
    rowCount: number,
    columnCount: number,
    preview: DataPoint[]  // 前 10 列預覽
  }
}
```

#### 4.2.2 批次分析 API

**POST** `/api/batch-analysis`

**Request**:
```typescript
{
  fileIds: [
    { fileId: string, label?: string }
  ],
  params: string[],               // 數值參數
  groupBy: string[],              // 分組欄位
  flattenParams: string[],        // 扁平化參數
  uniqueIdConfig?: {              // 識別碼配置 (NEW)
    fieldName: string,
    autoGenerate: boolean,
    generationPattern?: string
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    flattenedData: Record<string, unknown>[],
    groupedData: Record<string, unknown>[],
    metadata: BatchViewMetadata
  }
}
```

#### 4.2.3 資料匯出 API

**POST** `/api/export/data`

**Request**:
```typescript
{
  data: Record<string, unknown>[],
  format: 'csv' | 'xlsx',
  options?: {
    includeStatistics?: boolean,
    filename?: string,
    metadata?: BatchViewMetadata,
    flattenedData?: Record<string, unknown>[],
    groupedData?: Record<string, unknown>[],
    primarySort?: string | null,
    secondarySort?: string | null
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    downloadUrl: string  // 相對路徑，前端會組合 API_ORIGIN
  }
}
```

**匯出格式說明**:

**Excel (.xlsx)**:
- Sheet 1: Data Overview（資料總覽）
- Sheet 2: Flattened Data（逐筆數據，已套用排序）
- Sheet 3: Grouped Data（分組彙總數據，如有選擇分組欄位）
- Sheet 4: Statistics（統計資訊，如勾選「包含摘要統計」）

**CSV (.csv)**:
- UTF-8 with BOM 編碼
- 分段式結構，使用標題行區隔各區塊
- 相容 Excel、Minitab、MATLAB

### 4.3 資料庫設計

#### 4.3.1 資料表架構

**uploaded_files** - 上傳檔案記錄
```sql
CREATE TABLE uploaded_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT,
  status TEXT DEFAULT 'active'
);
```

**batch_data** - 批次資料快取
```sql
CREATE TABLE batch_data (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON 格式
  row_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES uploaded_files(id)
);
```

**analysis_jobs** - 分析工作記錄
```sql
CREATE TABLE analysis_jobs (
  id TEXT PRIMARY KEY,
  config TEXT NOT NULL,  -- JSON 格式
  status TEXT NOT NULL,  -- 'pending', 'running', 'succeeded', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  result TEXT,  -- JSON 格式
  error TEXT
);
```

**users** - 使用者資訊
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**collaboration_sessions** - 協作會話
```sql
CREATE TABLE collaboration_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  socket_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 5. 資料流程

### 5.1 標準分析流程

```
1. 檔案上傳
   ├─ 前端: FileUpload 組件選擇檔案
   ├─ 前端: 發送 POST /api/upload
   ├─ 後端: 解析 CSV/Excel
   ├─ 後端: 儲存到 uploaded_files + batch_data
   └─ 後端: 回傳 fileId + preview

2. 資料清理（可選）
   ├─ 前端: DataCleaningConfig 配置規則
   ├─ 前端: 發送 POST /api/preview-cleaning
   ├─ 後端: 應用清理規則
   └─ 後端: 回傳清理後數據

3. 唯一識別碼配置 (NEW)
   ├─ 前端: UniqueIdSelector 選擇欄位或自動偵測
   ├─ 前端: 設定 autoGenerate 和 generationPattern
   └─ 前端: 將 uniqueIdConfig 傳遞給 createDataViews()

4. 資料檢視生成
   ├─ 前端: createDataViews(data, { uniqueIdConfig, ... })
   ├─ 前端: 自動偵測或使用指定識別碼欄位
   ├─ 前端: 根據是否選擇分組欄位生成對應檢視模式
   │  ├─ 無分組欄位 → flattenedData（可套用排序）
   │  └─ 有分組欄位 → groupedData（聚合統計）
   └─ 前端: 更新 state (flattenedData, groupedData, metadata)

5. 圖表生成
   ├─ 前端: DataParameterSelector 選擇參數
   ├─ 前端: ChartTypeSelector 數據格式設置類型
   ├─ 前端: 圖表推薦系統使用 uniqueIdFieldName
   └─ 前端: ChartRenderer 渲染圖表

6. 資料匯出
   ├─ 前端: ExportOptions 選擇格式（Excel 或 CSV）
   ├─ 前端: 發送 POST /api/export/data（包含 flattenedData, groupedData, metadata, primarySort, secondarySort）
   ├─ 後端: exportService 處理排序並生成多工作表結構
   │  ├─ 套用主要/次要排序到 flattenedData
   │  ├─ 生成 Data Overview 表
   │  ├─ 生成 Flattened Data 表
   │  ├─ 生成 Grouped Data 表（如有）
   │  └─ 生成 Statistics 表（如勾選）
   └─ 後端: 回傳下載連結
```

### 5.2 唯一識別碼處理流程

```
使用者上傳資料
    │
    ├─ 包含 Sample_ID 欄位？
    │  ├─ Yes → 使用者可選擇 Sample_ID 作為識別碼
    │  └─ No  → 使用自動偵測模式
    │
    ↓
UniqueIdSelector 組件顯示
    │
    ├─ 使用者選擇「自動偵測」
    │  │
    │  └─→ fieldName = '_auto'
    │     └─→ 系統搜尋: Point_ID → PointId → point_id
    │        ├─ 找到 → 使用該欄位
    │        └─ 未找到 → 依 autoGenerate 決定是否生成
    │
    ├─ 使用者選擇「Sample_ID」
    │  │
    │  └─→ fieldName = 'Sample_ID'
    │     └─→ 系統檢查 Sample_ID 是否存在
    │        ├─ 存在 → 使用 Sample_ID
    │        └─ 不存在 → 依 autoGenerate 決定是否生成
    │
    ↓
createDataViews() 處理
    │
    ├─ 確定最終識別碼欄位名稱
    ├─ 生成或解析識別碼值
    ├─ 自動排除識別碼欄位於統計分析
    └─ 更新圖表推薦邏輯使用正確識別碼
    │
    ↓
資料檢視生成完成
    │
    └─→ flattenedData: [{ [識別碼欄位]: "value", ... }]
       └─→ groupedData: [{ groupField: "value", metric_mean: N, metric_count: N, ... }]
          └─→ metadata: { columnTypes, aggregations, ... }
```

---

## 6. 關鍵設計決策

### 6.1 前後端分離

**優點**:
- 前端可獨立部署和擴展
- 更好的開發體驗（熱重載）
- 支援未來行動端開發

**挑戰**:
- CORS 配置
- 會話管理

### 6.2 TypeScript 全棧

**優點**:
- 類型安全，減少運行時錯誤
- 更好的 IDE 支援和自動補全
- 前後端共享類型定義

**實作細節**:
- 前端 `frontend/src/types/index.ts`
- 後端 `backend/src/types/`
- 共享類型定義（例如 `UniqueIdConfig`、`DataPoint`）

### 6.3 可配置唯一識別碼設計 (NEW)

**設計理念**:
- **向後相容**: 預設仍支援 Point_ID 自動偵測
- **靈活性**: 允許使用者指定任何欄位作為識別碼
- **容錯性**: 當指定欄位不存在時，提供自動生成機制

**技術實作**:
```typescript
// 1. 類型定義
interface UniqueIdConfig {
  fieldName: string;
  autoGenerate: boolean;
  generationPattern?: string;
}

// 2. 處理邏輯
const resolvePointId = (row, fallback, config) => {
  if (config?.fieldName !== '_auto') {
    const customId = row[config.fieldName];
    if (customId) return customId;
  }
  // 預設邏輯...
}

// 3. UI 組件
<UniqueIdSelector
  availableColumns={categoricalColumns}
  config={uniqueIdConfig}
  onConfigChange={setUniqueIdConfig}
/>
```

### 6.4 兩種資料檢視模式

**設計原因**:
- 不同分析場景需要不同的資料結構
- **逐筆資料檢視（Flattened Data）**: 保留所有原始記錄，支援主要/次要排序，適合詳細分析
- **分組彙總檢視（Grouped Data）**: 依選定欄位聚合，產生統計摘要（mean/count/min/max/sum），適合統計分析

**實作策略**:
- 單一資料來源，根據使用者選擇的分組欄位動態生成檢視
- 使用 useMemo 避免重複計算
- 即時預覽讓使用者理解檢視模式差異
- 排序功能整合於逐筆檢視模式（primarySort, secondarySort）

### 6.5 圖表引擎選擇

**Chart.js** (Line, Bar):
- 輕量級
- 響應式設計
- 適合基本圖表

**Plotly.js** (Scatter):
- 強大的互動功能
- 支援進階統計圖表
- SVG 匯出支援

---

## 7. 性能優化

### 7.1 前端優化

**React 優化**:
```typescript
// 1. useMemo 快取計算
const activeChartData = useMemo(() => {
  if (dataViewMode === 'grouped') return groupedData;
  // ...
}, [dataViewMode, flattenedData, groupedData, hierarchicalData]);

// 2. useCallback 避免重複建立函數
const handleCleaningRulesChange = useCallback((rules) => {
  // ...
}, []);

// 3. 組件延遲載入
const ChartRenderer = React.lazy(() => import('./ChartRenderer'));
```

**資料處理優化**:
- 限制預覽資料量（前 5-10 列）
- 使用 Web Workers 處理大型檔案（規劃中）
- 虛擬化長列表（規劃中）
- 欄位類型預先分類（數值型、分類型）以優化選項呈現

### 7.2 後端優化

**資料庫優化**:
```sql
-- 索引優化
CREATE INDEX idx_file_id ON batch_data(file_id);
CREATE INDEX idx_status ON analysis_jobs(status);
CREATE INDEX idx_created_at ON uploaded_files(created_at);
```

**快取策略**:
- 檔案解析結果快取到 batch_data 表
- Redis 快取常用查詢（生產環境）

---

## 8. 安全性設計

### 8.1 檔案上傳安全

```typescript
// 檔案類型驗證
const allowedMimeTypes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// 檔案大小限制
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// 檔案名稱清理
const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
};
```

### 8.2 輸入驗證

```typescript
// 使用者輸入驗證
const validateAnalysisRequest = (req: AnalysisJobRequest) => {
  if (!req.params || req.params.length === 0) {
    throw new Error('params is required');
  }
  if (req.params.length > 20) {
    throw new Error('Too many parameters');
  }
  // ...
};
```

### 8.3 SQL 注入防護

- 使用參數化查詢
- ORM/Query Builder 抽象化
- 輸入清理和驗證

---

## 9. 可擴展性

### 9.1 水平擴展

**前端**:
- 靜態資源 CDN 分發
- 負載均衡多個前端實例

**後端**:
- 無狀態 API 設計
- 使用 Redis 共享會話
- 分散式檔案儲存

### 9.2 功能擴展

**插件化圖表引擎**:
```typescript
interface ChartEnginePlugin {
  type: ChartType;
  render: (data, config) => void;
  export: (format) => Blob;
}

const chartEngines = new Map<ChartType, ChartEnginePlugin>();
chartEngines.set('scatter', plotlyEngine);
chartEngines.set('line', chartjsEngine);
```

**可配置分析管線**:
```typescript
interface AnalysisPipeline {
  steps: AnalysisStep[];
  execute: (data) => Promise<AnalysisResult>;
}

const pipeline = new AnalysisPipelineBuilder()
  .addStep(cleaningStep)
  .addStep(aggregationStep)
  .addStep(visualizationStep)
  .build();
```

---

## 10. 部署架構

### 10.1 開發環境

```
localhost:3000 (前端開發伺服器)
    │
    └─→ localhost:3001 (後端 API)
           │
           └─→ SQLite (本地資料庫)
```

### 10.2 生產環境（建議）

```
Internet
    │
    ├─→ CDN (靜態資源)
    │
    └─→ Load Balancer
           │
           ├─→ Frontend Server 1 (Nginx + React Build)
           ├─→ Frontend Server 2
           │
           └─→ API Load Balancer
                  │
                  ├─→ Backend Server 1 (Node.js)
                  ├─→ Backend Server 2
                  ├─→ Backend Server 3
                  │
                  └─→ PostgreSQL (Master-Slave)
                  │
                  └─→ Redis (Session + Cache)
                  │
                  └─→ File Storage (S3/MinIO)
```

---

## 11. 監控和日誌

### 11.1 前端監控

- Error Boundary 捕獲 React 錯誤
- Performance API 追蹤頁面性能
- 使用者行為追蹤（可選）

### 11.2 後端監控

```typescript
// 請求日誌中介軟體
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// 錯誤處理中介軟體
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});
```

---

## 12. 技術債務和改進計劃

### 12.1 已知限制

- 大型檔案處理（>100MB）性能問題
- 圖表在大量資料點（>10000）時渲染緩慢
- 缺少單元測試覆蓋

### 12.2 改進計劃

**短期** (1-3個月):
- 新增單元測試（目標覆蓋率 >70%）
- 實作 Web Workers 處理大型檔案
- 圖表虛擬化渲染

**中期** (3-6個月):
- 微服務拆分（分析服務獨立）
- 實作完整的使用者權限系統
- 增加更多圖表類型

**長期** (6-12個月):
- 機器學習整合
- 實時協作增強
- 行動端應用開發

---

**文檔版本歷史**:
- v2.0 (2025-01-22) - 更新為兩種資料檢視模式、移除 Python 管線、新增排序功能、更新匯出 API 結構
- v1.0 (2025-10-14) - 初版，涵蓋完整系統架構和可配置識別碼設計
