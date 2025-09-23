# 常見開發任務 (Common Development Tasks)

> **目標讀者**: Junior programmers, 新加入的開發者
> **更新日期**: 2025-11-14

## 目錄 (Table of Contents)

1. [添加新組件](#添加新組件-adding-new-components)
2. [添加新API端點](#添加新api端點-adding-new-api-endpoints)
3. [修改數據清理邏輯](#修改數據清理邏輯-modifying-data-cleaning-logic)
4. [添加新圖表類型](#添加新圖表類型-adding-new-chart-types)
5. [調試常見問題](#調試常見問題-debugging-common-issues)
6. [運行測試](#運行測試-running-tests)
7. [代碼格式化與 Linting](#代碼格式化與-linting-code-formatting-and-linting)

---

## 添加新組件 (Adding New Components)

### 任務：創建一個新的數據可視化組件

#### 步驟 1: 創建組件文件

```bash
# 在 frontend/src/components 下創建新文件夾
cd frontend/src/components
mkdir MyNewComponent
cd MyNewComponent
```

#### 步驟 2: 創建組件文件

**MyNewComponent.tsx**:
```typescript
import React from 'react';
import { Box } from '@mui/material';

/**
 * MyNewComponent
 * 我的新組件
 *
 * ## 功能說明
 * 這個組件用於...
 *
 * @component
 */

interface MyNewComponentProps {
  /** 數據數組 */
  data: Array<Record<string, unknown>>;
  /** 配置對象 */
  config?: any;
  /** 加載狀態 */
  loading?: boolean;
  /** 錯誤訊息 */
  error?: string;
}

const MyNewComponent: React.FC<MyNewComponentProps> = ({
  data,
  config,
  loading = false,
  error
}) => {
  if (loading) {
    return <Box>Loading...</Box>;
  }

  if (error) {
    return <Box>Error: {error}</Box>;
  }

  return (
    <Box>
      {/* 組件內容 */}
      <h2>My New Component</h2>
      <pre>{JSON.stringify(data.slice(0, 5), null, 2)}</pre>
    </Box>
  );
};

export default MyNewComponent;
```

#### 步驟 3: 創建 index.ts

**index.ts**:
```typescript
export { default } from './MyNewComponent';
```

#### 步驟 4: 在父組件中使用

```typescript
import MyNewComponent from '@/components/MyNewComponent';

// 在渲染中使用
<MyNewComponent
  data={processedData}
  config={myConfig}
  loading={isLoading}
  error={errorMessage}
/>
```

#### 步驟 5: 添加 JSDoc 註解

參考其他組件（如 ChartRenderer.tsx），添加詳細的 JSDoc 註解，包括：
- 組件功能說明
- Props 說明
- 使用示例

---

## 添加新API端點 (Adding New API Endpoints)

### 任務：添加一個新的數據處理API

#### 步驟 1: 在後端添加控制器方法

**backend/src/controllers/dataController.ts**:
```typescript
/**
 * 我的新數據處理方法
 * My New Data Processing Method
 *
 * ## 功能說明
 * 處理...
 *
 * @route POST /api/data/my-new-endpoint
 * @access Public
 *
 * @param {Request} req - Express 請求對象
 * @param {Response} res - Express 響應對象
 * @returns {ApiResponse} 處理結果
 */
export const myNewMethod = async (req: Request, res: Response) => {
  const { data, options } = req.body;

  if (!data || !Array.isArray(data)) {
    throw createAppError('無效的數據格式', 400);
  }

  try {
    // 處理邏輯
    const result = processMyData(data, options);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: '處理成功',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    throw createAppError(`處理失敗: ${error.message}`, 500);
  }
};
```

#### 步驟 2: 添加路由

**backend/src/routes/dataRoutes.ts**:
```typescript
import { myNewMethod } from '@/controllers/dataController';

router.post('/my-new-endpoint', asyncHandler(myNewMethod));
```

#### 步驟 3: 在前端添加 API 調用

**frontend/src/services/api.ts**:
```typescript
/**
 * 調用我的新數據處理端點
 * Call My New Data Processing Endpoint
 *
 * @param {Array<Record<string, unknown>>} data - 輸入數據
 * @param {any} [options] - 處理選項
 * @returns {Promise<ApiResponse>} 處理結果
 *
 * @example
 * ```ts
 * const result = await myNewApiCall(data, { option1: true });
 * console.log(result.data);
 * ```
 */
export const myNewApiCall = async (
  data: Array<Record<string, unknown>>,
  options?: any
): Promise<ApiResponse> => {
  const response = await api.post('/data/my-new-endpoint', { data, options });
  return response.data;
};
```

#### 步驟 4: 在組件中調用

```typescript
import { myNewApiCall } from '@/services/api';

const handleProcess = async () => {
  try {
    setLoading(true);
    setError(null);

    const result = await myNewApiCall(myData, { option1: true });
    setProcessedData(result.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 修改數據清理邏輯 (Modifying Data Cleaning Logic)

### 任務：添加新的數據清理規則類型

#### 步驟 1: 更新類型定義

**shared/types.ts**:
```typescript
export interface CleaningRule {
  field: string;
  enabled: boolean;
  // ... 現有欄位 ...

  // 新增：自定義過濾條件
  customFilter?: {
    type: 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
  };
}
```

#### 步驟 2: 更新清理服務

**backend/src/services/dataCleaningService.ts**:
```typescript
private static applyCleaningRule(
  data: DataPoint[],
  rule: CleaningRule,
  stats: any
): DataPoint[] {
  // ... 現有邏輯 ...

  // 新增：自定義過濾
  if (rule.customFilter) {
    const { type, value } = rule.customFilter;

    processedData = processedData.filter(row => {
      const fieldValue = String(row[field] || '');

      switch (type) {
        case 'contains':
          return fieldValue.includes(value);
        case 'startsWith':
          return fieldValue.startsWith(value);
        case 'endsWith':
          return fieldValue.endsWith(value);
        case 'regex':
          return new RegExp(value).test(fieldValue);
        default:
          return true;
      }
    });
  }

  return processedData;
}
```

#### 步驟 3: 更新前端UI

**frontend/src/components/DataCleaning/DataCleaningConfig.tsx**:
```tsx
{/* 新增自定義過濾配置 */}
<Select
  label="過濾類型"
  value={rule.customFilter?.type || ''}
  onChange={(e) => updateRule(index, {
    ...rule,
    customFilter: { type: e.target.value, value: '' }
  })}
>
  <MenuItem value="contains">包含</MenuItem>
  <MenuItem value="startsWith">開頭為</MenuItem>
  <MenuItem value="endsWith">結尾為</MenuItem>
  <MenuItem value="regex">正則表達式</MenuItem>
</Select>

<TextField
  label="過濾值"
  value={rule.customFilter?.value || ''}
  onChange={(e) => updateRule(index, {
    ...rule,
    customFilter: { ...rule.customFilter, value: e.target.value }
  })}
/>
```

---

## 添加新圖表類型 (Adding New Chart Types)

### 任務：添加折線圖支持

#### 步驟 1: 更新 ChartConfig 類型

**shared/types.ts**:
```typescript
export interface ChartConfig {
  type: 'bar' | 'scatter' | 'line';  // 新增 'line'
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  title?: string;
}
```

#### 步驟 2: 更新 ChartRenderer

**frontend/src/components/Charts/ChartRenderer.tsx**:
```tsx
const basicTypes: ChartKind[] = ['bar', 'line'];  // 添加 'line'
const advancedTypes: ChartKind[] = ['scatter'];
```

#### 步驟 3: 在 BasicCharts 中實現

**frontend/src/components/Charts/BasicCharts.tsx**:
```typescript
const BasicCharts = React.forwardRef<any, ChartRendererProps>(({ data, config, width, height }, ref) => {
  const chartData = useMemo(() => {
    if (config.type === 'line') {
      // 折線圖數據處理
      return {
        labels: data.map(row => row[config.xAxis]),
        datasets: (Array.isArray(config.yAxis) ? config.yAxis : [config.yAxis]).map((field, index) => ({
          label: field,
          data: data.map(row => row[field]),
          borderColor: COLORS[index % COLORS.length],
          fill: false,
          tension: 0.1
        }))
      };
    }

    // bar 圖表邏輯...
  }, [data, config]);

  const options = {
    // ...現有配置...
  };

  return (
    <div ref={ref} style={{ width, height }}>
      <Line data={chartData} options={options} />
    </div>
  );
});
```

#### 步驟 4: 更新圖表推薦邏輯

**frontend/src/utils/chartRecommendations.ts**:
```typescript
// 添加折線圖推薦邏輯
if (hasTimeSeriesField(data)) {
  recommendations.push({
    type: 'line',
    priority: 5,
    reason: '折線圖適合顯示時間序列數據的趨勢',
    suggestedConfig: {
      xAxis: findTimeField(data),
      yAxis: numericFields.slice(0, 3)
    }
  });
}
```

---

## 調試常見問題 (Debugging Common Issues)

### 問題 1: 組件不渲染

**檢查清單**:
1. 檢查 import 路徑是否正確
2. 檢查 Props 是否正確傳遞
3. 檢查是否有 TypeScript 錯誤
4. 檢查瀏覽器控制台的錯誤訊息

**調試技巧**:
```typescript
// 添加 console.log 檢查數據
console.log('Props:', { data, config });

// 檢查渲染條件
console.log('Should render?', data && data.length > 0);

// 使用 React DevTools 檢查組件樹
```

### 問題 2: API 調用失敗

**檢查清單**:
1. 後端服務是否運行 (`npm run dev` in backend folder)
2. API 路徑是否正確
3. 請求參數是否符合類型定義
4. 檢查網絡標籤中的實際請求

**調試技巧**:
```typescript
// 在 api.ts 中添加日誌
console.log('API Request:', { url, data });

try {
  const response = await api.post('/endpoint', data);
  console.log('API Response:', response.data);
} catch (error) {
  console.error('API Error:', error);
  console.error('Error Details:', error.response?.data);
}
```

### 問題 3: 數據轉換錯誤

**檢查清單**:
1. 檢查輸入數據格式是否正確
2. 檢查欄位名稱是否存在
3. 檢查數值型欄位是否包含非數字值

**調試技巧**:
```typescript
// 在 createDataViews 前檢查數據
console.log('Input Data:', data.slice(0, 5));
console.log('Available Columns:', Object.keys(data[0]));
console.log('Selected Metrics:', selectedMetrics);

// 檢查轉換結果
const result = createDataViews(data, options);
console.log('Flattened Data:', result.flattenedData.slice(0, 5));
console.log('Grouped Data:', result.groupedData.slice(0, 5));
console.log('Metadata:', result.metadata);
```

---

## 運行測試 (Running Tests)

### 前端測試

```bash
cd frontend
npm test                  # 運行所有測試
npm test -- --watch      # 監視模式
npm test ComponentName   # 測試特定組件
npm run test:coverage    # 生成覆蓋率報告
```

### 後端測試

```bash
cd backend
npm test                  # 運行所有測試
npm test -- --watch      # 監視模式
npm test dataController  # 測試特定模組
```

### 編寫新測試

**示例: 組件測試**:
```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render with data', () => {
    const testData = [{ id: 1, name: 'Test' }];
    render(<MyComponent data={testData} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<MyComponent data={[]} loading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

**示例: API 測試**:
```typescript
import request from 'supertest';
import app from '@/index';

describe('POST /api/data/process', () => {
  it('should process data successfully', async () => {
    const response = await request(app)
      .post('/api/data/process')
      .send({ fileId: 'test-id', cleaningRules: [] });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should return 400 for missing fileId', async () => {
    const response = await request(app)
      .post('/api/data/process')
      .send({ cleaningRules: [] });

    expect(response.status).toBe(400);
  });
});
```

---

## 代碼格式化與 Linting (Code Formatting and Linting)

### 運行 ESLint

```bash
# 前端
cd frontend
npm run lint              # 檢查代碼風格
npm run lint:fix          # 自動修復問題

# 後端
cd backend
npm run lint
npm run lint:fix
```

### 運行 Prettier

```bash
# 格式化所有文件
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# 檢查格式化
npx prettier --check "src/**/*.{ts,tsx,js,jsx}"
```

### 配置 VS Code 自動格式化

**.vscode/settings.json**:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

---

## 常用命令快速參考 (Quick Command Reference)

### 開發

```bash
# 啟動開發服務器
npm start                 # 同時啟動前端和後端
cd frontend && npm start  # 僅前端
cd backend && npm run dev # 僅後端

# 構建
npm run build             # 構建前端
cd backend && npm run build  # 構建後端
```

### Git工作流

```bash
# 創建新分支
git checkout -b feature/my-new-feature

# 提交變更
git add .
git commit -m "feat: add new feature"

# 推送
git push origin feature/my-new-feature
```

### 依賴管理

```bash
# 安裝新依賴
npm install package-name

# 安裝開發依賴
npm install --save-dev package-name

# 更新依賴
npm update

# 檢查過時依賴
npm outdated
```

---

## 最佳實踐提醒 (Best Practice Reminders)

### 代碼規範
- ✅ 使用 TypeScript 類型定義
- ✅ 添加 JSDoc 註解
- ✅ 遵循命名規範（camelCase for variables, PascalCase for components）
- ✅ 保持函數簡短（<50行）
- ✅ 避免使用 `any` 類型

### 組件設計
- ✅ 單一職責原則
- ✅ Props 驅動
- ✅ 狀態提升
- ✅ 錯誤處理
- ✅ 加載狀態

### Git 提交
- ✅ 使用語義化提交訊息 (`feat:`, `fix:`, `docs:`, etc.)
- ✅ 保持提交小而聚焦
- ✅ 提交前運行測試
- ✅ 提交前運行 lint

---

## 延伸閱讀 (Further Reading)

- [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md) - 數據流向指南
- [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) - 組件架構指南
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 貢獻指南
