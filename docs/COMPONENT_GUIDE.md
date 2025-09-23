# 組件架構指南 (Component Architecture Guide)

> **目標讀者**: Junior programmers, Frontend developers
> **更新日期**: 2025-11-14

## 目錄 (Table of Contents)

1. [組件架構概述](#組件架構概述-architecture-overview)
2. [核心頁面組件](#核心頁面組件-core-page-components)
3. [功能組件](#功能組件-feature-components)
4. [共享組件](#共享組件-shared-components)
5. [工具函數](#工具函數-utility-functions)
6. [組件使用最佳實踐](#組件使用最佳實踐-best-practices)

---

## 組件架構概述 (Architecture Overview)

### 組件層次結構

```
src/
├── pages/                    # 頁面組件 (路由級別)
│   └── AnalysisPage.tsx      # 主分析頁面 (5步驟流程)
├── components/               # 功能組件
│   ├── FileUpload/           # 文件上傳模組
│   ├── DataCleaning/         # 數據清理模組
│   ├── DataTransform/        # 數據轉換模組
│   ├── Charts/               # 圖表模組
│   └── ExportOptions/        # 導出選項模組
├── services/                 # API 服務層
│   └── api.ts                # 後端 API 調用封裝
└── utils/                    # 工具函數
    ├── dataViews.ts          # 數據轉換核心
    ├── chartRecommendations.ts # 圖表推薦邏輯
    └── chartExport.ts        # 圖表導出功能
```

### 組件設計原則

1. **單一職責**: 每個組件只負責一個功能模組
2. **Props驅動**: 組件通過 props 接收數據和配置
3. **狀態提升**: 共享狀態存放在父組件 (AnalysisPage)
4. **類型安全**: 使用 TypeScript 確保類型安全
5. **可復用**: 組件設計考慮可復用性

---

## 核心頁面組件 (Core Page Components)

### AnalysisPage.tsx

**路徑**: `src/pages/AnalysisPage.tsx`

**職責**: 數據分析流程的主編排頁面，管理5步驟工作流。

#### 5步驟流程

```mermaid
graph LR
    A[Step 1: File Upload] --> B[Step 2: Data Cleaning]
    B --> C[Step 3: Data Transform]
    C --> D[Step 4: Data View Selection]
    D --> E[Step 5: Chart Configuration]
```

#### 核心State管理

```typescript
const AnalysisPage = () => {
  // Step 1: 文件上傳
  const [fileId, setFileId] = useState<string | null>(null);
  const [rawData, setRawData] = useState<DataPoint[]>([]);

  // Step 2: 數據清理
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([]);
  const [cleanedData, setCleanedData] = useState<DataPoint[]>([]);

  // Step 3: 數據轉換
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [flattenedData, setFlattenedData] = useState<DataPoint[]>([]);
  const [groupedData, setGroupedData] = useState<DataPoint[]>([]);
  const [metadata, setMetadata] = useState<any>(null);

  // Step 4: 視圖選擇
  const [currentView, setCurrentView] = useState<'flattened' | 'grouped'>('flattened');

  // Step 5: 圖表配置
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  // ... 更多 state
};
```

#### 關鍵useEffect鉤子

```typescript
// 當清理後數據或選擇的指標/分組改變時，重新創建視圖
useEffect(() => {
  if (cleanedData.length === 0 && rawData.length === 0) return;

  const genericRows = cleanedData.length > 0 ? toRecordArray(cleanedData) : toRecordArray(rawData);

  const { flattenedData: flat, groupedData: grouped, metadata: meta } = createDataViews(genericRows, {
    flattenParams: selectedMetrics.length ? selectedMetrics : undefined,
    groupParams: selectedGroups.length ? selectedGroups : undefined,
    categoricalMetrics: selectedCategoricalMetrics,
    columnTypeOverrides: columnTypeOverrides,
    primarySort: primarySort,
    secondarySort: secondarySort,
  });

  setFlattenedData(flat);
  setGroupedData(grouped);
  setMetadata(meta);
}, [cleanedData, rawData, selectedMetrics, selectedGroups, /* ... */]);
```

#### 使用方式

```tsx
// App.tsx 或路由配置
import AnalysisPage from './pages/AnalysisPage';

<Route path="/analysis" element={<AnalysisPage />} />
```

---

## 功能組件 (Feature Components)

### 1. FileUpload 模組

#### FileUploadCard.tsx

**路徑**: `src/components/FileUpload/FileUploadCard.tsx`

**職責**: 提供文件上傳界面，支援拖放和點擊上傳。

**Props**:
```typescript
interface FileUploadCardProps {
  onUploadSuccess: (fileId: string, data: DataPoint[]) => void;
  onUploadError?: (error: string) => void;
}
```

**使用示例**:
```tsx
<FileUploadCard
  onUploadSuccess={(fileId, data) => {
    setFileId(fileId);
    setRawData(data);
    setCurrentStep(2); // 進入下一步
  }}
  onUploadError={(error) => {
    alert(`上傳失敗: ${error}`);
  }}
/>
```

**核心邏輯**:
1. 接受 CSV 和 Excel 文件
2. 調用 `uploadFile(file)` API
3. 成功後調用 `onUploadSuccess` 回調
4. 顯示前 100 行預覽數據

---

### 2. DataCleaning 模組

#### DataCleaningConfig.tsx

**路徑**: `src/components/DataCleaning/DataCleaningConfig.tsx`

**職責**: 提供數據清理規則配置界面，包含預覽功能。

**Props**:
```typescript
interface DataCleaningConfigProps {
  data: Array<Record<string, unknown>>;  // 原始數據
  onApply: (cleanedData: DataPoint[]) => void;  // 應用清理後回調
  onCancel?: () => void;  // 取消回調
}
```

**核心功能**:
- 為每個數值型欄位配置清理規則
- 實時預覽清理效果
- 顯示清理統計 (保留率、移除行數等)
- 查看被移除的行及其原因

**清理規則配置**:
```typescript
// 單個規則配置界面
<Grid container spacing={2}>
  {/* 欄位選擇 */}
  <TextField select label="欄位" value={rule.field} />

  {/* 數值範圍 */}
  <TextField label="最小值" type="number" value={rule.minValue} />
  <TextField label="最大值" type="number" value={rule.maxValue} />

  {/* 異常值檢測 */}
  <Checkbox label="移除異常值" checked={rule.removeOutliers} />
  <Select label="檢測方法" value={rule.outlierMethod}>
    <MenuItem value="iqr">IQR (四分位距)</MenuItem>
    <MenuItem value="zscore">Z-Score (標準分數)</MenuItem>
  </Select>

  {/* 缺失值處理 */}
  <Select label="缺失值處理" value={rule.handleMissing}>
    <MenuItem value="skip">跳過</MenuItem>
    <MenuItem value="remove">刪除</MenuItem>
    <MenuItem value="default">使用默認值</MenuItem>
  </Select>
</Grid>
```

**使用示例**:
```tsx
<DataCleaningConfig
  data={rawData}
  onApply={(cleanedData) => {
    setCleanedData(cleanedData);
    setCurrentStep(3); // 進入數據轉換步驟
  }}
  onCancel={() => setCurrentStep(1)}
/>
```

---

### 3. DataTransform 模組

#### DataTransformConfig.tsx

**路徑**: `src/components/DataTransform/DataTransformConfig.tsx`

**職責**: 配置數據轉換選項（指標展開、分組等）。

**Props**:
```typescript
interface DataTransformConfigProps {
  availableMetrics: string[];  // 可用的統計欄位
  availableGroups: string[];   // 可用的分組欄位
  selectedMetrics: string[];   // 已選擇的指標
  selectedGroups: string[];    // 已選擇的分組
  onMetricsChange: (metrics: string[]) => void;
  onGroupsChange: (groups: string[]) => void;
}
```

**使用示例**:
```tsx
<DataTransformConfig
  availableMetrics={['Voltage_stat', 'Current_stat', 'Temperature_stat']}
  availableGroups={['Batch_No', 'Point_ID']}
  selectedMetrics={selectedMetrics}
  selectedGroups={selectedGroups}
  onMetricsChange={setSelectedMetrics}
  onGroupsChange={setSelectedGroups}
/>
```

---

### 4. Charts 模組

#### ChartRenderer.tsx

**路徑**: `src/components/Charts/ChartRenderer.tsx`

**職責**: 根據圖表配置調度相應的圖表引擎進行渲染。

**Props**:
```typescript
interface ChartRendererProps {
  data: Array<Record<string, unknown>>;  // 圖表數據
  config: ChartConfig;  // 圖表配置
  loading?: boolean;    // 加載狀態
  error?: string;       // 錯誤訊息
  width?: number;       // 圖表寬度
  height?: number;      // 圖表高度
}
```

**支援的圖表類型**:
- **bar** (柱狀圖): 使用 Chart.js 渲染
- **scatter** (散點圖): 使用 Plotly.js 渲染

**使用示例**:
```tsx
const chartRef = useRef();

<ChartRenderer
  ref={chartRef}
  data={activeChartData}
  config={{
    type: 'bar',
    xAxis: 'Batch_No',
    yAxis: ['Voltage_mean', 'Current_mean'],
    title: '各批次平均電壓和電流'
  }}
  width={800}
  height={400}
/>

// 導出圖表
const exportChart = () => {
  if (chartRef.current) {
    exportChartAsPNG(chartRef.current, 'my-chart.png');
  }
};
```

#### BasicCharts.tsx

**路徑**: `src/components/Charts/BasicCharts.tsx`

**職責**: 使用 Chart.js 渲染基礎圖表（柱狀圖）。

**特點**:
- 輕量、快速
- 適合簡單的統計圖表
- 支援多Y軸顯示

#### AdvancedCharts.tsx

**路徑**: `src/components/Charts/AdvancedCharts.tsx`

**職責**: 使用 Plotly.js 渲染進階圖表（散點圖）。

**特點**:
- 強大的交互功能 (縮放、平移、懸停)
- 支援分組顯示
- 適合復雜數據可視化

---

### 5. ExportOptions 模組

#### ExportOptions.tsx

**路徑**: `src/components/ExportOptions/ExportOptions.tsx`

**職責**: 提供數據和圖表導出選項界面。

**Props**:
```typescript
interface ExportOptionsProps {
  data: Array<Record<string, unknown>>;
  flattenedData?: Array<Record<string, unknown>>;
  groupedData?: Array<Record<string, unknown>>;
  metadata?: any;
  chartRef?: React.RefObject<any>;
  onExportComplete?: () => void;
}
```

**導出選項**:
- **數據導出**: CSV 或 Excel 格式
  - 包含統計信息
  - 自定義文件名
  - 包含元數據
- **圖表導出**: PNG 或 SVG 格式
  - 自定義分辨率
  - 自定義文件名

**使用示例**:
```tsx
<ExportOptions
  data={activeChartData}
  flattenedData={flattenedData}
  groupedData={groupedData}
  metadata={metadata}
  chartRef={chartRef}
  onExportComplete={() => {
    alert('導出成功！');
  }}
/>
```

---

## 共享組件 (Shared Components)

### LoadingSpinner

**用途**: 顯示加載動畫

```tsx
import { CircularProgress, Box } from '@mui/material';

<Box display="flex" justifyContent="center" my={4}>
  <CircularProgress />
</Box>
```

### ErrorAlert

**用途**: 顯示錯誤訊息

```tsx
import { Alert } from '@mui/material';

<Alert severity="error">
  {errorMessage}
</Alert>
```

---

## 工具函數 (Utility Functions)

### dataViews.ts

**核心函數**: `createDataViews()`

**功能**: 數據轉換引擎，執行 8 大處理步驟。

**使用示例**:
```typescript
import { createDataViews } from '@/utils/dataViews';

const { flattenedData, groupedData, metadata } = createDataViews(cleanedData, {
  flattenParams: ['Voltage_stat', 'Current_stat'],
  groupParams: ['Batch_No'],
  categoricalMetrics: ['Batch_No'],
  columnTypeOverrides: {},
  primarySort: 'Batch_No',
  secondarySort: null
});
```

**參考**: 詳見 [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md#數據轉換階段詳細流程)

---

### chartRecommendations.ts

**核心函數**: `getChartRecommendations()`

**功能**: 根據數據特徵智能推薦圖表類型。

**使用示例**:
```typescript
import { getChartRecommendations } from '@/utils/chartRecommendations';

const recommendations = getChartRecommendations(
  activeChartData,
  metadata,
  currentView  // 'flattened' or 'grouped'
);

// recommendations = [
//   {
//     type: 'bar',
//     priority: 5,
//     reason: '柱狀圖最適合比較各組的聚合指標',
//     suggestedConfig: { xAxis: 'Batch_No', yAxis: ['Voltage_mean', 'Current_mean'] }
//   },
//   ...
// ]
```

**推薦邏輯**:
- **分組視圖**: 優先推薦柱狀圖 (priority 5)
- **彙整視圖**: 優先推薦散點圖 (priority 5)

---

### chartExport.ts

**核心函數**: `exportChartAsPNG()`, `exportChartAsSVG()`

**功能**: 將圖表導出為圖片文件。

**使用示例**:
```typescript
import { exportChartAsPNG } from '@/utils/chartExport';

const handleExport = () => {
  if (chartRef.current) {
    exportChartAsPNG(chartRef.current, 'battery_analysis.png');
  }
};
```

---

## 組件使用最佳實踐 (Best Practices)

### 1. Props 命名規範

```typescript
// ✅ 好的命名
interface MyComponentProps {
  data: DataPoint[];           // 清晰的數據類型
  onSubmit: (data: DataPoint[]) => void;  // 回調函數使用 'on' 前綴
  isLoading?: boolean;         // 布爾值使用 'is' 前綴
  errorMessage?: string;       // 可選 props 使用 '?'
}

// ❌ 避免的命名
interface MyComponentProps {
  d: any;                      // 不清晰的縮寫
  submit: Function;            // 缺少類型定義
  loading: boolean;            // 缺少 'is' 前綴
}
```

### 2. State 管理原則

```typescript
// ✅ 狀態提升到父組件
const AnalysisPage = () => {
  const [cleanedData, setCleanedData] = useState<DataPoint[]>([]);

  return (
    <DataCleaningConfig
      data={rawData}
      onApply={setCleanedData}  // 父組件管理狀態
    />
  );
};

// ❌ 避免在子組件維護全局狀態
const DataCleaningConfig = () => {
  const [cleanedData, setCleanedData] = useState([]);  // 不要這樣做
  // ...
};
```

### 3. useEffect 依賴項

```typescript
// ✅ 正確的依賴項
useEffect(() => {
  if (cleanedData.length > 0) {
    processData();
  }
}, [cleanedData]);  // 只依賴實際使用的狀態

// ❌ 避免缺少依賴項或過多依賴項
useEffect(() => {
  processData();
}, []);  // 缺少 cleanedData 依賴，可能導致陳舊閉包問題
```

### 4. 錯誤處理

```typescript
// ✅ 完整的錯誤處理
const handleUpload = async (file: File) => {
  try {
    setLoading(true);
    setError(null);
    const result = await uploadFile(file);
    setFileId(result.data.fileId);
  } catch (error) {
    setError(error instanceof Error ? error.message : '未知錯誤');
  } finally {
    setLoading(false);
  }
};

// ❌ 缺少錯誤處理
const handleUpload = async (file: File) => {
  const result = await uploadFile(file);  // 可能拋出錯誤
  setFileId(result.data.fileId);
};
```

### 5. 類型安全

```typescript
// ✅ 使用明確的類型
import { DataPoint, CleaningRule } from '@/types';

const processRules = (rules: CleaningRule[]): DataPoint[] => {
  // TypeScript 會檢查類型
};

// ❌ 避免使用 any
const processRules = (rules: any): any => {
  // 失去類型檢查
};
```

### 6. 組件拆分

```typescript
// ✅ 拆分為小組件
const DataCleaningConfig = () => {
  return (
    <>
      <RuleList rules={rules} onUpdate={updateRules} />
      <PreviewPanel preview={preview} />
      <ActionButtons onApply={handleApply} onCancel={handleCancel} />
    </>
  );
};

// ❌ 單一大組件
const DataCleaningConfig = () => {
  return (
    <div>
      {/* 500 行 JSX 代碼 */}
    </div>
  );
};
```

---

## 組件開發Checklist

### 創建新組件時檢查：

- [ ] **類型定義**: Props 和 State 都有明確的 TypeScript 類型
- [ ] **JSDoc 註解**: 添加組件說明和 Props 文檔
- [ ] **錯誤處理**: 處理可能的錯誤情況
- [ ] **加載狀態**: 顯示加載動畫
- [ ] **空狀態**: 處理無數據情況
- [ ] **可訪問性**: 添加適當的 ARIA 標籤
- [ ] **響應式**: 適配不同屏幕尺寸
- [ ] **測試**: 編寫基本的單元測試（如果適用）

---

## 總結 (Summary)

### 核心組件層次

1. **AnalysisPage** - 主編排頁面
2. **功能模組** - FileUpload, DataCleaning, DataTransform, Charts, ExportOptions
3. **工具函數** - dataViews, chartRecommendations, chartExport
4. **API 層** - api.ts 封裝所有後端調用

### 組件通信模式

- **Props Down**: 父組件通過 props 傳遞數據給子組件
- **Events Up**: 子組件通過回調函數向父組件傳遞事件
- **State Lifting**: 共享狀態提升到共同的父組件

### 延伸閱讀

- [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md) - 數據流向指南
- [COMMON_TASKS.md](./COMMON_TASKS.md) - 常見開發任務
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南
