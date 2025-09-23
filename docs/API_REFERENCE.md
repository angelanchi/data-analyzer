# Data Analyzer - API 參考文檔

## 目錄

1. [API 概覽](#api-概覽)
2. [認證與授權](#認證與授權)
3. [通用規範](#通用規範)
4. [數據上傳 API](#數據上傳-api)
5. [數據處理 API](#數據處理-api)
6. [分析 API](#分析-api)
7. [匯出 API](#匯出-api)
8. [錯誤處理](#錯誤處理)
9. [使用範例](#使用範例)

---

## API 概覽

Data Analyzer 提供 RESTful API 供前端應用和第三方工具使用。所有 API 端點都遵循統一的設計規範。

### 基本資訊

- **Base URL**: `http://localhost:3001/api`（開發環境）
- **協議**: HTTP/HTTPS
- **數據格式**: JSON（除檔案上傳使用 multipart/form-data）
- **字元編碼**: UTF-8
- **API 版本**: v1（目前無版本號前綴）

### API 分類

| 分類 | 端點前綴 | 說明 |
|------|---------|------|
| 數據上傳 | `/upload` | 檔案上傳和解析 |
| 數據處理 | `/data` | 數據清理和轉換 |
| 分析 | `/analysis` | 數據分析和統計 |
| 匯出 | `/export` | 數據和圖表匯出 |

---

## 認證與授權

### 目前狀態

**v1 版本不需要認證**。所有 API 端點都是公開的，適用於單機部署或內部網路環境。

### 規劃中（未來版本）

```http
Authorization: Bearer {access_token}
```

將支援 JWT (JSON Web Token) 認證：
- 使用者註冊和登入
- Token 刷新機制
- 角色權限控制（Admin, User, Viewer）

---

## 通用規範

### HTTP 狀態碼

| 狀態碼 | 說明 | 使用場景 |
|--------|------|---------|
| 200 | OK | 請求成功 |
| 201 | Created | 資源建立成功 |
| 400 | Bad Request | 請求參數錯誤 |
| 404 | Not Found | 資源不存在 |
| 413 | Payload Too Large | 檔案過大 |
| 500 | Internal Server Error | 伺服器錯誤 |
| 503 | Service Unavailable | 服務暫時不可用 |

### 請求標頭

```http
Content-Type: application/json
Accept: application/json
```

檔案上傳時使用：
```http
Content-Type: multipart/form-data
```

### 回應格式

**成功回應**：
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**錯誤回應**：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### 分頁（規劃中）

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 10,
    "totalRecords": 500
  }
}
```

---

## 數據上傳 API

### 1. 上傳數據檔案

上傳一個或多個 CSV/Excel 檔案進行分析。

**端點**: `POST /api/upload`

**請求格式**: `multipart/form-data`

**參數**:

| 參數名 | 類型 | 必填 | 說明 |
|--------|------|------|------|
| files | File[] | 是 | 一個或多個檔案（CSV 或 .xlsx） |

**範例請求（cURL）**:

```bash
curl -X POST http://localhost:3001/api/upload \
  -F "files=@Batch1.csv" \
  -F "files=@Batch2.csv" \
  -F "files=@Batch3.csv"
```

**範例請求（JavaScript/Axios）**:

```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('files', file3);

const response = await axios.post('/api/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});
```

**範例請求（Python）**:

```python
import requests

files = [
    ('files', open('Batch1.csv', 'rb')),
    ('files', open('Batch2.csv', 'rb')),
    ('files', open('Batch3.csv', 'rb'))
]

response = requests.post('http://localhost:3001/api/upload', files=files)
data = response.json()
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "Batch1.csv",
        "originalName": "Batch1.csv",
        "size": 51234,
        "rowCount": 100,
        "columnCount": 12,
        "columns": [
          "Point_ID",
          "Location_X",
          "Location_Y",
          "Voltage",
          "Current",
          "Temperature",
          "Test_Result",
          "Batch_No"
        ]
      },
      {
        "filename": "Batch2.csv",
        "originalName": "Batch2.csv",
        "size": 49876,
        "rowCount": 95,
        "columnCount": 12,
        "columns": [...]
      }
    ],
    "totalRows": 195,
    "uploadId": "upload_1697123456789"
  },
  "message": "Files uploaded successfully"
}
```

**錯誤回應**:

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds the limit of 50MB",
    "details": {
      "filename": "LargeFile.csv",
      "size": 62914560,
      "limit": 52428800
    }
  }
}
```

**注意事項**:
- 單檔大小限制：50 MB（可在後端配置調整）
- 支援格式：CSV (UTF-8), Excel (.xlsx)
- 系統會自動偵測欄位類型（數值型/分類型）
- 系統會為每個檔案添加 `Source_File` 欄位

---

### 2. 解析 CSV 預覽

解析 CSV 檔案的前 N 行進行預覽（不儲存）。

**端點**: `POST /api/upload/preview`

**請求格式**: `multipart/form-data`

**參數**:

| 參數名 | 類型 | 必填 | 說明 |
|--------|------|------|------|
| file | File | 是 | CSV 檔案 |
| limit | number | 否 | 預覽行數（預設：10） |

**範例請求（cURL）**:

```bash
curl -X POST http://localhost:3001/api/upload/preview \
  -F "file=@Batch1.csv" \
  -F "limit=20"
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "columns": ["Point_ID", "Voltage", "Current", "Temperature"],
    "rows": [
      { "Point_ID": "P001", "Voltage": 5.2, "Current": 0.15, "Temperature": 25.3 },
      { "Point_ID": "P002", "Voltage": 5.3, "Current": 0.16, "Temperature": 25.5 },
      ...
    ],
    "totalRows": 100,
    "previewRows": 20
  }
}
```

---

## 數據處理 API

### 3. 數據清理

對上傳的數據進行清理（缺失值、異常值、範圍過濾）。

**端點**: `POST /api/data/clean`

**請求格式**: `application/json`

**請求體**:

```json
{
  "uploadId": "upload_1697123456789",
  "cleaningOptions": {
    "handleMissingValues": {
      "method": "interpolate",  // "remove" | "interpolate" | "fillDefault"
      "defaultValue": null      // 僅在 fillDefault 時需要
    },
    "detectOutliers": {
      "enabled": true,
      "method": "iqr",          // "iqr" | "zscore"
      "columns": ["Voltage", "Current", "Temperature"],
      "threshold": 1.5          // IQR: 1.5, Z-Score: 3
    },
    "filterByRange": {
      "enabled": true,
      "rules": [
        {
          "column": "Voltage",
          "min": 4.5,
          "max": 5.5
        },
        {
          "column": "Temperature",
          "min": 20,
          "max": 30
        }
      ]
    }
  }
}
```

**參數說明**:

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| uploadId | string | 是 | 上傳 ID |
| cleaningOptions | object | 是 | 清理選項 |
| cleaningOptions.handleMissingValues | object | 否 | 缺失值處理 |
| cleaningOptions.detectOutliers | object | 否 | 異常值偵測 |
| cleaningOptions.filterByRange | object | 否 | 範圍過濾 |

**範例請求（cURL）**:

```bash
curl -X POST http://localhost:3001/api/data/clean \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "upload_1697123456789",
    "cleaningOptions": {
      "handleMissingValues": { "method": "remove" },
      "detectOutliers": {
        "enabled": true,
        "method": "iqr",
        "columns": ["Voltage", "Current"],
        "threshold": 1.5
      }
    }
  }'
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "cleanedDataId": "cleaned_1697123456790",
    "originalRowCount": 195,
    "cleanedRowCount": 188,
    "removedRows": 7,
    "changes": {
      "missingValuesRemoved": 3,
      "outliersRemoved": 4,
      "rangeFiltered": 0
    },
    "statistics": {
      "before": {
        "Voltage": { "mean": 5.15, "std": 0.25, "min": 3.2, "max": 6.8 },
        "Current": { "mean": 0.15, "std": 0.05, "min": 0.10, "max": 0.25 }
      },
      "after": {
        "Voltage": { "mean": 5.18, "std": 0.12, "min": 4.8, "max": 5.5 },
        "Current": { "mean": 0.15, "std": 0.03, "min": 0.12, "max": 0.18 }
      }
    }
  },
  "message": "Data cleaned successfully"
}
```

---

### 4. 建立數據檢視

根據配置建立三種數據檢視（Flattened, Grouped, Hierarchical）。

**端點**: `POST /api/data/views`

**請求格式**: `application/json`

**請求體**:

```json
{
  "dataId": "cleaned_1697123456790",
  "viewConfig": {
    "uniqueIdConfig": {
      "fieldName": "_auto",          // "_auto" 或自訂欄位名稱
      "autoGenerate": true,
      "generationPattern": "{source}_P{index}"
    },
    "numericMetrics": ["Voltage", "Current", "Temperature"],
    "categoricalMetrics": ["Batch_No", "Operator", "Test_Result"],
    "groupFields": ["Batch_No"],
    "primarySort": "Batch_No",
    "secondarySort": "Operator"
  }
}
```

**參數說明**:

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| dataId | string | 是 | 數據 ID（來自清理步驟或上傳步驟） |
| viewConfig | object | 是 | 檢視配置 |
| viewConfig.uniqueIdConfig | object | 否 | 唯一識別碼配置 |
| viewConfig.numericMetrics | string[] | 否 | 數值型指標欄位 |
| viewConfig.categoricalMetrics | string[] | 否 | 字串型指標欄位 |
| viewConfig.groupFields | string[] | 否 | 分組欄位（如未選擇則生成逐筆檢視） |
| viewConfig.primarySort | string | 否 | 主要排序欄位 |
| viewConfig.secondarySort | string | 否 | 次要排序欄位 |

**範例請求（JavaScript）**:

```javascript
const response = await axios.post('/api/data/views', {
  dataId: 'cleaned_1697123456790',
  viewConfig: {
    uniqueIdConfig: {
      fieldName: 'Sample_ID',
      autoGenerate: true,
      generationPattern: 'S{index}'
    },
    numericMetrics: ['Voltage', 'Current', 'Temperature'],
    categoricalMetrics: ['Batch_No', 'Operator', 'Test_Result'],
    groupFields: ['Batch_No'],
    primarySort: 'Batch_No',
    secondarySort: 'Test_Result'
  }
});
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "viewId": "view_1697123456791",
    "views": {
      "flattened": {
        "rowCount": 188,
        "columnCount": 13,
        "columns": ["Point_ID", "Source_File", "Voltage", "Current", ...],
        "sampleRows": [...],
        "appliedSorts": ["Batch_No", "Test_Result"]
      },
      "grouped": {
        "rowCount": 5,
        "columnCount": 15,
        "columns": ["Batch_No", "Voltage_mean", "Voltage_count", "Voltage_min", "Voltage_max", ...],
        "sampleRows": [...]
      }
    },
    "metadata": {
      "numericColumns": ["Voltage", "Current", "Temperature", "Resistance"],
      "categoricalColumns": ["Batch_No", "Operator", "Test_Result"],
      "uniqueIdField": "Sample_ID",
      "primarySort": "Batch_No",
      "secondarySort": "Test_Result"
    }
  },
  "message": "Data views created successfully"
}
```

---

## 分析 API

### 5. 取得圖表推薦

根據數據特性推薦適用的圖表類型。

**端點**: `POST /api/analysis/recommendations`

**請求格式**: `application/json`

**請求體**:

```json
{
  "viewId": "view_1697123456791",
  "selectedColumns": ["Voltage", "Current", "Batch_No"]
}
```

**範例請求（cURL）**:

```bash
curl -X POST http://localhost:3001/api/analysis/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "viewId": "view_1697123456791",
    "selectedColumns": ["Voltage", "Current", "Temperature", "Batch_No"]
  }'
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "scatter",
        "priority": 9,
        "reason": "Correlation analysis: Voltage vs Current",
        "config": {
          "xAxis": "Voltage",
          "yAxis": "Current",
          "groupBy": "Batch_No"
        }
      },
      {
        "type": "line",
        "priority": 7,
        "reason": "Trend analysis: Voltage across Batch_No",
        "config": {
          "xAxis": "Batch_No",
          "yAxis": "Voltage"
        }
      },
      {
        "type": "bar",
        "priority": 6,
        "reason": "Category comparison: Temperature by Batch_No",
        "config": {
          "xAxis": "Batch_No",
          "yAxis": "Temperature"
        }
      }
    ],
    "columnTypes": {
      "Voltage": "numerical",
      "Current": "numerical",
      "Temperature": "numerical",
      "Batch_No": "categorical"
    }
  },
  "message": "Recommendations generated successfully"
}
```

---

### 6. 生成圖表數據

根據圖表配置生成用於繪圖的數據結構。

**端點**: `POST /api/analysis/chart`

**請求格式**: `application/json`

**請求體**:

```json
{
  "viewId": "view_1697123456791",
  "viewType": "flattened",      // "flattened" | "grouped"
  "chartConfig": {
    "type": "scatter",          // "scatter" | "line" | "bar"
    "xAxis": "Voltage",
    "yAxis": "Current",
    "groupBy": "Batch_No",      // 圖例分組（可選）
    "title": "Voltage vs Current Analysis",
    "xLabel": "Voltage (V)",
    "yLabel": "Current (A)"
  }
}
```

**範例請求（JavaScript）**:

```javascript
const response = await axios.post('/api/analysis/chart', {
  viewId: 'view_1697123456791',
  viewType: 'detailed',
  chartConfig: {
    type: 'scatter',
    xAxis: 'Voltage',
    yAxis: 'Current',
    groupBy: 'Batch_No',
    title: 'Voltage vs Current by Batch'
  }
});
```

**成功回應**（散點圖）:

```json
{
  "success": true,
  "data": {
    "chartType": "scatter",
    "plotlyData": [
      {
        "x": [5.2, 5.3, 4.9, 5.1],
        "y": [0.15, 0.16, 0.14, 0.14],
        "mode": "markers",
        "type": "scatter",
        "name": "Batch B001",
        "marker": { "color": "#1f77b4" }
      },
      {
        "x": [5.4, 5.2, 5.3],
        "y": [0.17, 0.15, 0.16],
        "mode": "markers",
        "type": "scatter",
        "name": "Batch B002",
        "marker": { "color": "#ff7f0e" }
      }
    ],
    "layout": {
      "title": "Voltage vs Current Analysis",
      "xaxis": { "title": "Voltage (V)" },
      "yaxis": { "title": "Current (A)" },
      "showlegend": true,
      "legend": { "orientation": "v" }
    }
  },
  "message": "Chart data generated successfully"
}
```

**成功回應**（柱狀圖）:

```json
{
  "success": true,
  "data": {
    "chartType": "bar",
    "chartJsData": {
      "labels": ["B001", "B002", "B003", "B004", "B005"],
      "datasets": [
        {
          "label": "Average Voltage",
          "data": [5.13, 5.23, 5.10, 5.18, 5.05],
          "backgroundColor": "rgba(54, 162, 235, 0.5)",
          "borderColor": "rgba(54, 162, 235, 1)",
          "borderWidth": 1
        }
      ]
    },
    "options": {
      "responsive": true,
      "plugins": {
        "title": { "display": true, "text": "Average Voltage by Batch" }
      },
      "scales": {
        "y": { "beginAtZero": false }
      }
    }
  },
  "message": "Chart data generated successfully"
}
```

---

## 匯出 API

### 7. 匯出數據（統一端點）

匯出完整數據結構為 CSV 或 Excel 格式，包含資料總覽、逐筆數據、分組彙總數據及統計資訊。

**端點**: `POST /api/export/data`

**請求格式**: `application/json`

**參數**:

| 參數名 | 類型 | 必填 | 說明 |
|--------|------|------|------|
| data | Array<Record<string, unknown>> | 是 | 主要數據陣列（通常為 flattenedData） |
| format | 'csv' \| 'xlsx' | 是 | 匯出格式 |
| options | object | 否 | 匯出選項 |
| options.includeStatistics | boolean | 否 | 是否包含統計資訊（預設 true） |
| options.filename | string | 否 | 自訂檔案名稱 |
| options.metadata | BatchViewMetadata | 否 | 批次檢視元資訊 |
| options.flattenedData | Array | 否 | 逐筆數據陣列 |
| options.groupedData | Array | 否 | 分組彙總數據陣列 |
| options.primarySort | string \| null | 否 | 主要排序欄位 |
| options.secondarySort | string \| null | 否 | 次要排序欄位 |

**範例請求（cURL）**:

```bash
curl -X POST http://localhost:3001/api/export/data \
  -H "Content-Type: application/json" \
  -d '{
    "data": [...],
    "format": "xlsx",
    "options": {
      "includeStatistics": true,
      "filename": "analysis_data_202501221530",
      "flattenedData": [...],
      "groupedData": [...],
      "metadata": {...},
      "primarySort": "Batch_No",
      "secondarySort": "Operator"
    }
  }'
```

**範例請求（JavaScript）**:

```javascript
const response = await axios.post('/api/export/data', {
  data: flattenedData,
  format: 'xlsx',
  options: {
    includeStatistics: true,
    filename: 'analysis_data_202501221530',
    metadata: batchViewMetadata,
    flattenedData: flattenedData,
    groupedData: groupedData,
    primarySort: 'Batch_No',
    secondarySort: 'Operator'
  }
});

// 開啟下載連結
const downloadUrl = response.data.data.downloadUrl;
const absoluteUrl = downloadUrl.startsWith('http')
  ? downloadUrl
  : `${API_ORIGIN}${downloadUrl}`;
window.open(absoluteUrl, '_blank');
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "downloadUrl": "/exports/analysis_data_202501221530.xlsx"
  },
  "timestamp": "2025-01-22T15:30:45.123Z"
}
```

**Excel 格式結構**（.xlsx）:

```
Sheet 1: Data Overview
- Batch Count: 3
- Total Flattened Rows: 188
- Total Grouped Points: 5
- Flatten Params: Voltage, Current, Temperature
- Group Params: Batch_No
- Default Metrics: Voltage, Current
- Default Groups: Batch_No, Operator

Sheet 2: Flattened Data - Sorted
- Point_ID, Source_File, Voltage, Current, Temperature, ..., Batch_No, Operator
- (已套用 primarySort 和 secondarySort 排序)
- P001, Batch1, 5.2, 0.15, 25.3, ..., B001, Alice
- P002, Batch1, 5.3, 0.16, 25.5, ..., B001, Alice
- ...

Sheet 3: Grouped Data (如有選擇分組欄位)
- Batch_No, Voltage_mean, Voltage_count, Voltage_min, Voltage_max, ...
- B001, 5.25, 50, 5.0, 5.5, ...
- B002, 5.18, 48, 4.9, 5.4, ...

Sheet 4: Statistics (如 includeStatistics = true)
- Field, Mean, Median, Std, Min, Max, Count
- Voltage, 5.215, 5.20, 0.15, 4.9, 5.5, 188
- Current, 0.155, 0.15, 0.02, 0.10, 0.20, 188
- ...
```

**CSV 格式結構**（.csv）:

```csv
# UTF-8 with BOM 編碼，相容 Excel/Minitab/MATLAB

=== Data Overview ===
Batch Count,3
Total Flattened Rows,188
Total Grouped Points,5
Flatten Params,"Voltage,Current,Temperature"
Group Params,Batch_No

=== Flattened Data - Sorted ===
Point_ID,Source_File,Voltage,Current,Temperature,...,Batch_No,Operator
P001,Batch1,5.2,0.15,25.3,...,B001,Alice
P002,Batch1,5.3,0.16,25.5,...,B001,Alice
...

=== Grouped Data ===
Batch_No,Voltage_mean,Voltage_count,Voltage_min,Voltage_max,...
B001,5.25,50,5.0,5.5,...
B002,5.18,48,4.9,5.4,...

=== Statistics ===
Field,Mean,Median,Std,Min,Max,Count
Voltage,5.215,5.20,0.15,4.9,5.5,188
Current,0.155,0.15,0.02,0.10,0.20,188
...
```

---

### 8. 匯出圖表（前端處理）

圖表匯出功能已改為完全在前端處理，使用 Plotly.js 和 Chart.js 的內建匯出功能。

**Plotly 圖表**（散點圖）:
- 支援格式: PNG, SVG
- 解析度: 可調整 scale 參數
- 背景色: 可自訂

**Chart.js 圖表**（線性圖、柱狀圖）:
- 支援格式: PNG
- 使用 canvas.toBlob() 進行匯出

**前端實作範例**:

```typescript
import { exportChart } from 'utils/chartExport';

// Plotly 圖表匯出
await exportChart(chartRef.current, {
  filename: 'scatter_plot_202501221530',
  format: 'png',
  scale: 2,
  backgroundColor: '#ffffff'
});

// Chart.js 圖表匯出（僅 PNG）
await exportChart(chartRef.current, {
  filename: 'line_chart_202501221530',
  format: 'png',
  scale: 2,
  backgroundColor: '#ffffff'
});
```

**注意**: 由於圖表匯出已移至前端，後端不再提供 `/api/export/chart` 端點。

---

## 錯誤處理

### 錯誤碼列表

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| `INVALID_REQUEST` | 400 | 請求參數無效或缺失 |
| `FILE_TOO_LARGE` | 413 | 檔案大小超過限制（預設 50MB） |
| `UNSUPPORTED_FORMAT` | 400 | 不支援的檔案格式（僅支援 CSV/XLSX） |
| `UPLOAD_NOT_FOUND` | 404 | 上傳 ID 不存在 |
| `VIEW_NOT_FOUND` | 404 | 檢視 ID 不存在 |
| `DATA_PARSING_ERROR` | 400 | 數據解析失敗（CSV/Excel 格式錯誤） |
| `CLEANING_ERROR` | 500 | 數據清理失敗 |
| `EXPORT_ERROR` | 500 | 數據匯出失敗 |
| `CHART_GENERATION_ERROR` | 500 | 圖表生成失敗 |
| `INTERNAL_ERROR` | 500 | 內部伺服器錯誤 |

### 錯誤回應範例

**400 Bad Request - 參數缺失**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required parameter: viewId",
    "details": {
      "missingFields": ["viewId"]
    }
  }
}
```

**404 Not Found - 資源不存在**:

```json
{
  "success": false,
  "error": {
    "code": "VIEW_NOT_FOUND",
    "message": "View with ID 'view_1697123456791' does not exist",
    "details": {
      "viewId": "view_1697123456791"
    }
  }
}
```

**413 Payload Too Large - 檔案過大**:

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds the limit of 50MB",
    "details": {
      "filename": "LargeFile.csv",
      "size": 62914560,
      "limit": 52428800
    }
  }
}
```

**500 Internal Server Error - 內部錯誤**:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred while processing your request",
    "details": {
      "requestId": "req_1697123456793",
      "timestamp": "2024-10-15T10:30:00Z"
    }
  }
}
```

### 錯誤處理最佳實踐

**客戶端錯誤處理範例（JavaScript）**:

```javascript
try {
  const response = await axios.post('/api/data/clean', cleaningConfig);
  console.log('Success:', response.data);
} catch (error) {
  if (error.response) {
    // 伺服器回應錯誤（4xx, 5xx）
    const { code, message, details } = error.response.data.error;

    switch (code) {
      case 'FILE_TOO_LARGE':
        alert(`檔案過大：${details.filename} (${formatBytes(details.size)})`);
        break;
      case 'UPLOAD_NOT_FOUND':
        alert('上傳檔案已過期，請重新上傳');
        break;
      case 'INTERNAL_ERROR':
        console.error('內部錯誤:', details);
        alert('伺服器錯誤，請稍後再試');
        break;
      default:
        alert(message);
    }
  } else if (error.request) {
    // 請求已發送但未收到回應
    alert('網路錯誤，請檢查連線');
  } else {
    // 其他錯誤
    console.error('錯誤:', error.message);
  }
}
```

**Python 錯誤處理範例**:

```python
import requests

try:
    response = requests.post('http://localhost:3001/api/data/clean', json=config)
    response.raise_for_status()
    data = response.json()
    print('Success:', data)
except requests.exceptions.HTTPError as e:
    error = e.response.json()['error']
    print(f"Error {error['code']}: {error['message']}")
except requests.exceptions.ConnectionError:
    print("Network error: Cannot connect to server")
except requests.exceptions.Timeout:
    print("Request timeout")
except Exception as e:
    print(f"Unexpected error: {e}")
```

---

## 使用範例

### 完整工作流程範例（JavaScript）

以下範例展示從上傳到匯出的完整 API 使用流程。

```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:3001/api';

// ========== Step 1: 上傳檔案 ==========
async function uploadFiles(filePaths) {
  const formData = new FormData();

  filePaths.forEach(filePath => {
    formData.append('files', fs.createReadStream(filePath));
  });

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: formData.getHeaders()
  });

  console.log('Upload successful:', response.data);
  return response.data.data.uploadId;
}

// ========== Step 2: 數據清理 ==========
async function cleanData(uploadId) {
  const cleaningConfig = {
    uploadId,
    cleaningOptions: {
      handleMissingValues: { method: 'interpolate' },
      detectOutliers: {
        enabled: true,
        method: 'iqr',
        columns: ['Voltage', 'Current', 'Temperature'],
        threshold: 1.5
      },
      filterByRange: {
        enabled: true,
        rules: [
          { column: 'Voltage', min: 4.5, max: 5.5 },
          { column: 'Temperature', min: 20, max: 30 }
        ]
      }
    }
  };

  const response = await axios.post(`${API_BASE_URL}/data/clean`, cleaningConfig);
  console.log('Cleaning successful:', response.data);
  return response.data.data.cleanedDataId;
}

// ========== Step 3: 建立數據檢視 ==========
async function createViews(dataId) {
  const viewConfig = {
    dataId,
    viewConfig: {
      uniqueIdConfig: {
        fieldName: '_auto',
        autoGenerate: true,
        generationPattern: '{source}_P{index}'
      },
      flattenParams: ['Voltage', 'Current', 'Temperature'],
      groupParams: {
        groupBy: 'Batch_No',
        aggregations: ['mean', 'count', 'min', 'max', 'std']
      },
      hierarchicalParams: {
        primaryGroup: 'Batch_No',
        secondaryGroup: 'Operator'
      }
    }
  };

  const response = await axios.post(`${API_BASE_URL}/data/views`, viewConfig);
  console.log('Views created:', response.data);
  return response.data.data.viewId;
}

// ========== Step 4: 取得圖表推薦 ==========
async function getChartRecommendations(viewId) {
  const response = await axios.post(`${API_BASE_URL}/analysis/recommendations`, {
    viewId,
    selectedColumns: ['Voltage', 'Current', 'Temperature', 'Batch_No']
  });

  console.log('Chart recommendations:', response.data);
  return response.data.data.recommendations;
}

// ========== Step 5: 生成圖表 ==========
async function generateChart(viewId, chartConfig) {
  const response = await axios.post(`${API_BASE_URL}/analysis/chart`, {
    viewId,
    viewType: 'detailed',
    chartConfig
  });

  console.log('Chart generated:', response.data);
  return response.data.data;
}

// ========== Step 6: 匯出數據 ==========
async function exportData(flattenedData, groupedData, metadata, format = 'xlsx') {
  const response = await axios.post(`${API_BASE_URL}/export/data`, {
    data: flattenedData,
    format: format,
    options: {
      includeStatistics: true,
      filename: `analysis_export_${Date.now()}`,
      metadata: metadata,
      flattenedData: flattenedData,
      groupedData: groupedData,
      primarySort: 'Batch_No',
      secondarySort: 'Operator'
    }
  });

  const downloadUrl = response.data.data.downloadUrl;
  const absoluteUrl = downloadUrl.startsWith('http')
    ? downloadUrl
    : `${API_ORIGIN}${downloadUrl}`;

  console.log(`Data export available at: ${absoluteUrl}`);
  return absoluteUrl;
}

// ========== 主函數：執行完整工作流程 ==========
async function main() {
  try {
    // Step 1: 上傳檔案
    console.log('Step 1: Uploading files...');
    const uploadId = await uploadFiles([
      './data/Batch1.csv',
      './data/Batch2.csv',
      './data/Batch3.csv'
    ]);

    // Step 2: 清理數據
    console.log('\nStep 2: Cleaning data...');
    const cleanedDataId = await cleanData(uploadId);

    // Step 3: 建立檢視
    console.log('\nStep 3: Creating data views...');
    const viewId = await createViews(cleanedDataId);

    // Step 4: 取得圖表推薦
    console.log('\nStep 4: Getting chart recommendations...');
    const recommendations = await getChartRecommendations(viewId);

    // Step 5: 生成圖表（使用第一個推薦）
    if (recommendations.length > 0) {
      console.log('\nStep 5: Generating chart...');
      const chartData = await generateChart(viewId, {
        type: recommendations[0].type,
        ...recommendations[0].config,
        title: 'Analysis Chart'
      });
    }

    // Step 6: 匯出數據
    console.log('\nStep 6: Exporting data...');
    const flattenedData = [...]; // 從步驟3取得
    const groupedData = [...]; // 從步驟3取得
    const metadata = {...}; // 從步驟3取得
    await exportData(flattenedData, groupedData, metadata, 'xlsx');

    console.log('\n✓ Workflow completed successfully!');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// 執行主函數
main();
```

---

## 附錄

### API 變更日誌

**v2.0.0**（目前版本 - 2025-01-22）:
- **重大變更**: 重構匯出 API 為統一端點 `POST /api/export/data`
- 新增數值型與字串型指標分類（numericMetrics, categoricalMetrics）
- 新增主要/次要排序支援（primarySort, secondarySort）
- 移除階層式檢視模式（hierarchicalData）
- 圖表匯出功能改為前端處理
- Excel 匯出採用多工作表結構（Data Overview + Flattened Data + Grouped Data + Statistics）
- CSV 匯出使用 UTF-8 with BOM 編碼，採用分段式結構
- 移除 Python 批次分析管線 API

**v1.0.0**（2025-10-14）:
- 初始發佈
- 支援檔案上傳、數據清理、檢視建立
- 支援圖表推薦和生成
- 支援 CSV/Excel 匯出（舊版端點）

**未來計劃**:
- v2.1.0: 新增認證與授權（JWT）
- v2.2.0: 新增即時協作功能（WebSocket）
- v2.3.0: 新增分頁支援
- v3.0.0: API 版本化（/api/v3）

### 常見整合範例

**整合到 React 應用**:

```javascript
// services/apiService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const uploadFiles = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await axios.post(`${API_BASE_URL}/upload`, formData);
  return response.data.data;
};

export const cleanData = async (uploadId, options) => {
  const response = await axios.post(`${API_BASE_URL}/data/clean`, {
    uploadId,
    cleaningOptions: options
  });
  return response.data.data;
};

// 更多 API 函數...
```

**整合到 R**:

```r
library(httr)
library(jsonlite)

API_BASE_URL <- "http://localhost:3001/api"

# 上傳檔案
upload_files <- function(file_paths) {
  response <- POST(
    paste0(API_BASE_URL, "/upload"),
    body = lapply(file_paths, upload_file),
    encode = "multipart"
  )

  content(response, as = "parsed")
}

# 清理數據
clean_data <- function(upload_id, cleaning_options) {
  response <- POST(
    paste0(API_BASE_URL, "/data/clean"),
    body = list(
      uploadId = upload_id,
      cleaningOptions = cleaning_options
    ),
    encode = "json"
  )

  content(response, as = "parsed")
}

# 使用範例
files <- c("Batch1.csv", "Batch2.csv")
upload_result <- upload_files(files)
upload_id <- upload_result$data$uploadId

cleaned_result <- clean_data(upload_id, list(
  handleMissingValues = list(method = "interpolate"),
  detectOutliers = list(
    enabled = TRUE,
    method = "iqr",
    columns = c("Voltage", "Current"),
    threshold = 1.5
  )
))
```

---

**如有任何 API 相關問題，請參考 [ARCHITECTURE.md](ARCHITECTURE.md) 或聯繫專案維護者。**
