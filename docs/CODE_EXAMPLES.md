# 代碼範例集 (Code Examples)

> 本文檔提供常見開發任務的完整代碼範例，幫助快速上手專案開發。

> 💡 **提示**：所有範例都是可運行的真實代碼，包含完整的 imports 和類型定義。

---

## ⚠️ 重要概念澄清

### 核心數據格式：flattenedData vs groupedData

在開始閱讀代碼範例前，請務必理解專案中兩種核心數據格式的差異和用途：

#### 1. **Flattened Data (扁平化數據)**
```typescript
// 保留所有原始記錄
const flattenedData = [
  { Source_File: 'data.csv', Point_ID: 'P1', Batch: 'A', Voltage: 3.3 },
  { Source_File: 'data.csv', Point_ID: 'P2', Batch: 'A', Voltage: 3.5 },
  { Source_File: 'data.csv', Point_ID: 'P3', Batch: 'B', Voltage: 3.2 },
];
```

**特性：**
- ✅ 保留所有原始記錄
- ✅ 僅包含選定的欄位（metrics + groups）
- ✅ 支持主要/次要排序

**主要用途：**
- **圖表渲染** - 傳遞給 `ChartRenderer` 組件
- **UI 顯示** - 數據預覽表格
- **詳細分析** - 需要查看每筆原始記錄的場景

**為什麼圖表使用 flattenedData？**
圖表需要顯示原始數據點、趨勢線、分布情況，而不是預先計算的平均值。例如散點圖需要繪製每個數據點，折線圖需要連接所有原始點。

#### 2. **Grouped Statistics (分組統計數據)**
```typescript
// 聚合統計結果
const groupedData = [
  {
    Batch: 'A',
    Voltage_stat_mean: 3.4,
    Voltage_stat_min: 3.3,
    Voltage_stat_max: 3.5,
    Voltage_stat_count: 2,
    Voltage_stat_sum: 6.8,
  },
  {
    Batch: 'B',
    Voltage_stat_mean: 3.2,
    Voltage_stat_min: 3.2,
    Voltage_stat_max: 3.2,
    Voltage_stat_count: 1,
    Voltage_stat_sum: 3.2,
  },
];
```

**特性：**
- ✅ 按分組欄位（groups）聚合數據
- ✅ 生成帶有 `_stat_*` 後綴的統計欄位
- ✅ 計算 mean, min, max, count, sum 五種統計指標

**主要用途：**
- **Excel/CSV 匯出** - "Grouped Statistics" sheet
- **統計報告** - 匯總數據展示
- **數據分析** - 需要聚合結果的場景

**為什麼不用於圖表？**
groupedData 只包含預先計算的平均值和統計指標，缺少原始數據點，無法繪製趨勢線或散點圖。

#### 數據流向示意

```
原始數據 (rawData)
    ↓
createDataViews()
    ↓
    ├─→ flattenedData ──→ ChartRenderer ──→ 圖表顯示
    │
    └─→ groupedData ───→ ExportService ──→ Excel/CSV 匯出
```

#### 實際使用範例

**正確：圖表渲染使用 flattenedData**
```typescript
// ✅ 正確
<ChartRenderer
  data={flattenedData}  // 使用扁平化數據
  config={chartConfig}
/>
```

**錯誤：圖表渲染不應使用 groupedData**
```typescript
// ❌ 錯誤 - 會導致圖表只顯示聚合結果，失去原始數據點
<ChartRenderer
  data={groupedData}  // 不應該使用分組統計數據
  config={chartConfig}
/>
```

**正確：數據匯出包含兩種格式**
```typescript
// ✅ 正確
await exportData({
  format: 'excel',
  flattenedData,    // "Detailed Data" sheet
  groupedData,      // "Grouped Statistics" sheet
  metadata,
});
```

#### 關鍵點總結

| 特性 | Flattened Data | Grouped Statistics |
|------|----------------|-------------------|
| **記錄數量** | 保留所有原始記錄 | 依分組數量而定 |
| **欄位格式** | 原始欄位名 | 帶 `_stat_*` 後綴 |
| **用於圖表** | ✅ 是 | ❌ 否 |
| **用於匯出** | ✅ 是（詳細數據） | ✅ 是（統計摘要） |
| **生成函數** | `buildFlattenedData()` | `buildGroupedData()` |
| **文件位置** | `frontend/src/utils/dataViews.ts:296` | `frontend/src/utils/dataViews.ts:403` |

#### 相關文件參考

- **核心邏輯：** `frontend/src/utils/dataViews.ts`
- **使用示例：** `frontend/src/pages/AnalysisPage.tsx`
- **架構說明：** `docs/ARCHITECTURE_DIAGRAMS.md` → 5.3 數據格式對比

---

## 📋 目錄

1. [添加新的 API 端點](#1-添加新的-api-端點)
2. [創建新的 React 頁面](#2-創建新的-react-頁面)
3. [添加新的圖表類型](#3-添加新的圖表類型)
4. [實現新的清洗規則](#4-實現新的清洗規則)
5. [使用 Context 管理狀態](#5-使用-context-管理狀態)
6. [添加 WebSocket 事件](#6-添加-websocket-事件)
7. [創建自定義 Hook](#7-創建自定義-hook)
8. [數據導出功能](#8-數據導出功能)
9. [錯誤處理最佳實踐](#9-錯誤處理最佳實踐)
10. [性能優化技巧](#10-性能優化技巧)

---

## 1. 添加新的 API 端點

### 需求
> 添加一個 API 端點來獲取數據統計信息：計算平均值、最大值、最小值

### Step 1: 定義共享類型

**文件：** `shared/types/index.ts`

```typescript
// 添加新的統計數據類型
export interface DataStatistics {
  columnName: string;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  count: number;
  nullCount: number;
}

export interface StatisticsResponse {
  fileId: string;
  statistics: DataStatistics[];
  totalRows: number;
  timestamp: string;
}
```

### Step 2: 創建 Service 層

**文件：** `backend/src/services/statisticsService.ts`

```typescript
import { DataStatistics } from '../../shared/types';

/**
 * Calculate statistics for numeric columns
 * 計算數值欄位的統計指標
 */
export const calculateStatistics = (
  data: Array<Record<string, unknown>>,
  numericColumns: string[]
): DataStatistics[] => {
  return numericColumns.map((columnName) => {
    // 提取該欄位的所有數值
    const values: number[] = [];
    let nullCount = 0;

    data.forEach((row) => {
      const value = row[columnName];
      if (value === null || value === undefined) {
        nullCount++;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        values.push(value);
      }
    });

    // 計算統計指標
    if (values.length === 0) {
      return {
        columnName,
        mean: null,
        median: null,
        min: null,
        max: null,
        count: 0,
        nullCount,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      columnName,
      mean,
      median,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      nullCount,
    };
  });
};
```

### Step 3: 創建 Controller

**文件：** `backend/src/controllers/statisticsController.ts`

```typescript
import { Request, Response } from 'express';
import { calculateStatistics } from '../services/statisticsService';
import { getUploadedFileData } from '../utils/fileStorage';
import { StatisticsResponse } from '../../shared/types';

/**
 * GET /api/statistics/:fileId
 * 獲取文件的統計信息
 */
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // 1. 獲取文件數據
    const fileData = await getUploadedFileData(fileId);
    if (!fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 2. 識別數值欄位
    const firstRow = fileData.data[0];
    const numericColumns = Object.keys(firstRow).filter((key) => {
      const value = firstRow[key];
      return typeof value === 'number' && Number.isFinite(value);
    });

    // 3. 計算統計
    const statistics = calculateStatistics(fileData.data, numericColumns);

    // 4. 構建響應
    const response: StatisticsResponse = {
      fileId,
      statistics,
      totalRows: fileData.data.length,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Statistics] Error:', error);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
};
```

### Step 4: 註冊路由

**文件：** `backend/src/routes/statisticsRoutes.ts`

```typescript
import express from 'express';
import { getStatistics } from '../controllers/statisticsController';

const router = express.Router();

// GET /api/statistics/:fileId
router.get('/:fileId', getStatistics);

export default router;
```

**文件：** `backend/src/index.ts`

```typescript
// 添加 import
import statisticsRoutes from './routes/statisticsRoutes';

// 註冊路由（在其他路由後面）
app.use('/api/statistics', statisticsRoutes);
```

### Step 5: 前端 API 調用

**文件：** `frontend/src/services/api.ts`

```typescript
import { StatisticsResponse } from '../../shared/types';

/**
 * Get statistics for a data file
 * 獲取數據文件的統計信息
 */
export const getFileStatistics = async (
  fileId: string
): Promise<StatisticsResponse> => {
  const response = await axios.get<StatisticsResponse>(
    `/api/statistics/${fileId}`
  );
  return response.data;
};
```

### Step 6: 在組件中使用

**文件：** `frontend/src/components/Statistics/StatisticsPanel.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { getFileStatistics } from '../../services/api';
import { StatisticsResponse } from '../../types';

interface StatisticsPanelProps {
  fileId: string;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ fileId }) => {
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await getFileStatistics(fileId);
        setStats(data);
      } catch (err) {
        setError('Failed to load statistics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [fileId]);

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  return (
    <div>
      <h3>Data Statistics ({stats.totalRows} rows)</h3>
      {stats.statistics.map((stat) => (
        <div key={stat.columnName}>
          <h4>{stat.columnName}</h4>
          <p>Mean: {stat.mean?.toFixed(2)}</p>
          <p>Median: {stat.median?.toFixed(2)}</p>
          <p>Min: {stat.min?.toFixed(2)}</p>
          <p>Max: {stat.max?.toFixed(2)}</p>
          <p>Count: {stat.count} (Nulls: {stat.nullCount})</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 2. 創建新的 React 頁面

### 需求
> 創建一個 Settings 頁面，讓用戶配置偏好設置

### Step 1: 創建頁面組件

**文件：** `frontend/src/pages/SettingsPage.tsx`

```typescript
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
} from '@mui/material';

/**
 * Settings Page Component
 * 設置頁面組件
 *
 * Allows users to configure application preferences
 */
const SettingsPage: React.FC = () => {
  // State for settings
  const [settings, setSettings] = useState({
    darkMode: false,
    autoSave: true,
    maxFileSize: 50, // MB
    defaultChartType: 'scatter' as const,
    notifications: true,
  });

  const [saveMessage, setSaveMessage] = useState('');

  // Handle toggle switches
  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle number inputs
  const handleNumberChange = (key: keyof typeof settings, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setSettings((prev) => ({
        ...prev,
        [key]: numValue,
      }));
    }
  };

  // Save settings
  const handleSave = () => {
    // TODO: Save to localStorage or backend
    localStorage.setItem('userSettings', JSON.stringify(settings));
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings 設置
        </Typography>

        <Paper sx={{ p: 3, mt: 3 }}>
          {/* Appearance Section */}
          <Typography variant="h6" gutterBottom>
            Appearance 外觀
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.darkMode}
                onChange={() => handleToggle('darkMode')}
              />
            }
            label="Dark Mode 深色模式"
          />

          <Divider sx={{ my: 3 }} />

          {/* Data Processing Section */}
          <Typography variant="h6" gutterBottom>
            Data Processing 數據處理
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSave}
                onChange={() => handleToggle('autoSave')}
              />
            }
            label="Auto-save 自動儲存"
          />

          <Box sx={{ mt: 2 }}>
            <TextField
              label="Max File Size (MB) 最大文件大小"
              type="number"
              value={settings.maxFileSize}
              onChange={(e) => handleNumberChange('maxFileSize', e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              fullWidth
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Notifications Section */}
          <Typography variant="h6" gutterBottom>
            Notifications 通知
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications}
                onChange={() => handleToggle('notifications')}
              />
            }
            label="Enable Notifications 啟用通知"
          />

          {/* Save Button */}
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save Settings 儲存設置
            </Button>
          </Box>

          {/* Success Message */}
          {saveMessage && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {saveMessage}
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default SettingsPage;
```

### Step 2: 添加路由

**文件：** `frontend/src/App.tsx`

```typescript
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SettingsPage from './pages/SettingsPage';
// ... other imports

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnalysisPage />} />
        <Route path="/settings" element={<SettingsPage />} />  {/* 新增路由 */}
        {/* ... other routes */}
      </Routes>
    </Router>
  );
}
```

### Step 3: 添加導航連結

**文件：** `frontend/src/components/Layout/Layout.tsx`

```typescript
import { Link } from 'react-router-dom';
import { IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

// 在導航欄中添加設置圖標
<IconButton component={Link} to="/settings" color="inherit">
  <SettingsIcon />
</IconButton>
```

---

## 3. 添加新的圖表類型

### 需求
> 添加餅圖 (Pie Chart) 支持，用於顯示分類數據的占比

### Step 1: 更新類型定義

**文件：** `shared/types/index.ts`

```typescript
// 更新 ChartType
export type ChartType = 'scatter' | 'line' | 'bar' | 'pie';  // 添加 'pie'

// 添加餅圖特定配置
export interface PieChartConfig extends ChartConfig {
  type: 'pie';
  valueField: string;    // 數值欄位
  labelField: string;    // 標籤欄位
  showPercentage: boolean;
}
```

### Step 2: 創建餅圖組件

**文件：** `frontend/src/components/Charts/PieChart.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { PieChartConfig } from '../../types';

interface PieChartProps {
  data: Array<Record<string, unknown>>;
  config: PieChartConfig;
}

/**
 * Pie Chart Component using Chart.js
 * 餅圖組件，使用 Chart.js
 *
 * Displays categorical data as pie slices
 */
export const PieChart: React.FC<PieChartProps> = ({ data, config }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // 清理舊圖表
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 聚合數據：計算每個標籤的總和
    const aggregated = new Map<string, number>();
    data.forEach((row) => {
      const label = String(row[config.labelField] || 'Unknown');
      const value = Number(row[config.valueField]) || 0;
      aggregated.set(label, (aggregated.get(label) || 0) + value);
    });

    // 轉換為 Chart.js 格式
    const labels = Array.from(aggregated.keys());
    const values = Array.from(aggregated.values());

    // 生成顏色
    const colors = labels.map((_, i) => {
      const hue = (i * 360) / labels.length;
      return `hsl(${hue}, 70%, 60%)`;
    });

    // 創建圖表
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = values.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);

                  if (config.showPercentage) {
                    return `${label}: ${value.toFixed(2)} (${percentage}%)`;
                  }
                  return `${label}: ${value.toFixed(2)}`;
                },
              },
            },
          },
        },
      });
    }

    // 清理函數
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, config]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <canvas ref={chartRef} />
    </div>
  );
};

export default PieChart;
```

### Step 3: 整合到 ChartRenderer

**文件：** `frontend/src/components/Charts/ChartRenderer.tsx`

```typescript
import PieChart from './PieChart';
// ... other imports

const ChartRenderer: React.FC<ChartRendererProps> = ({ data, config }) => {
  // ... existing code

  // 添加餅圖分支
  if (config.type === 'pie') {
    return <PieChart data={data} config={config as PieChartConfig} />;
  }

  // ... other chart types
};
```

### Step 4: 更新 ChartTypeSelector

**文件：** `frontend/src/components/Charts/ChartTypeSelector.tsx`

```typescript
// 添加餅圖選項
const chartTypes = [
  { value: 'scatter', label: '散點圖 Scatter' },
  { value: 'line', label: '折線圖 Line' },
  { value: 'bar', label: '條形圖 Bar' },
  { value: 'pie', label: '餅圖 Pie' },  // 新增
];

// 添加餅圖特定的配置 UI
{chartType === 'pie' && (
  <>
    <FormControl fullWidth>
      <InputLabel>Value Field 數值欄位</InputLabel>
      <Select
        value={config.valueField || ''}
        onChange={(e) => setConfig({ ...config, valueField: e.target.value })}
      >
        {numericFields.map((field) => (
          <MenuItem key={field} value={field}>{field}</MenuItem>
        ))}
      </Select>
    </FormControl>

    <FormControl fullWidth>
      <InputLabel>Label Field 標籤欄位</InputLabel>
      <Select
        value={config.labelField || ''}
        onChange={(e) => setConfig({ ...config, labelField: e.target.value })}
      >
        {categoricalFields.map((field) => (
          <MenuItem key={field} value={field}>{field}</MenuItem>
        ))}
      </Select>
    </FormControl>

    <FormControlLabel
      control={
        <Switch
          checked={config.showPercentage || false}
          onChange={(e) => setConfig({ ...config, showPercentage: e.target.checked })}
        />
      }
      label="Show Percentage 顯示百分比"
    />
  </>
)}
```

### Step 5: 更新圖表推薦邏輯

**文件：** `frontend/src/utils/chartRecommendations.ts`

```typescript
/**
 * Recommend chart type based on data characteristics
 * 根據數據特性推薦圖表類型
 */
export const recommendChartType = (
  metadata: BatchViewMetadata
): ChartType => {
  const { columnTypes, flattenedRowCount } = metadata;
  const numericCount = columnTypes.numeric.length;
  const categoricalCount = columnTypes.categorical.length;

  // 如果只有一個數值欄位和一個分類欄位，且記錄數少於 20，推薦餅圖
  if (numericCount >= 1 && categoricalCount >= 1 && flattenedRowCount < 20) {
    return 'pie';
  }

  // ... existing recommendation logic

  return 'scatter';  // default
};
```

---

## 4. 實現新的清洗規則

### 需求
> 添加一個清洗規則：標準化文本（轉小寫、去除空格）

### Step 1: 更新類型

**文件：** `shared/types/index.ts`

```typescript
export interface CleaningRule {
  type: 'removeEmpty' | 'interpolate' | 'fillDefault' | 'removeOutliers' | 'normalizeText';  // 添加新類型
  column?: string;
  value?: string | number;
  method?: 'lowercase' | 'uppercase' | 'trim' | 'all';  // 標準化方法
  // ... existing fields
}
```

### Step 2: 實現後端邏輯

**文件：** `backend/src/services/dataCleaningService.ts`

```typescript
/**
 * Apply a single cleaning rule to data
 * 應用單一清洗規則
 */
const applySingleRule = (
  data: Array<Record<string, unknown>>,
  rule: CleaningRule
): Array<Record<string, unknown>> => {
  const cleanedData = JSON.parse(JSON.stringify(data)); // Deep clone

  switch (rule.type) {
    // ... existing cases

    case 'normalizeText':
      if (rule.column) {
        cleanedData.forEach((row: any) => {
          const value = row[rule.column!];
          if (typeof value === 'string') {
            let normalized = value;

            switch (rule.method) {
              case 'lowercase':
                normalized = normalized.toLowerCase();
                break;
              case 'uppercase':
                normalized = normalized.toUpperCase();
                break;
              case 'trim':
                normalized = normalized.trim();
                break;
              case 'all':
              default:
                // 全部：轉小寫 + 去除前後空格 + 去除多餘空格
                normalized = normalized
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ');  // 將多個空格替換為單個空格
                break;
            }

            row[rule.column!] = normalized;
          }
        });
      }
      break;

    default:
      console.warn(`Unknown cleaning rule type: ${rule.type}`);
  }

  return cleanedData;
};
```

### Step 3: 前端 UI

**文件：** `frontend/src/components/DataCleaning/DataCleaningConfig.tsx`

```typescript
// 添加規則類型選項
<MenuItem value="normalizeText">標準化文本 Normalize Text</MenuItem>

// 添加方法選擇 UI（當規則類型為 normalizeText 時顯示）
{rule.type === 'normalizeText' && (
  <FormControl fullWidth>
    <InputLabel>Normalization Method 標準化方法</InputLabel>
    <Select
      value={rule.method || 'all'}
      onChange={(e) => updateRule(index, { method: e.target.value as any })}
    >
      <MenuItem value="lowercase">轉小寫 Lowercase</MenuItem>
      <MenuItem value="uppercase">轉大寫 Uppercase</MenuItem>
      <MenuItem value="trim">去除空格 Trim</MenuItem>
      <MenuItem value="all">全部 All (推薦)</MenuItem>
    </Select>
  </FormControl>
)}
```

---

## 5. 使用 Context 管理狀態

### 需求
> 創建一個 SettingsContext 來管理全局設置

### 完整範例

**文件：** `frontend/src/contexts/SettingsContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Settings type definition
 * 設置類型定義
 */
interface Settings {
  darkMode: boolean;
  autoSave: boolean;
  maxFileSize: number;  // MB
  defaultChartType: 'scatter' | 'line' | 'bar' | 'pie';
  language: 'zh-TW' | 'en';
}

/**
 * Settings Context type
 * 設置 Context 類型
 */
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

/**
 * Default settings
 * 預設設置
 */
const defaultSettings: Settings = {
  darkMode: false,
  autoSave: true,
  maxFileSize: 50,
  defaultChartType: 'scatter',
  language: 'zh-TW',
};

// Create Context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Settings Provider Component
 * 設置提供者組件
 *
 * Manages application-wide settings with localStorage persistence
 */
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('appSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse stored settings:', error);
      }
    }
  }, []);

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  /**
   * Update settings (partial update)
   * 更新設置（部分更新）
   */
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  /**
   * Reset settings to defaults
   * 重置設置為預設值
   */
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('appSettings');
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Custom hook to use Settings Context
 * 使用設置 Context 的自定義 Hook
 *
 * @throws Error if used outside SettingsProvider
 */
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
```

### 使用範例

**在 App.tsx 中包裹 Provider:**

```typescript
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      <UserProvider>
        <Router>
          {/* ... */}
        </Router>
      </UserProvider>
    </SettingsProvider>
  );
}
```

**在組件中使用:**

```typescript
import { useSettings } from '../contexts/SettingsContext';

const MyComponent: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const handleToggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  return (
    <div>
      <p>Dark Mode: {settings.darkMode ? 'ON' : 'OFF'}</p>
      <button onClick={handleToggleDarkMode}>Toggle</button>
    </div>
  );
};
```

---

## 6. 添加 WebSocket 事件

### 需求
> 添加一個 WebSocket 事件：當用戶添加註解時通知其他用戶

### Step 1: 更新類型

**文件：** `shared/types/index.ts`

```typescript
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  targetId?: string;  // 註解目標（如特定數據點）
}
```

### Step 2: 後端 WebSocket Handler

**文件：** `backend/src/handlers/socketHandlers.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { Comment } from '../../shared/types';

/**
 * Handle comment-related WebSocket events
 * 處理註解相關的 WebSocket 事件
 */
export const handleCommentEvents = (io: Server, socket: Socket) => {
  /**
   * User adds a new comment
   * 用戶添加新註解
   */
  socket.on('addComment', (data: { projectId: string; comment: Omit<Comment, 'id' | 'timestamp'> }) => {
    const { projectId, comment } = data;

    // 生成 comment ID 和時間戳
    const fullComment: Comment = {
      ...comment,
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    // 廣播給項目中的所有其他用戶
    socket.to(projectId).emit('commentAdded', {
      comment: fullComment,
      addedBy: comment.userId,
    });

    // 確認給發送者
    socket.emit('commentAdded', {
      comment: fullComment,
      addedBy: comment.userId,
    });

    console.log(`[WebSocket] Comment added by ${comment.userName} in project ${projectId}`);
  });

  /**
   * User deletes a comment
   * 用戶刪除註解
   */
  socket.on('deleteComment', (data: { projectId: string; commentId: string; userId: string }) => {
    const { projectId, commentId, userId } = data;

    // 廣播刪除事件
    io.to(projectId).emit('commentDeleted', {
      commentId,
      deletedBy: userId,
    });

    console.log(`[WebSocket] Comment ${commentId} deleted by ${userId}`);
  });
};
```

**註冊 handler:**

```typescript
// 在 index.ts 中
import { handleCommentEvents } from './handlers/socketHandlers';

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 註冊現有 handlers
  handleCollaborationEvents(io, socket);

  // 註冊新的 comment handler
  handleCommentEvents(io, socket);

  // ...
});
```

### Step 3: 前端 Context 更新

**文件：** `frontend/src/contexts/CollaborationContext.tsx`

```typescript
import { Comment } from '../types';

interface CollaborationContextType {
  // ... existing fields
  comments: Comment[];
  addComment: (content: string, targetId?: string) => void;
  deleteComment: (commentId: string) => void;
}

export const CollaborationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ... existing state
  const [comments, setComments] = useState<Comment[]>([]);

  // Listen for comment events
  useEffect(() => {
    if (!socket) return;

    socket.on('commentAdded', ({ comment }: { comment: Comment }) => {
      setComments((prev) => [...prev, comment]);
    });

    socket.on('commentDeleted', ({ commentId }: { commentId: string }) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });

    return () => {
      socket.off('commentAdded');
      socket.off('commentDeleted');
    };
  }, [socket]);

  /**
   * Add a new comment
   * 添加新註解
   */
  const addComment = useCallback((content: string, targetId?: string) => {
    if (!socket || !currentProject || !currentUser) return;

    const comment = {
      userId: currentUser.id,
      userName: currentUser.username,
      content,
      targetId,
    };

    socket.emit('addComment', {
      projectId: currentProject,
      comment,
    });
  }, [socket, currentProject, currentUser]);

  /**
   * Delete a comment
   * 刪除註解
   */
  const deleteComment = useCallback((commentId: string) => {
    if (!socket || !currentProject || !currentUser) return;

    socket.emit('deleteComment', {
      projectId: currentProject,
      commentId,
      userId: currentUser.id,
    });
  }, [socket, currentProject, currentUser]);

  // ... return with new fields
  return (
    <CollaborationContext.Provider value={{
      // ... existing values
      comments,
      addComment,
      deleteComment,
    }}>
      {children}
    </CollaborationContext.Provider>
  );
};
```

### Step 4: UI 組件

**文件：** `frontend/src/components/Comments/CommentPanel.tsx`

```typescript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Comment Panel Component
 * 註解面板組件
 *
 * Displays real-time comments from all users
 */
export const CommentPanel: React.FC = () => {
  const { comments, addComment, deleteComment } = useCollaboration();
  const { currentUser } = useUser();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      addComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Comments 註解 ({comments.length})
      </Typography>

      {/* Comment List */}
      <List sx={{ maxHeight: 400, overflow: 'auto' }}>
        {comments.map((comment) => (
          <ListItem
            key={comment.id}
            secondaryAction={
              comment.userId === currentUser?.id && (
                <IconButton edge="end" onClick={() => deleteComment(comment.id)}>
                  <DeleteIcon />
                </IconButton>
              )
            }
          >
            <ListItemText
              primary={comment.content}
              secondary={`${comment.userName} - ${new Date(comment.timestamp).toLocaleString()}`}
            />
          </ListItem>
        ))}
      </List>

      {/* Add Comment */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button variant="contained" onClick={handleSubmit}>
          Send
        </Button>
      </Box>
    </Box>
  );
};
```

---

## 7. 創建自定義 Hook

### 需求
> 創建一個 useLocalStorage Hook 來簡化 localStorage 操作

### 完整實現

**文件：** `frontend/src/hooks/useLocalStorage.ts`

```typescript
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Custom hook for localStorage with TypeScript support
 * 支持 TypeScript 的 localStorage 自定義 Hook
 *
 * Automatically syncs state with localStorage
 *
 * @param key - localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns [storedValue, setValue] - Similar to useState
 *
 * @example
 * const [name, setName] = useLocalStorage<string>('userName', 'Guest');
 * setName('John');  // Automatically saves to localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes to this key in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
```

### 使用範例

```typescript
import { useLocalStorage } from '../hooks/useLocalStorage';

const MyComponent: React.FC = () => {
  // 簡單類型
  const [username, setUsername] = useLocalStorage<string>('username', 'Guest');
  const [count, setCount] = useLocalStorage<number>('count', 0);

  // 複雜類型
  interface UserPreferences {
    theme: 'light' | 'dark';
    language: string;
  }
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('prefs', {
    theme: 'light',
    language: 'zh-TW',
  });

  return (
    <div>
      <p>Username: {username}</p>
      <button onClick={() => setUsername('John')}>Set Name</button>

      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>

      <p>Theme: {prefs.theme}</p>
      <button onClick={() => setPrefs({ ...prefs, theme: 'dark' })}>
        Dark Mode
      </button>
    </div>
  );
};
```

---

## 8. 數據導出功能

### 需求
> 實現前端觸發後端生成 Excel 文件並下載

### 完整流程

**Step 1: 前端觸發導出**

```typescript
import { exportData } from '../services/api';

const handleExport = async () => {
  try {
    setExporting(true);

    // 調用 API
    const response = await exportData({
      format: 'excel',
      data: flattenedData,
      metadata: {
        fileName: 'data_export',
        sheets: ['Overview', 'Flattened', 'Grouped'],
      },
    });

    // 觸發下載
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_export_${Date.now()}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('Export successful');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export data');
  } finally {
    setExporting(false);
  }
};
```

**Step 2: API 服務**

```typescript
// frontend/src/services/api.ts
export const exportData = async (options: {
  format: 'excel' | 'csv';
  data: Array<Record<string, unknown>>;
  metadata?: any;
}): Promise<AxiosResponse<Blob>> => {
  return axios.post('/api/export/data', options, {
    responseType: 'blob',  // 重要：指定響應類型為 blob
  });
};
```

**Step 3: 後端生成文件**

```typescript
// backend/src/services/exportService.ts
import * as XLSX from 'xlsx';

export const generateExcelFile = (
  data: Array<Record<string, unknown>>,
  metadata: any
): Buffer => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overviewData = [
    ['Export Date', new Date().toISOString()],
    ['Total Records', data.length],
    ['Columns', Object.keys(data[0] || {}).length],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Sheet 2: Data
  const dataSheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

  // Generate buffer
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return buffer;
};
```

**Step 4: 控制器**

```typescript
// backend/src/controllers/exportController.ts
export const exportDataHandler = async (req: Request, res: Response) => {
  try {
    const { format, data, metadata } = req.body;

    if (format === 'excel') {
      const buffer = generateExcelFile(data, metadata);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="export_${Date.now()}.xlsx"`);
      res.send(buffer);
    } else if (format === 'csv') {
      const csv = generateCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="export_${Date.now()}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('[Export] Error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};
```

---

## 9. 錯誤處理最佳實踐

### 前端錯誤處理

**Axios 攔截器統一錯誤處理:**

```typescript
// frontend/src/services/api.ts
import axios, { AxiosError } from 'axios';

// 創建 axios 實例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 響應攔截器
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 統一錯誤處理
    if (error.response) {
      // 服務器響應錯誤 (4xx, 5xx)
      const status = error.response.status;
      const message = (error.response.data as any)?.error || 'Unknown error';

      switch (status) {
        case 400:
          console.error('[API] Bad Request:', message);
          break;
        case 401:
          console.error('[API] Unauthorized - redirecting to login');
          window.location.href = '/login';
          break;
        case 403:
          console.error('[API] Forbidden:', message);
          break;
        case 404:
          console.error('[API] Not Found:', message);
          break;
        case 500:
          console.error('[API] Server Error:', message);
          break;
        default:
          console.error(`[API] Error ${status}:`, message);
      }
    } else if (error.request) {
      // 請求已發送但沒有響應
      console.error('[API] No response received:', error.message);
    } else {
      // 請求配置錯誤
      console.error('[API] Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

**React Error Boundary:**

```typescript
// frontend/src/components/ErrorBoundary/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 錯誤邊界組件
 *
 * Catches JavaScript errors in child components
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // TODO: Log to error reporting service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Oops! Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**使用 Error Boundary:**

```typescript
// frontend/src/App.tsx
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* ... */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

### 後端錯誤處理

**統一錯誤處理中間件:**

```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error class with status code
 * 自定義錯誤類，包含狀態碼
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handler middleware
 * 全局錯誤處理中間件
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    // 可預期的錯誤
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  // 未預期的錯誤
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

/**
 * Async error wrapper
 * 異步錯誤包裝器
 *
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**使用範例:**

```typescript
// backend/src/controllers/userController.ts
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const getUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await findUserById(userId);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({ user });
});

// 在 index.ts 中註冊錯誤處理中間件（最後註冊）
app.use(errorHandler);
```

---

## 10. 性能優化技巧

### React 性能優化

**1. useMemo 優化計算**

```typescript
import React, { useMemo } from 'react';

const ExpensiveComponent: React.FC<{ data: DataPoint[] }> = ({ data }) => {
  // ❌ 不好：每次渲染都計算
  const sortedData = data.sort((a, b) => a.value - b.value);

  // ✅ 好：只在 data 變化時計算
  const sortedData = useMemo(() => {
    console.log('Sorting data...');
    return [...data].sort((a, b) => a.value - b.value);
  }, [data]);

  return <div>{/* render sortedData */}</div>;
};
```

**2. useCallback 優化函數引用**

```typescript
import React, { useCallback, useState } from 'react';

const ParentComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);

  // ❌ 不好：每次渲染都創建新函數
  const handleAddItem = (item: string) => {
    setItems([...items, item]);
  };

  // ✅ 好：使用 useCallback 緩存函數
  const handleAddItem = useCallback((item: string) => {
    setItems((prev) => [...prev, item]);
  }, []);  // 空依賴，因為使用了函數式更新

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <ChildComponent onAddItem={handleAddItem} />
    </div>
  );
};

// 子組件使用 React.memo 避免不必要的渲染
const ChildComponent = React.memo<{ onAddItem: (item: string) => void }>(
  ({ onAddItem }) => {
    console.log('ChildComponent rendered');
    return <button onClick={() => onAddItem('new')}>Add Item</button>;
  }
);
```

**3. React.memo 避免不必要渲染**

```typescript
import React, { memo } from 'react';

interface ItemProps {
  id: string;
  name: string;
  onClick: (id: string) => void;
}

// ❌ 不好：父組件更新時總是重新渲染
const ListItem: React.FC<ItemProps> = ({ id, name, onClick }) => {
  console.log(`Rendering item ${id}`);
  return (
    <div onClick={() => onClick(id)}>
      {name}
    </div>
  );
};

// ✅ 好：只在 props 變化時重新渲染
const ListItem = memo<ItemProps>(({ id, name, onClick }) => {
  console.log(`Rendering item ${id}`);
  return (
    <div onClick={() => onClick(id)}>
      {name}
    </div>
  );
});
```

**4. 虛擬滾動（大量數據）**

```typescript
import React from 'react';
import { FixedSizeList } from 'react-window';

interface VirtualListProps {
  items: Array<{ id: string; name: string }>;
}

/**
 * Virtual scrolling list for large datasets
 * 大數據集的虛擬滾動列表
 *
 * Only renders visible items, improves performance significantly
 */
const VirtualList: React.FC<VirtualListProps> = ({ items }) => {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      {items[index].id}: {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 後端性能優化

**1. 數據庫查詢優化**

```typescript
// ❌ 不好：N+1 查詢問題
const getProjectsWithUsers = async () => {
  const projects = await db.query('SELECT * FROM projects');

  for (const project of projects) {
    project.user = await db.query('SELECT * FROM users WHERE id = ?', [project.user_id]);
  }

  return projects;
};

// ✅ 好：使用 JOIN 減少查詢次數
const getProjectsWithUsers = async () => {
  return db.query(`
    SELECT
      projects.*,
      users.username,
      users.email
    FROM projects
    LEFT JOIN users ON projects.user_id = users.id
  `);
};
```

**2. 批量操作**

```typescript
// ❌ 不好：逐個插入
const insertMultipleRecords = async (records: any[]) => {
  for (const record of records) {
    await db.query('INSERT INTO data (column1, column2) VALUES (?, ?)', [
      record.column1,
      record.column2,
    ]);
  }
};

// ✅ 好：批量插入
const insertMultipleRecords = async (records: any[]) => {
  const values = records.map(r => [r.column1, r.column2]);
  const placeholders = records.map(() => '(?, ?)').join(', ');

  await db.query(
    `INSERT INTO data (column1, column2) VALUES ${placeholders}`,
    values.flat()
  );
};
```

**3. 緩存策略**

```typescript
// 簡單內存緩存
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedData = async (key: string, fetchFn: () => Promise<any>) => {
  const cached = cache.get(key);
  const now = Date.now();

  // 檢查緩存是否有效
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`[Cache] Hit for key: ${key}`);
    return cached.data;
  }

  // 緩存未命中，獲取新數據
  console.log(`[Cache] Miss for key: ${key}`);
  const data = await fetchFn();
  cache.set(key, { data, timestamp: now });

  return data;
};

// 使用範例
const getExpensiveData = async (fileId: string) => {
  return getCachedData(`file_${fileId}`, async () => {
    // 執行昂貴的數據庫查詢或計算
    return await performExpensiveOperation(fileId);
  });
};
```

---

## 🎓 延伸學習

### 推薦練習任務

完成這些任務以鞏固學習：

1. **初級**
   - 添加一個新的清洗規則
   - 創建一個簡單的設置頁面
   - 實現一個自定義 Hook

2. **中級**
   - 添加一個新的圖表類型
   - 實現數據分頁功能
   - 添加 WebSocket 通知功能

3. **高級**
   - 實現完整的測試覆蓋
   - 優化大數據集的渲染性能
   - 設計並實現一個新的核心功能

### 相關資源

- [React 官方文檔](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js 指南](https://expressjs.com/en/guide/routing.html)
- [MDN Web Docs](https://developer.mozilla.org/)

---

*最後更新：2025-01-13*
*維護者：開發團隊*
*需要更多範例？請提交 Issue 告訴我們！*
