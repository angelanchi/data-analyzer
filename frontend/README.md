# Data Analyzer - Frontend

**版本**: 2.0
**最後更新**: 2025-01-12

## 概述

Data Analyzer 的前端應用是基於 React 18 + TypeScript 構建的單頁應用（SPA），提供直觀的數據分析工作流程界面。

## 技術棧

- **框架**: React 18.2.0
- **語言**: TypeScript 5.x
- **UI 庫**: Material-UI (MUI) 5.x
- **圖表庫**:
  - Chart.js 4.x（基礎圖表）
  - Plotly.js（進階圖表）
- **路由**: React Router 6.x
- **狀態管理**: React Context API
- **HTTP 客戶端**: Axios
- **實時通訊**: Socket.io-client（協作功能）
- **文件處理**: PapaParse（CSV 解析）
- **Excel 處理**: SheetJS (xlsx)

## 專案結構

```
frontend/
├── public/               # 靜態資源
│   ├── index.html       # HTML 模板
│   └── manifest.json    # PWA 配置
│
├── src/
│   ├── components/      # 可重用組件
│   │   ├── DataUpload/         # 數據上傳
│   │   ├── DataCleaning/       # 數據清理
│   │   ├── DataAnalysis/       # 數據分析
│   │   ├── Charts/             # 圖表組件
│   │   ├── Export/             # 匯出功能
│   │   ├── Collaboration/      # 協作功能
│   │   ├── Project/            # 專案管理
│   │   ├── User/               # 使用者管理
│   │   ├── Layout/             # 佈局組件
│   │   ├── Analysis/           # 分析管線
│   │   └── ErrorBoundary/      # 錯誤邊界
│   │
│   ├── pages/           # 頁面組件
│   │   ├── HomePage.tsx
│   │   ├── AnalysisPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── contexts/        # React Context
│   │   ├── UserContext.tsx
│   │   └── CollaborationContext.tsx
│   │
│   ├── services/        # API 服務層
│   │   ├── api.ts                # 通用 API 配置
│   │   ├── projectService.ts     # 專案服務
│   │   ├── socketService.ts      # WebSocket 服務
│   │   └── userApi.ts            # 使用者 API
│   │
│   ├── utils/           # 工具函數
│   │   ├── dataViews.ts              # 數據檢視邏輯
│   │   ├── chartRecommendations.ts   # 圖表推薦
│   │   ├── chartExport.ts            # 圖表匯出
│   │   ├── chartSafetyCheck.ts       # 圖表安全檢查
│   │   └── extensionGuard.ts         # 文件擴展名驗證
│   │
│   ├── hooks/           # 自訂 Hooks
│   │   └── useApiError.ts
│   │
│   ├── types/           # TypeScript 類型定義
│   │   └── index.ts
│   │
│   ├── App.tsx          # 應用主入口
│   └── index.tsx        # React DOM 入口
│
└── package.json         # 依賴管理
```

## 開發環境設定

### 前置需求

- Node.js 18.x 或更高版本
- npm 8.x 或更高版本

### 安裝依賴

```bash
cd frontend
npm install
```

### 環境變數配置

在 `frontend/` 目錄下創建 `.env` 文件（開發環境）：

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
```

### 啟動開發服務器

```bash
npm start
```

應用將在 `http://localhost:3000` 啟動，並自動開啟瀏覽器。

### 構建生產版本

```bash
npm run build
```

構建產物將輸出到 `frontend/build/` 目錄。

## 組件目錄組織規範

### 命名規範

1. **組件目錄**: 使用 **PascalCase**（例如：`DataUpload/`, `Charts/`）
2. **組件文件**: 使用 **PascalCase**（例如：`FileUpload.tsx`, `ChartRenderer.tsx`）
3. **工具/服務文件**: 使用 **camelCase**（例如：`api.ts`, `dataViews.ts`）
4. **類型文件**: 使用 **camelCase** 或 **index.ts**

### 組件結構

每個功能模組應包含：

```
ComponentName/
├── ComponentName.tsx       # 主組件
├── SubComponent.tsx        # 子組件（如有）
├── index.ts                # 導出（可選）
└── types.ts                # 組件專用類型（可選）
```

## 核心概念

### 1. 數據檢視模式（Data Views）

Data Analyzer 支援兩種數據檢視模式：

#### 單一檢視 (Single View)
- 將所有數據顯示為單一表格
- 每個 batch (唯一識別碼) 一行
- 適合：數據集較小、需要完整概覽

#### 批次檢視 (Batch View)
- 將數據分組顯示
- 每個 batch 的多個樣本分開顯示
- 適合：數據集較大、需要詳細檢視

相關代碼：`src/utils/dataViews.ts`

### 2. 組件通訊

#### Context API
- **UserContext**: 管理當前使用者狀態
- **CollaborationContext**: 管理協作連接和事件

#### Props Drilling
- 盡量避免深層 props 傳遞
- 優先使用 Context 或自訂 Hooks

#### WebSocket 事件
- 使用 `socketService` 單例管理連接
- 透過 `CollaborationContext` 訂閱事件

### 3. 圖表系統

#### 圖表類型

1. **BasicCharts**（Chart.js）
   - 長條圖（Bar Chart）
   - 折線圖（Line Chart）
   - 適合基本統計圖表

2. **AdvancedCharts**（Plotly.js）
   - 盒鬚圖（Box Plot）
   - 散佈圖（Scatter Plot）
   - 熱力圖（Heatmap）
   - 適合進階分析

相關代碼：
- `src/components/Charts/ChartRenderer.tsx`
- `src/components/Charts/BasicCharts.tsx`
- `src/components/Charts/AdvancedCharts.tsx`

#### 圖表推薦引擎

系統會根據數據特性自動推薦合適的圖表類型：

```typescript
// src/utils/chartRecommendations.ts
export function recommendChartType(
  metrics: string[],
  groups: string[]
): ChartType
```

### 4. 數據匯出

支援兩種匯出格式：

#### Excel (.xlsx)
- 多工作表結構
- 包含：資料總覽、逐筆數據、分組彙總

#### CSV (.csv)
- 單一文件
- 包含所有選定的數據

相關代碼：`src/components/Export/ExportOptions.tsx`

## API 通訊

### API 服務層架構

所有 API 請求應通過服務層（`src/services/`）進行：

```typescript
// src/services/api.ts - 通用配置
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 使用範例
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}
```

### 錯誤處理

使用自訂 Hook 處理 API 錯誤：

```typescript
// src/hooks/useApiError.ts
import { useState } from 'react';

export function useApiError() {
  const [error, setError] = useState<string>('');

  const handleError = (err: unknown) => {
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.message || err.message);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('未知錯誤');
    }
  };

  return { error, setError, handleError };
}
```

## 開發規範

### TypeScript 類型定義

1. **優先使用** `shared/types/` 中的共享類型
2. **組件專用類型** 定義在組件文件頂部或獨立的 `types.ts`
3. **避免使用** `any`，優先使用 `unknown`

### 組件開發規範

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { SomeType } from 'shared/types';

interface ComponentNameProps {
  data: SomeType[];
  onUpdate: (data: SomeType) => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  data,
  onUpdate,
}) => {
  const [localState, setLocalState] = useState<SomeType | null>(null);

  useEffect(() => {
    // 副作用處理
    return () => {
      // 清理函數
    };
  }, [dependency]);

  return (
    <Box>
      <Typography variant="h6">標題</Typography>
      {/* JSX 內容 */}
    </Box>
  );
};

export default ComponentName;
```

### 命名慣例

- **組件**: PascalCase（`DataUpload`, `ChartRenderer`）
- **函數/變數**: camelCase（`handleClick`, `userData`）
- **常量**: UPPER_SNAKE_CASE（`API_BASE_URL`, `MAX_FILE_SIZE`）
- **類型/介面**: PascalCase（`UserData`, `ChartConfig`）
- **枚舉**: PascalCase（`ChartType`, `ViewMode`）

### 文件組織

1. 導入順序：
   ```typescript
   // 1. React 和第三方庫
   import React, { useState } from 'react';
   import { Box, Typography } from '@mui/material';

   // 2. 類型定義
   import { SomeType } from 'shared/types';
   import { LocalType } from './types';

   // 3. 組件和服務
   import { SubComponent } from '../SubComponent';
   import { api } from '../../services/api';

   // 4. 工具函數
   import { formatData } from '../../utils/dataViews';

   // 5. 樣式和資源（如有）
   import './styles.css';
   ```

2. 組件內部順序：
   - Props interface
   - Component function
   - State hooks
   - Effect hooks
   - Event handlers
   - Render helpers
   - JSX return

## 常用開發任務

### 新增頁面

1. 在 `src/pages/` 創建新頁面組件
2. 在 `src/App.tsx` 中添加路由
3. 在側邊欄（如有）添加導航連結

### 新增 API 端點

1. 在 `src/services/api.ts` 或專用服務文件中添加函數
2. 定義請求/回應類型（在 `shared/types/` 或本地）
3. 在組件中使用服務函數

### 新增圖表類型

1. 在 `src/types/index.ts` 中更新 `ChartType` 枚舉
2. 在 `ChartRenderer.tsx` 中添加渲染邏輯
3. 在 `BasicCharts.tsx` 或 `AdvancedCharts.tsx` 中實作圖表
4. 更新 `chartRecommendations.ts` 推薦邏輯（如需要）

## 測試

### 運行測試（計劃中）

```bash
npm test
```

### 測試覆蓋率（計劃中）

```bash
npm run test:coverage
```

## 故障排除

### 常見問題

**Q: 為什麼 API 請求失敗？**

A: 檢查：
1. 後端服務是否運行（`http://localhost:3001`）
2. `.env` 文件中的 `REACT_APP_API_URL` 是否正確
3. CORS 設定是否正確（後端 `backend/src/index.ts`）

**Q: 為什麼 WebSocket 連接失敗？**

A: 檢查：
1. 後端 Socket.io 服務是否運行
2. `.env` 文件中的 `REACT_APP_WS_URL` 是否正確
3. 瀏覽器 Console 中的錯誤訊息

**Q: 為什麼圖表不顯示？**

A: 檢查：
1. `chartConfig` 是否正確傳遞
2. `chartRef` 是否正確綁定
3. 瀏覽器 Console 中的錯誤訊息
4. 數據格式是否符合圖表要求

**Q: 為什麼編譯時出現類型錯誤？**

A: 檢查：
1. `shared/types/` 是否已編譯（運行 `npm install`）
2. 導入路徑是否正確
3. TypeScript 版本是否匹配（前後端一致）

## 性能優化

### 已實施的優化

1. **React.memo**: 重度計算的組件已使用 `React.memo`
2. **useCallback**: 回調函數使用 `useCallback` 避免不必要的重新渲染
3. **useMemo**: 昂貴的計算使用 `useMemo` 緩存結果
4. **代碼分割**: 使用 `React.lazy` 和 `Suspense` 延遲載入（計劃中）

### 優化建議

1. 避免在 render 中創建新的對象或數組
2. 使用 `useCallback` 和 `useMemo` 但不要過度使用
3. 大型列表使用虛擬化（`react-window`）
4. 圖片和資源使用懶載入

## 相關文檔

- [專案主 README](../README.md)
- [系統架構文檔](../docs/ARCHITECTURE.md)
- [API 參考文檔](../docs/API_REFERENCE.md)
- [使用者指南](../docs/USER_GUIDE.md)
- [後端開發文檔](../backend/README.md)
- [貢獻指南](../CONTRIBUTING.md)

## 支援

如有問題，請參閱：
- [常見問題](../docs/USER_GUIDE.md#常見問題)
- [GitHub Issues](https://github.com/your-repo/issues)
- 專案文檔：`docs/` 目錄

---

**版本歷史**:
- v2.0 (2025-01-12): 初始版本，移除 Python 依賴
