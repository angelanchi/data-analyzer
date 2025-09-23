# 架構圖與流程圖 (Architecture Diagrams)

> 本文檔使用視覺化圖表說明 Data Analyzer 的系統架構、數據流和關鍵流程。

> 💡 **提示**：本文檔中的圖表使用 [Mermaid](https://mermaid.js.org/) 語法，在 GitHub、VS Code (with插件)、Notion 等平台上可以直接渲染。

---

## 📐 目錄

1. [系統整體架構](#1-系統整體架構)
2. [前端架構](#2-前端架構)
3. [後端架構](#3-後端架構)
4. [數據庫設計](#4-數據庫設計)
5. [數據流轉換](#5-數據流轉換)
6. [5步驟工作流](#6-5步驟工作流)
7. [WebSocket 協作流程](#7-websocket-協作流程)
8. [API 請求流程](#8-api-請求流程)

---

## 1. 系統整體架構

### 1.1 High-Level 架構圖

```mermaid
graph TB
    subgraph "前端 Frontend (React SPA)"
        A[瀏覽器 Browser]
        B[React 應用]
        C[Component Layer]
        D[Service Layer]
        E[Context State]
    end

    subgraph "後端 Backend (Node.js + Express)"
        F[Express Server]
        G[REST API]
        H[WebSocket Server]
        I[Service Layer]
        J[Database Layer]
    end

    subgraph "數據存儲 Data Storage"
        K[(SQLite DB)]
        L[/uploads/ 文件存儲]
        M[/exports/ 匯出文件]
    end

    A --> |HTTP/WebSocket| B
    B --> C
    C --> D
    D --> |Axios| G
    D --> |Socket.io-client| H
    E -.管理狀態.-> C

    F --> G
    F --> H
    G --> I
    H --> I
    I --> J
    J --> K
    I --> L
    I --> M

    style A fill:#e1f5ff
    style B fill:#fff3cd
    style F fill:#d4edda
    style K fill:#f8d7da
```

### 1.2 技術棧架構

```mermaid
graph LR
    subgraph "前端技術棧"
        A1[React 18]
        A2[TypeScript 5]
        A3[Material-UI 5]
        A4[Chart.js / Plotly]
        A5[Socket.io-client]
        A6[Axios]
    end

    subgraph "後端技術棧"
        B1[Node.js 18+]
        B2[Express 4]
        B3[TypeScript 5]
        B4[Socket.io 4]
        B5[SQLite 3]
        B6[PapaParse / xlsx]
    end

    subgraph "共享 Shared"
        C1[TypeScript Types]
    end

    A1 --> A2
    A1 --> A3
    A1 --> A4
    A1 --> A5
    A2 --> C1
    B1 --> B2
    B2 --> B3
    B2 --> B4
    B3 --> C1

    style A1 fill:#61dafb
    style B1 fill:#68a063
    style C1 fill:#3178c6
```

### 1.3 部署架構

```mermaid
graph TB
    subgraph "用戶端 Client"
        U[用戶瀏覽器]
    end

    subgraph "開發環境 Development"
        D1[localhost:3000<br/>React Dev Server]
        D2[localhost:3001<br/>Express + nodemon]
        D3[(SQLite 文件數據庫)]
    end

    subgraph "生產環境 Production (建議)"
        P1[Nginx<br/>靜態文件服務]
        P2[Node.js<br/>Express Server]
        P3[(PostgreSQL<br/>生產數據庫)]
        P4[Redis<br/>Session/Cache]
    end

    U -->|開發| D1
    U -->|開發| D2
    D2 --> D3

    U -->|生產| P1
    P1 --> P2
    P2 --> P3
    P2 --> P4

    style U fill:#e1f5ff
    style D1 fill:#fff3cd
    style P1 fill:#d4edda
```

---

## 2. 前端架構

### 2.1 組件層級結構

```mermaid
graph TD
    A[App.tsx<br/>路由根組件]
    B[AnalysisPage<br/>主頁面]
    C[UserContext<br/>用戶狀態]
    D[CollaborationContext<br/>協作狀態]

    subgraph "步驟 1: 上傳"
        E1[FileUpload]
        E2[DataPreview]
    end

    subgraph "步驟 2: 清洗"
        F1[DataCleaningConfig]
    end

    subgraph "步驟 3: 格式設置"
        G1[DataParameterSelector]
        G2[DataViewSelector]
        G3[DataViewPreview]
    end

    subgraph "步驟 4: 圖表"
        H1[ChartTypeSelector]
        H2[ChartRenderer]
        H3[BasicCharts]
        H4[AdvancedCharts]
    end

    subgraph "步驟 5: 匯出"
        I1[ExportOptions]
    end

    A --> C
    A --> D
    A --> B
    B --> E1
    B --> E2
    B --> F1
    B --> G1
    B --> G2
    B --> G3
    B --> H1
    B --> H2
    H2 --> H3
    H2 --> H4
    B --> I1

    style A fill:#ff6b6b
    style B fill:#4ecdc4
    style C fill:#ffe66d
    style D fill:#ffe66d
```

### 2.2 狀態管理流程

```mermaid
graph LR
    subgraph "React Context"
        A[UserContext]
        B[CollaborationContext]
    end

    subgraph "Local State (AnalysisPage)"
        C[rawData]
        D[cleanedData]
        E[chartConfig]
        F[metadata]
        G[selectedMetrics]
        H[selectedGroups]
    end

    subgraph "Computed State (useMemo)"
        I[effectiveData]
        J[activeChartData]
    end

    A -->|provide| C
    B -->|provide| C
    C -->|useState| D
    D -->|useState| E
    E -->|useState| F
    F -->|useState| G
    G -->|useState| H

    C -->|計算| I
    D -->|計算| I
    I -->|計算| J
    E -->|計算| J

    style A fill:#61dafb
    style B fill:#61dafb
    style I fill:#95e1d3
    style J fill:#95e1d3
```

### 2.3 數據流向（前端）

```mermaid
sequenceDiagram
    participant U as 用戶
    participant C as 組件 Component
    participant S as Service Layer
    participant API as Backend API
    participant State as React State

    U->>C: 上傳文件
    C->>S: uploadFile(file)
    S->>API: POST /api/upload
    API-->>S: {fileId, data}
    S-->>C: 返回數據
    C->>State: setRawData(data)
    State-->>C: 觸發重新渲染
    C->>U: 顯示數據預覽
```

---

## 3. 後端架構

### 3.1 MVC 架構層級

```mermaid
graph TB
    subgraph "Entry Point"
        A[index.ts<br/>Express App 初始化]
    end

    subgraph "Middleware Layer"
        B1[helmet - 安全頭]
        B2[cors - 跨域]
        B3[rate-limit - 限流]
        B4[body-parser - 請求解析]
        B5[morgan - 日誌]
    end

    subgraph "Routes Layer"
        C1[/api/upload]
        C2[/api/data]
        C3[/api/charts]
        C4[/api/export]
        C5[/api/projects]
    end

    subgraph "Controllers Layer"
        D1[uploadController]
        D2[dataController]
        D3[chartController]
        D4[exportController]
        D5[projectController]
    end

    subgraph "Services Layer"
        E1[dataCleaningService]
        E2[exportService]
        E3[collaborationService]
        E4[batchAnalysisService]
    end

    subgraph "Utils / Database"
        F1[database.ts]
        F2[fileUpload.ts]
        F3[validation.ts]
    end

    A --> B1
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> B5
    B5 --> C1
    B5 --> C2
    B5 --> C3
    B5 --> C4
    B5 --> C5

    C1 --> D1
    C2 --> D2
    C3 --> D3
    C4 --> D4
    C5 --> D5

    D1 --> E1
    D2 --> E1
    D4 --> E2
    D5 --> E3

    E1 --> F1
    E2 --> F1
    E3 --> F1
    D1 --> F2
    D1 --> F3

    style A fill:#ff6b6b
    style E1 fill:#4ecdc4
    style F1 fill:#ffe66d
```

### 3.2 API 端點結構

```mermaid
graph LR
    A[Express Server]

    subgraph "數據相關 Data APIs"
        B1[POST /api/upload]
        B2[POST /api/data/process]
        B3[GET /api/data/statistics]
        B4[POST /api/data/views]
    end

    subgraph "匯出相關 Export APIs"
        C1[POST /api/export/data]
    end

    subgraph "項目相關 Project APIs"
        D1[GET /api/projects]
        D2[POST /api/projects]
        D3[PUT /api/projects/:id]
        D4[DELETE /api/projects/:id]
    end

    subgraph "其他 Other APIs"
        E1[GET /health]
        E2[GET /api/users]
    end

    A --> B1
    A --> B2
    A --> B3
    A --> B4
    A --> C1
    A --> D1
    A --> D2
    A --> D3
    A --> D4
    A --> E1
    A --> E2

    style A fill:#68a063
    style B1 fill:#61dafb
    style C1 fill:#4ecdc4
    style D1 fill:#ffe66d
```

---

## 4. 數據庫設計

### 4.1 ER 關係圖

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : creates
    USERS ||--o{ DATA_FILES : uploads
    PROJECTS ||--o{ DATA_FILES : contains
    PROJECTS ||--o{ CHART_CONFIGS : has
    USERS ||--o{ USER_SESSIONS : has

    USERS {
        string id PK
        string username
        string email
        timestamp created_at
    }

    PROJECTS {
        string id PK
        string name
        string description
        string created_by FK
        timestamp created_at
        timestamp updated_at
    }

    DATA_FILES {
        string id PK
        string file_name
        string file_path
        int file_size
        string uploaded_by FK
        string project_id FK
        json metadata
        timestamp uploaded_at
    }

    CHART_CONFIGS {
        int id PK
        string project_id FK
        string chart_type
        json config
        timestamp created_at
        timestamp updated_at
    }

    USER_SESSIONS {
        string session_id PK
        string user_id FK
        string project_id
        timestamp last_active
        timestamp created_at
    }
```

### 4.2 數據表詳細結構

#### users 表
| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| id | TEXT | 用戶 ID | PRIMARY KEY |
| username | TEXT | 用戶名 | NOT NULL, UNIQUE |
| email | TEXT | 電子郵件 | UNIQUE |
| created_at | DATETIME | 創建時間 | DEFAULT CURRENT_TIMESTAMP |

#### data_files 表
| 欄位 | 類型 | 說明 | 約束 |
|------|------|------|------|
| id | TEXT | 文件 ID | PRIMARY KEY |
| file_name | TEXT | 原始文件名 | NOT NULL |
| file_path | TEXT | 服務器路徑 | NOT NULL |
| file_size | INTEGER | 文件大小 (bytes) | |
| uploaded_by | TEXT | 上傳者 ID | FOREIGN KEY |
| metadata | TEXT | JSON 格式元數據 | |
| uploaded_at | DATETIME | 上傳時間 | DEFAULT CURRENT_TIMESTAMP |

---

## 5. 數據流轉換

### 5.1 完整數據流程

```mermaid
graph TD
    A[原始 CSV/Excel 文件] -->|1. 上傳| B[後端文件解析]
    B -->|PapaParse/xlsx| C[JSON 數據數組]
    C -->|2. 返回前端| D[rawData State]
    D -->|3. 應用清洗規則| E[previewDataCleaning API]
    E -->|4. 返回清洗後數據| F[cleanedData State]
    F -->|5. createDataViews| G[dataViews.ts 處理]

    subgraph "dataViews.ts 轉換"
        G1[數據標準化<br/>normalize]
        G2[類型推斷<br/>inferColumnTypes]
        G3[建立扁平化數據<br/>buildFlattenedData]
        G4[建立分組統計數據<br/>buildGroupedData]
        G5[計算統計<br/>computeAggregations]
    end

    G --> G1
    G1 --> G2
    G2 --> G3
    G2 --> G4
    G3 --> H[flattenedData<br/>用於圖表渲染]
    G4 --> I[groupedData<br/>用於數據匯出]
    G5 --> J[metadata]

    H -->|6. 傳遞給 ChartRenderer| K[圖表渲染]
    I -->|7. 傳遞給 ExportService| L[Excel/CSV 匯出]
    J -.提供元數據.-> K
    J -.提供元數據.-> L

    style A fill:#ffe66d
    style G fill:#4ecdc4
    style K fill:#ff6b6b
    style L fill:#95e1d3
```

### 5.2 dataViews.ts 轉換詳解

```mermaid
graph TB
    A[InputRow[]]

    subgraph "Step 1-2: 標準化"
        B1[檢查 Point_ID 存在性]
        B2[解析 Source_File]
        B3[標準化 Point_ID 格式]
    end

    subgraph "Step 3-4: 類型推斷"
        C1[掃描所有欄位值]
        C2[計算數值比例]
        C3[分類為 numeric/categorical]
        C4[應用用戶覆寫]
    end

    subgraph "Step 5-7: 確定欄位"
        D1[選擇 metrics]
        D2[選擇 groups]
        D3[選擇 categoricalMetrics]
    end

    subgraph "Step 8: 構建數據格式"
        E1[buildFlattenedData<br/>保留所有記錄<br/>用於圖表渲染]
        E2[buildGroupedData<br/>聚合統計<br/>用於數據匯出]
    end

    subgraph "Step 9-10: 統計與元數據"
        F1[computeOverallAggregations]
        F2[組裝 metadata]
    end

    G[BatchViewResult<br/>{flattenedData, groupedData, metadata}]

    A --> B1
    B1 --> B2
    B2 --> B3
    B3 --> C1
    C1 --> C2
    C2 --> C3
    C3 --> C4
    C4 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> E1
    D3 --> E2
    E1 --> F1
    E2 --> F1
    F1 --> F2
    F2 --> G

    style A fill:#ffe66d
    style C3 fill:#4ecdc4
    style E1 fill:#95e1d3
    style E2 fill:#95e1d3
    style G fill:#ff6b6b
```

### 5.3 數據格式對比

```mermaid
graph LR
    subgraph "原始數據 Raw Data"
        A[Point_ID: P1<br/>Voltage: 3.3<br/>Batch: A]
        B[Point_ID: P2<br/>Voltage: 3.5<br/>Batch: A]
        C[Point_ID: P3<br/>Voltage: 3.2<br/>Batch: B]
    end

    subgraph "扁平化數據 Flattened Data<br/>用於圖表渲染"
        D[Source_File, Point_ID,<br/>Batch, Voltage<br/>保留所有 3 筆記錄]
    end

    subgraph "分組統計數據 Grouped Statistics<br/>用於 Excel/CSV 匯出"
        E[Batch: A<br/>Voltage_stat_mean: 3.4<br/>Voltage_stat_count: 2]
        F[Batch: B<br/>Voltage_stat_mean: 3.2<br/>Voltage_stat_count: 1]
    end

    A --> D
    B --> D
    C --> D
    A --> E
    B --> E
    C --> F

    style D fill:#61dafb
    style E fill:#4ecdc4
    style F fill:#4ecdc4
```

**重要概念釐清：**
- **Flattened Data (扁平化數據)**：保留所有原始記錄，主要用於 **圖表渲染和 UI 顯示**
- **Grouped Statistics (分組統計數據)**：按分組欄位聚合，生成 `_stat_*` 後綴的統計欄位，主要用於 **Excel/CSV 匯出和統計報告**
- 圖表需要顯示原始數據點和趨勢，因此使用 flattenedData，而非預先計算的平均值

---

## 6. 5步驟工作流

### 6.1 完整流程圖

```mermaid
stateDiagram-v2
    [*] --> Step1_Upload
    Step1_Upload --> Step2_Cleaning : 上傳成功
    Step2_Cleaning --> Step3_Format : 配置清洗規則
    Step3_Format --> Step4_Chart : 選擇指標與分組
    Step4_Chart --> Step5_Export : 配置圖表
    Step5_Export --> [*] : 匯出完成

    Step1_Upload : 步驟 1: 上傳資料
    Step2_Cleaning : 步驟 2: 設定清理
    Step3_Format : 步驟 3: 數據格式設置
    Step4_Chart : 步驟 4: 圖表配置與預覽
    Step5_Export : 步驟 5: 匯出結果

    note right of Step1_Upload
        - FileUpload 組件
        - 支持 CSV, Excel
        - 最大 50MB
    end note

    note right of Step2_Cleaning
        - DataCleaningConfig
        - 缺失值處理
        - 異常值偵測
    end note

    note right of Step3_Format
        - DataParameterSelector
        - 選擇 metrics, groups
        - 配置排序
    end note

    note right of Step4_Chart
        - ChartTypeSelector
        - 3 種圖表類型
        - 即時預覽
    end note

    note right of Step5_Export
        - ExportOptions
        - Excel/CSV/PNG
        - 多 sheet 匯出
    end note
```

### 6.2 各步驟詳細流程

#### 步驟 1: 文件上傳流程

```mermaid
sequenceDiagram
    participant U as 用戶
    participant FU as FileUpload 組件
    participant API as Backend API
    participant PP as PapaParse/xlsx
    participant FS as 文件系統

    U->>FU: 選擇文件 (drag & drop)
    FU->>FU: 驗證文件類型 & 大小
    alt 驗證失敗
        FU-->>U: 顯示錯誤訊息
    else 驗證成功
        FU->>API: POST /api/upload
        API->>FS: 保存文件到 uploads/
        API->>PP: 解析文件內容
        PP-->>API: JSON 數據數組
        API-->>FU: {fileId, data, sourceName}
        FU->>FU: setRawData(data)
        FU-->>U: 顯示數據預覽
    end
```

#### 步驟 2: 數據清洗流程

```mermaid
sequenceDiagram
    participant U as 用戶
    participant DCC as DataCleaningConfig
    participant API as /api/data/preview-cleaning
    participant DCS as dataCleaningService

    U->>DCC: 選擇清洗規則
    DCC->>API: POST {fileId, rules}
    API->>DCS: applyCleaningRules(data, rules)

    loop 對每條規則
        DCS->>DCS: 應用規則邏輯
        Note over DCS: removeEmpty, interpolate,<br/>fillDefault, removeOutliers
    end

    DCS-->>API: cleanedData
    API-->>DCC: {cleanedData, statistics}
    DCC->>U: 顯示清洗前後對比
```

#### 步驟 3: 數據格式設置流程

```mermaid
graph TD
    A[用戶選擇 metrics, groups]
    B[DataParameterSelector]
    C[createDataViews 調用]

    subgraph "dataViews.ts 處理"
        D1[類型推斷]
        D2[構建 flattenedData]
        D3[構建 groupedData]
        D4[計算 metadata]
    end

    E[DataViewPreview 顯示]
    F[用戶確認或調整]

    A --> B
    B --> C
    C --> D1
    D1 --> D2
    D1 --> D3
    D1 --> D4
    D2 --> E
    D3 --> E
    D4 --> E
    E --> F
    F -->|調整| A

    style C fill:#4ecdc4
    style E fill:#61dafb
```

#### 步驟 4: 圖表配置流程

```mermaid
sequenceDiagram
    participant U as 用戶
    participant CTS as ChartTypeSelector
    participant CR as ChartRenderer
    participant CL as Chart Library (Chart.js/Plotly)

    U->>CTS: 選擇圖表類型 (scatter/line/bar)
    CTS->>CTS: 根據數據推薦圖表類型
    U->>CTS: 選擇 X 軸, Y 軸
    U->>CTS: 配置圖例分組
    CTS->>CR: setChartConfig(config)
    CR->>CL: 渲染圖表
    CL-->>CR: 圖表實例
    CR-->>U: 顯示即時預覽
    U->>U: 可調整配置，即時更新
```

#### 步驟 5: 匯出流程

```mermaid
graph TD
    A[用戶選擇匯出格式]

    subgraph "數據匯出 Data Export"
        B1[Excel 匯出]
        B2[CSV 匯出]
    end

    subgraph "圖表匯出 Chart Export"
        C1[PNG 匯出]
        C2[SVG 匯出 Plotly only]
    end

    D[POST /api/export/data]
    E[exportService.ts]
    F1[生成 Excel 多 sheet]
    F2[生成 CSV 分段]
    G[返回下載 URL]
    H[前端觸發瀏覽器下載]

    A -->|數據| B1
    A -->|數據| B2
    A -->|圖表| C1
    A -->|圖表| C2

    B1 --> D
    B2 --> D
    D --> E
    E --> F1
    E --> F2
    F1 --> G
    F2 --> G
    G --> H

    C1 -.前端直接匯出.-> H
    C2 -.前端直接匯出.-> H

    style E fill:#4ecdc4
    style H fill:#61dafb
```

---

## 7. WebSocket 協作流程

### 7.1 協作連接生命週期

```mermaid
sequenceDiagram
    participant U as 用戶瀏覽器
    participant CC as CollaborationContext
    participant WS as WebSocket Server
    participant DB as Database

    Note over U,DB: 連接階段
    U->>CC: 用戶登入
    CC->>WS: socket.connect()
    WS-->>CC: 'connect' 事件
    CC->>WS: emit('joinProject', {projectId, userId})
    WS->>DB: 查詢項目信息
    WS-->>CC: emit('projectState', {activeUsers, dataFiles})
    CC-->>U: 更新 UI 顯示在線用戶

    Note over U,DB: 協作階段
    U->>CC: 修改圖表配置
    CC->>WS: emit('chartChange', {chartConfig})
    WS->>WS: 廣播給其他用戶
    WS-->>CC: emit('chartChanged', {chartConfig, userId})
    CC-->>U: 更新其他用戶的圖表

    Note over U,DB: 斷開階段
    U->>CC: 關閉頁面/登出
    CC->>WS: socket.disconnect()
    WS->>WS: 通知其他用戶
    WS-->>CC: emit('userLeft', {userId})
```

### 7.2 WebSocket 事件目錄

```mermaid
graph LR
    subgraph "客戶端 → 服務器 (Emit)"
        A1[joinProject]
        A2[leaveProject]
        A3[chartChange]
        A4[dataFileUploaded]
        A5[configurationChange]
    end

    subgraph "服務器 → 客戶端 (On)"
        B1[projectState]
        B2[userJoined]
        B3[userLeft]
        B4[chartChanged]
        B5[dataFileAdded]
        B6[error]
    end

    A1 -->|連接| B1
    A1 -->|廣播| B2
    A2 -->|廣播| B3
    A3 -->|廣播| B4
    A4 -->|廣播| B5
    B6 -.錯誤處理.-> A1

    style A1 fill:#61dafb
    style B1 fill:#4ecdc4
```

### 7.3 實時協作範例：圖表同步

```mermaid
sequenceDiagram
    participant U1 as 用戶 A
    participant U2 as 用戶 B
    participant WS as WebSocket Server

    U1->>WS: emit('chartChange', {type: 'scatter', xAxis: 'Voltage'})
    WS->>WS: 驗證配置
    WS->>U2: emit('chartChanged', {config, userId: 'A'})
    U2->>U2: 更新圖表顯示
    U2-->>U1: （通過 UI 看到 A 的變更）

    Note over U1,U2: 用戶 B 也可以修改
    U2->>WS: emit('chartChange', {type: 'line', yAxis: ['Current']})
    WS->>U1: emit('chartChanged', {config, userId: 'B'})
    U1->>U1: 更新圖表顯示
```

---

## 8. API 請求流程

### 8.1 典型 API 請求生命週期

```mermaid
sequenceDiagram
    participant C as 前端組件
    participant A as api.ts (Axios)
    participant M as Express 中間件
    participant R as Router
    participant Ctrl as Controller
    participant Svc as Service
    participant DB as Database

    C->>A: uploadFile(file)
    A->>M: POST /api/upload

    Note over M: 中間件鏈處理
    M->>M: helmet (安全頭)
    M->>M: cors (跨域)
    M->>M: rate-limit (限流)
    M->>M: body-parser (解析)

    M->>R: 路由匹配
    R->>Ctrl: uploadController.upload()
    Ctrl->>Ctrl: 驗證文件類型
    Ctrl->>Svc: 解析文件內容
    Svc->>DB: 保存文件記錄
    DB-->>Svc: 文件 ID
    Svc-->>Ctrl: {fileId, data}
    Ctrl-->>R: 200 OK + JSON
    R-->>M: 響應
    M-->>A: Axios 響應
    A-->>C: Promise resolved
    C->>C: 更新 state
```

### 8.2 錯誤處理流程

```mermaid
graph TD
    A[API 請求] --> B{驗證通過?}
    B -->|否| C[400 Bad Request]
    B -->|是| D{認證通過?}
    D -->|否| E[401 Unauthorized]
    D -->|是| F{業務邏輯處理}
    F -->|成功| G[200 OK]
    F -->|業務錯誤| H[400 Bad Request<br/>+ 詳細錯誤訊息]
    F -->|服務器錯誤| I[500 Internal Server Error]

    C --> J[前端顯示錯誤訊息]
    E --> J
    H --> J
    I --> J
    G --> K[前端處理成功響應]

    style C fill:#f8d7da
    style E fill:#f8d7da
    style H fill:#f8d7da
    style I fill:#f8d7da
    style G fill:#d4edda
```

### 8.3 常見 API 請求範例

#### 文件上傳 API

```mermaid
sequenceDiagram
    participant F as Frontend
    participant U as Upload Endpoint
    participant M as Multer
    participant P as Parser (PapaParse)
    participant FS as File System

    F->>U: POST /api/upload<br/>FormData: file
    U->>M: 處理 multipart/form-data
    M->>FS: 保存到 uploads/
    FS-->>M: 文件路徑
    M-->>U: req.file
    U->>P: 解析文件內容
    P-->>U: JSON data[]
    U-->>F: {fileId, data, sourceName}
```

#### 數據處理 API

```mermaid
sequenceDiagram
    participant F as Frontend
    participant D as Data Endpoint
    participant S as Cleaning Service

    F->>D: POST /api/data/process<br/>{fileId, rules}
    D->>S: applyCleaningRules(data, rules)

    loop 每條規則
        S->>S: 處理數據
    end

    S-->>D: cleanedData
    D-->>F: {cleanedData, statistics}
```

---

## 9. 性能優化策略

### 9.1 前端性能優化

```mermaid
graph LR
    subgraph "渲染優化"
        A1[useMemo<br/>緩存計算結果]
        A2[useCallback<br/>緩存函數引用]
        A3[React.memo<br/>避免不必要渲染]
    end

    subgraph "數據優化"
        B1[虛擬滾動<br/>大量數據列表]
        B2[分頁<br/>減少 DOM 節點]
        B3[懶加載<br/>按需加載組件]
    end

    subgraph "網路優化"
        C1[Axios 攔截器<br/>統一錯誤處理]
        C2[請求取消<br/>避免重複請求]
        C3[WebSocket<br/>減少輪詢]
    end

    A1 -.應用於.-> D[effectiveData]
    A2 -.應用於.-> E[事件處理器]
    B1 -.應用於.-> F[DataPreview]
    C3 -.應用於.-> G[實時協作]

    style A1 fill:#61dafb
    style B1 fill:#4ecdc4
    style C3 fill:#ffe66d
```

### 9.2 後端性能優化

```mermaid
graph LR
    subgraph "數據庫優化"
        A1[索引優化]
        A2[查詢優化]
        A3[連接池]
    end

    subgraph "緩存策略"
        B1[內存緩存<br/>Map/Object]
        B2[Redis<br/>生產環境]
        B3[文件緩存<br/>已解析數據]
    end

    subgraph "並發處理"
        C1[限流中間件<br/>rate-limit]
        C2[異步處理<br/>Promise.all]
        C3[批量操作<br/>減少查詢]
    end

    A1 -.應用於.-> D[users, data_files]
    B3 -.應用於.-> E[uploads/ 文件]
    C1 -.應用於.-> F[所有 API]

    style A1 fill:#68a063
    style B2 fill:#4ecdc4
    style C1 fill:#ffe66d
```

---

## 10. 安全架構

### 10.1 安全層級

```mermaid
graph TB
    subgraph "前端安全 Frontend Security"
        A1[XSS 防護<br/>React 自動轉義]
        A2[HTTPS Only<br/>生產環境]
        A3[輸入驗證<br/>客戶端]
    end

    subgraph "網路安全 Network Security"
        B1[CORS 配置<br/>限制來源]
        B2[Rate Limiting<br/>防止 DoS]
        B3[Helmet<br/>安全 HTTP 頭]
    end

    subgraph "後端安全 Backend Security"
        C1[輸入驗證<br/>服務器端]
        C2[文件類型驗證<br/>白名單]
        C3[文件大小限制<br/>50MB]
        C4[SQL 注入防護<br/>參數化查詢]
    end

    subgraph "數據安全 Data Security"
        D1[敏感數據加密]
        D2[Session 管理]
        D3[定期清理<br/>臨時文件]
    end

    A1 --> B1
    A3 --> C1
    B2 --> C1
    C1 --> D1
    C2 --> D3

    style A1 fill:#d4edda
    style B1 fill:#cfe2ff
    style C1 fill:#fff3cd
    style D1 fill:#f8d7da
```

---

## 📝 圖表使用說明

### 如何查看這些圖表

1. **GitHub** - 直接在 GitHub 上查看 .md 文件，Mermaid 會自動渲染
2. **VS Code** - 安裝 "Markdown Preview Mermaid Support" 擴展
3. **Notion** - 將 Mermaid 代碼粘貼到代碼塊中，選擇 "Mermaid" 語言
4. **在線編輯器** - https://mermaid.live/ 可以編輯和預覽

### 圖表類型說明

- **graph TD/LR** - 流程圖 (上到下/左到右)
- **sequenceDiagram** - 序列圖 (時序圖)
- **erDiagram** - ER 關係圖 (數據庫設計)
- **stateDiagram** - 狀態圖 (工作流狀態)

---

## 🔗 相關文檔

- [開發者快速上手指南](./DEVELOPER_ONBOARDING.md) - 入門學習路徑
- [API 參考文檔](./API_REFERENCE.md) - API 端點詳細說明
- [代碼範例集](./CODE_EXAMPLES.md) - 常見開發任務範例
- [系統架構文檔](./ARCHITECTURE.md) - 詳細架構說明

---

*最後更新：2025-01-13*
*維護者：開發團隊*
*回饋：如有圖表錯誤或建議，請提交 Issue*
