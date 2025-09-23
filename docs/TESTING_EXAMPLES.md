# 測試範例 (Testing Examples)

> 本文檔提供完整的測試範例，幫助建立可靠的測試套件。

> ⚠️ **注意**：本專案目前尚未實現自動化測試。本文檔提供測試框架設置指南和範例代碼，作為未來實現的參考。

---

## 📋 目錄

1. [測試策略概覽](#1-測試策略概覽)
2. [前端測試設置](#2-前端測試設置)
3. [前端單元測試](#3-前端單元測試)
4. [前端組件測試](#4-前端組件測試)
5. [前端整合測試](#5-前端整合測試)
6. [後端測試設置](#6-後端測試設置)
7. [後端單元測試](#7-後端單元測試)
8. [後端整合測試](#8-後端整合測試)
9. [E2E 測試](#9-e2e-測試)
10. [測試最佳實踐](#10-測試最佳實踐)

---

## 1. 測試策略概覽

### 測試金字塔

```
       /\
      /  \    E2E Tests (少量)
     /____\
    /      \  Integration Tests (中等)
   /________\
  /__________\ Unit Tests (大量)
```

### 測試類型與覆蓋範圍

| 測試類型 | 測試對象 | 目標覆蓋率 | 工具 |
|---------|---------|-----------|------|
| **單元測試 Unit** | 函數、工具類 | 80%+ | Jest |
| **組件測試 Component** | React 組件 | 70%+ | React Testing Library |
| **整合測試 Integration** | API、Service 層 | 60%+ | Jest + Supertest |
| **E2E 測試 End-to-End** | 完整用戶流程 | 關鍵流程 | Cypress |

### 測試命名規範

```typescript
// 格式：describe("被測試單元", () => { it("應該做什麼", () => { ... }) })

describe('dataViews.ts', () => {
  describe('createDataViews()', () => {
    it('should return empty result when given empty data', () => {
      // ...
    });

    it('should correctly infer numeric and categorical columns', () => {
      // ...
    });

    it('should handle missing Point_ID gracefully', () => {
      // ...
    });
  });
});
```

---

## 2. 前端測試設置

### 安裝依賴

```bash
cd frontend
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @types/jest
```

### Jest 配置

**文件：** `frontend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Setup 文件

**文件：** `frontend/src/setupTests.ts`

```typescript
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;
```

### package.json 腳本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

---

## 3. 前端單元測試

### 測試工具函數

**文件：** `frontend/src/utils/__tests__/dataViews.test.ts`

```typescript
import { createDataViews, applySorting } from '../dataViews';

describe('dataViews.ts', () => {
  describe('createDataViews()', () => {
    /**
     * Test: Empty data input
     * 測試：空數據輸入
     */
    it('should return empty result when given empty data', () => {
      const result = createDataViews([]);

      expect(result.flattenedData).toEqual([]);
      expect(result.groupedData).toEqual([]);
      expect(result.metadata.batchCount).toBe(0);
      expect(result.metadata.flattenedRowCount).toBe(0);
    });

    /**
     * Test: Type inference
     * 測試：類型推斷
     */
    it('should correctly infer numeric and categorical columns', () => {
      const data = [
        { Point_ID: 'P1', Voltage: 3.3, Batch_No: 'A' },
        { Point_ID: 'P2', Voltage: 3.5, Batch_No: 'A' },
        { Point_ID: 'P3', Voltage: 3.2, Batch_No: 'B' },
      ];

      const result = createDataViews(data);

      expect(result.metadata.columnTypes.numeric).toContain('Voltage');
      expect(result.metadata.columnTypes.categorical).toContain('Batch_No');
      expect(result.metadata.columnTypes.categorical).toContain('Point_ID');  // 始終為 categorical
    });

    /**
     * Test: Flattened data structure
     * 測試：扁平化數據結構
     */
    it('should create flattened data with all selected fields', () => {
      const data = [
        { Point_ID: 'P1', Voltage: 3.3, Current: 1.5, Batch_No: 'A' },
        { Point_ID: 'P2', Voltage: 3.5, Current: 1.6, Batch_No: 'A' },
      ];

      const result = createDataViews(data, {
        metrics: ['Voltage', 'Current'],
        groups: ['Batch_No'],
      });

      expect(result.flattenedData).toHaveLength(2);
      expect(result.flattenedData[0]).toHaveProperty('Point_ID');
      expect(result.flattenedData[0]).toHaveProperty('Voltage');
      expect(result.flattenedData[0]).toHaveProperty('Current');
      expect(result.flattenedData[0]).toHaveProperty('Batch_No');
    });

    /**
     * Test: Grouped data aggregation
     * 測試：分組數據聚合
     */
    it('should create grouped data with correct aggregations', () => {
      const data = [
        { Point_ID: 'P1', Voltage: 3.0, Batch_No: 'A' },
        { Point_ID: 'P2', Voltage: 4.0, Batch_No: 'A' },
        { Point_ID: 'P3', Voltage: 5.0, Batch_No: 'B' },
      ];

      const result = createDataViews(data, {
        metrics: ['Voltage'],
        groups: ['Batch_No'],
      });

      expect(result.groupedData).toHaveLength(2);

      // Batch A: mean of 3.0 and 4.0 = 3.5
      const batchA = result.groupedData.find((g) => g.Batch_No === 'A');
      expect(batchA).toBeDefined();
      expect(batchA!.Voltage).toBe(3.5);
      expect(batchA!.Voltage_stat_count).toBe(2);
      expect(batchA!.Voltage_stat_min).toBe(3.0);
      expect(batchA!.Voltage_stat_max).toBe(4.0);

      // Batch B: only one value = 5.0
      const batchB = result.groupedData.find((g) => g.Batch_No === 'B');
      expect(batchB).toBeDefined();
      expect(batchB!.Voltage).toBe(5.0);
      expect(batchB!.Voltage_stat_count).toBe(1);
    });

    /**
     * Test: Handle null/undefined values
     * 測試：處理 null/undefined 值
     */
    it('should handle null and undefined values correctly', () => {
      const data = [
        { Point_ID: 'P1', Voltage: 3.3, Current: null },
        { Point_ID: 'P2', Voltage: null, Current: 1.5 },
        { Point_ID: 'P3', Voltage: 3.5, Current: undefined },
      ];

      const result = createDataViews(data, {
        metrics: ['Voltage', 'Current'],
      });

      expect(result.flattenedData).toHaveLength(3);
      // 聚合應該忽略 null/undefined
      expect(result.metadata.aggregations.overall.Voltage.count).toBe(2);
      expect(result.metadata.aggregations.overall.Current.count).toBe(1);
    });

    /**
     * Test: Column type overrides
     * 測試：欄位類型覆寫
     */
    it('should respect user-specified column type overrides', () => {
      const data = [
        { SerialNumber: '12345', Voltage: 3.3 },
        { SerialNumber: '12346', Voltage: 3.5 },
      ];

      // SerialNumber 看起來像數字，但應該被視為字串
      const result = createDataViews(data, {
        columnTypeOverrides: {
          SerialNumber: 'string',
        },
      });

      expect(result.metadata.columnTypes.categorical).toContain('SerialNumber');
      expect(result.metadata.columnTypes.numeric).not.toContain('SerialNumber');
    });
  });

  describe('applySorting()', () => {
    const data = [
      { id: '3', name: 'Charlie', value: 30 },
      { id: '1', name: 'Alice', value: 10 },
      { id: '2', name: 'Bob', value: 20 },
    ];

    /**
     * Test: Primary sort
     * 測試：主要排序
     */
    it('should sort by primary field', () => {
      const sorted = applySorting(data, 'name', null);

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    /**
     * Test: Secondary sort
     * 測試：次要排序
     */
    it('should sort by primary and secondary fields', () => {
      const data = [
        { batch: 'A', point: '2' },
        { batch: 'B', point: '1' },
        { batch: 'A', point: '1' },
        { batch: 'B', point: '2' },
      ];

      const sorted = applySorting(data, 'batch', 'point');

      expect(sorted[0]).toEqual({ batch: 'A', point: '1' });
      expect(sorted[1]).toEqual({ batch: 'A', point: '2' });
      expect(sorted[2]).toEqual({ batch: 'B', point: '1' });
      expect(sorted[3]).toEqual({ batch: 'B', point: '2' });
    });

    /**
     * Test: No sort (null primary)
     * 測試：不排序（主要欄位為 null）
     */
    it('should return original data when primarySort is null', () => {
      const sorted = applySorting(data, null, null);

      expect(sorted).toEqual(data);
    });

    /**
     * Test: Immutability
     * 測試：不可變性
     */
    it('should not mutate the original array', () => {
      const original = [...data];
      const sorted = applySorting(data, 'name', null);

      expect(data).toEqual(original);  // 原數組未被修改
      expect(sorted).not.toBe(data);   // 返回新數組
    });
  });
});
```

---

## 4. 前端組件測試

### 測試 React 組件

**文件：** `frontend/src/components/DataUpload/__tests__/FileUpload.test.tsx`

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../FileUpload';

// Mock API
jest.mock('../../../services/api', () => ({
  uploadFile: jest.fn(),
}));

import { uploadFile } from '../../../services/api';
const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;

describe('FileUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Render component
   * 測試：渲染組件
   */
  it('should render upload button and instructions', () => {
    render(<FileUpload onDataUploaded={jest.fn()} />);

    expect(screen.getByText(/上傳資料|Upload/i)).toBeInTheDocument();
    expect(screen.getByText(/拖放檔案|Drag.*drop/i)).toBeInTheDocument();
  });

  /**
   * Test: File selection via input
   * 測試：通過輸入選擇文件
   */
  it('should handle file selection via file input', async () => {
    const onDataUploaded = jest.fn();
    const mockData = [{ Point_ID: 'P1', Voltage: 3.3 }];

    mockUploadFile.mockResolvedValue({
      fileId: 'file123',
      data: mockData,
      sourceName: 'test.csv',
    });

    render(<FileUpload onDataUploaded={onDataUploaded} />);

    // 創建測試文件
    const file = new File(['Point_ID,Voltage\nP1,3.3'], 'test.csv', {
      type: 'text/csv',
    });

    // 獲取文件輸入元素（通常是隱藏的）
    const input = screen.getByLabelText(/上傳|upload/i) as HTMLInputElement;

    // 模擬文件選擇
    await userEvent.upload(input, file);

    // 等待上傳完成
    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file, undefined);
      expect(onDataUploaded).toHaveBeenCalledWith(mockData, 'file123', 'test.csv');
    });
  });

  /**
   * Test: File type validation
   * 測試：文件類型驗證
   */
  it('should reject invalid file types', async () => {
    render(<FileUpload onDataUploaded={jest.fn()} />);

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/上傳|upload/i) as HTMLInputElement;

    await userEvent.upload(input, invalidFile);

    // 應該顯示錯誤訊息
    await waitFor(() => {
      expect(screen.getByText(/無效.*檔案|invalid.*file/i)).toBeInTheDocument();
    });

    // 不應該調用 API
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  /**
   * Test: File size validation
   * 測試：文件大小驗證
   */
  it('should reject files exceeding size limit', async () => {
    render(<FileUpload onDataUploaded={jest.fn()} />);

    // 創建一個 > 50MB 的文件（mock）
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.csv', {
      type: 'text/csv',
    });

    const input = screen.getByLabelText(/上傳|upload/i) as HTMLInputElement;
    await userEvent.upload(input, largeFile);

    await waitFor(() => {
      expect(screen.getByText(/檔案.*太大|file.*too large/i)).toBeInTheDocument();
    });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  /**
   * Test: Upload error handling
   * 測試：上傳錯誤處理
   */
  it('should display error message when upload fails', async () => {
    const onDataUploaded = jest.fn();
    mockUploadFile.mockRejectedValue(new Error('Network error'));

    render(<FileUpload onDataUploaded={onDataUploaded} />);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/上傳|upload/i) as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/上傳.*失敗|upload.*failed/i)).toBeInTheDocument();
    });

    expect(onDataUploaded).not.toHaveBeenCalled();
  });

  /**
   * Test: Loading state during upload
   * 測試：上傳期間的載入狀態
   */
  it('should show loading indicator during upload', async () => {
    // 創建一個延遲的 promise
    let resolveUpload: any;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    mockUploadFile.mockReturnValue(uploadPromise as any);

    render(<FileUpload onDataUploaded={jest.fn()} />);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/上傳|upload/i) as HTMLInputElement;

    await userEvent.upload(input, file);

    // 應該顯示載入指示器
    expect(screen.getByText(/上傳中|uploading/i)).toBeInTheDocument();

    // 解析 promise
    resolveUpload({
      fileId: 'file123',
      data: [],
      sourceName: 'test.csv',
    });

    // 載入指示器應該消失
    await waitFor(() => {
      expect(screen.queryByText(/上傳中|uploading/i)).not.toBeInTheDocument();
    });
  });
});
```

### 測試帶 Context 的組件

**文件：** `frontend/src/components/User/__tests__/UserSelector.test.tsx`

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProvider } from '../../../contexts/UserContext';
import UserSelector from '../UserSelector';

/**
 * Wrapper with UserContext
 * 包含 UserContext 的包裝器
 */
const renderWithContext = (component: React.ReactElement) => {
  return render(
    <UserProvider>
      {component}
    </UserProvider>
  );
};

describe('UserSelector Component', () => {
  /**
   * Test: Render with context
   * 測試：使用 context 渲染
   */
  it('should render user selector with options', () => {
    renderWithContext(<UserSelector />);

    expect(screen.getByLabelText(/使用者|user/i)).toBeInTheDocument();
  });

  /**
   * Test: Select user
   * 測試：選擇用戶
   */
  it('should update current user when selection changes', async () => {
    renderWithContext(<UserSelector />);

    const select = screen.getByLabelText(/使用者|user/i);

    await userEvent.click(select);
    await userEvent.click(screen.getByText('Alice'));

    // 驗證選擇已更新
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

---

## 5. 前端整合測試

### 測試完整用戶流程

**文件：** `frontend/src/__tests__/integration/upload-and-preview.test.tsx`

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AnalysisPage from '../../pages/AnalysisPage';
import { UserProvider } from '../../contexts/UserContext';

// Mock API
jest.mock('../../services/api');
import * as api from '../../services/api';

const renderApp = () => {
  return render(
    <BrowserRouter>
      <UserProvider>
        <AnalysisPage />
      </UserProvider>
    </BrowserRouter>
  );
};

describe('Upload and Preview Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Integration Test: Upload → Preview → Next Step
   * 整合測試：上傳 → 預覽 → 下一步
   */
  it('should complete upload and preview workflow', async () => {
    // Mock API response
    (api.uploadFile as jest.Mock).mockResolvedValue({
      fileId: 'file123',
      data: [
        { Point_ID: 'P1', Voltage: 3.3, Batch_No: 'A' },
        { Point_ID: 'P2', Voltage: 3.5, Batch_No: 'A' },
      ],
      sourceName: 'test.csv',
    });

    renderApp();

    // Step 1: 應該在上傳步驟
    expect(screen.getByText(/步驟.*1|Step.*1/i)).toBeInTheDocument();

    // Step 2: 上傳文件
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/上傳|upload/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    // Step 3: 等待上傳完成並顯示預覽
    await waitFor(() => {
      expect(screen.getByText(/P1/)).toBeInTheDocument();
      expect(screen.getByText(/P2/)).toBeInTheDocument();
      expect(screen.getByText(/3.3/)).toBeInTheDocument();
    });

    // Step 4: 點擊下一步
    const nextButton = screen.getByText(/下一步|Next/i);
    await userEvent.click(nextButton);

    // Step 5: 應該進入清洗步驟
    await waitFor(() => {
      expect(screen.getByText(/步驟.*2|Step.*2/i)).toBeInTheDocument();
    });
  });
});
```

---

## 6. 後端測試設置

### 安裝依賴

```bash
cd backend
npm install --save-dev \
  jest \
  ts-jest \
  @types/jest \
  supertest \
  @types/supertest
```

### Jest 配置

**文件：** `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
```

### package.json 腳本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 7. 後端單元測試

### 測試 Service 層

**文件：** `backend/src/services/__tests__/dataCleaningService.test.ts`

```typescript
import { applyCleaningRules } from '../dataCleaningService';
import { CleaningRule } from '../../../shared/types';

describe('dataCleaningService', () => {
  describe('applyCleaningRules()', () => {
    const testData = [
      { id: '1', value: 10, text: 'hello' },
      { id: '2', value: null, text: 'world' },
      { id: '3', value: 30, text: null },
    ];

    /**
     * Test: Remove empty values
     * 測試：移除空值
     */
    it('should remove rows with empty values in specified column', () => {
      const rules: CleaningRule[] = [
        { type: 'removeEmpty', column: 'value' },
      ];

      const result = applyCleaningRules(testData, rules);

      expect(result).toHaveLength(2);
      expect(result.every((row) => row.value !== null)).toBe(true);
    });

    /**
     * Test: Fill default values
     * 測試：填充預設值
     */
    it('should fill empty values with default', () => {
      const rules: CleaningRule[] = [
        { type: 'fillDefault', column: 'value', value: 0 },
      ];

      const result = applyCleaningRules(testData, rules);

      expect(result).toHaveLength(3);
      expect(result[1].value).toBe(0);
    });

    /**
     * Test: Interpolate missing values
     * 測試：插值填充缺失值
     */
    it('should interpolate missing numeric values', () => {
      const data = [
        { id: '1', value: 10 },
        { id: '2', value: null },
        { id: '3', value: 30 },
      ];

      const rules: CleaningRule[] = [
        { type: 'interpolate', column: 'value' },
      ];

      const result = applyCleaningRules(data, rules);

      // 10 和 30 的平均值是 20
      expect(result[1].value).toBe(20);
    });

    /**
     * Test: Remove outliers (IQR method)
     * 測試：移除異常值（IQR 方法）
     */
    it('should remove outliers using IQR method', () => {
      const data = [
        { id: '1', value: 10 },
        { id: '2', value: 12 },
        { id: '3', value: 11 },
        { id: '4', value: 100 },  // Outlier
      ];

      const rules: CleaningRule[] = [
        { type: 'removeOutliers', column: 'value', method: 'iqr' },
      ];

      const result = applyCleaningRules(data, rules);

      expect(result).toHaveLength(3);
      expect(result.every((row) => row.value < 50)).toBe(true);
    });

    /**
     * Test: Apply multiple rules
     * 測試：應用多條規則
     */
    it('should apply multiple rules in sequence', () => {
      const rules: CleaningRule[] = [
        { type: 'fillDefault', column: 'value', value: 0 },
        { type: 'removeEmpty', column: 'text' },
      ];

      const result = applyCleaningRules(testData, rules);

      // 應該先填充 value，然後移除 text 為空的行
      expect(result).toHaveLength(2);
      expect(result.every((row) => row.text !== null)).toBe(true);
    });

    /**
     * Test: Handle invalid rules gracefully
     * 測試：優雅處理無效規則
     */
    it('should handle invalid rules without crashing', () => {
      const rules: CleaningRule[] = [
        { type: 'invalidType' as any, column: 'value' },
      ];

      expect(() => applyCleaningRules(testData, rules)).not.toThrow();
    });
  });
});
```

---

## 8. 後端整合測試

### 測試 API 端點

**文件：** `backend/src/routes/__tests__/uploadRoutes.test.ts`

```typescript
import request from 'supertest';
import express from 'express';
import uploadRoutes from '../uploadRoutes';
import path from 'path';

// 創建測試用的 Express app
const app = express();
app.use(express.json());
app.use('/api/upload', uploadRoutes);

describe('Upload API Integration Tests', () => {
  /**
   * Test: POST /api/upload - success
   * 測試：POST /api/upload - 成功
   */
  it('should upload CSV file successfully', async () => {
    const testFile = path.join(__dirname, '../../../test/fixtures/test.csv');

    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFile)
      .expect(200);

    expect(response.body).toHaveProperty('fileId');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('sourceName');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  /**
   * Test: POST /api/upload - no file
   * 測試：POST /api/upload - 沒有文件
   */
  it('should return 400 when no file is provided', async () => {
    const response = await request(app)
      .post('/api/upload')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/file.*required/i);
  });

  /**
   * Test: POST /api/upload - invalid file type
   * 測試：POST /api/upload - 無效文件類型
   */
  it('should return 400 for invalid file type', async () => {
    const testFile = path.join(__dirname, '../../../test/fixtures/test.txt');

    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFile)
      .expect(400);

    expect(response.body.error).toMatch(/invalid.*file.*type/i);
  });

  /**
   * Test: POST /api/upload - file too large
   * 測試：POST /api/upload - 文件過大
   */
  it('should return 413 for files exceeding size limit', async () => {
    // 這個測試需要創建一個超過 50MB 的文件
    // 或者 mock multer 的行為
    // 實際實現取決於項目配置
  });
});
```

### 測試數據庫操作

**文件：** `backend/src/utils/__tests__/database.test.ts`

```typescript
import { initializeDatabase, getUser, createUser } from '../database';
import Database from 'better-sqlite3';

describe('Database Operations', () => {
  let db: Database.Database;

  beforeAll(async () => {
    // 使用內存數據庫進行測試
    db = new Database(':memory:');
    await initializeDatabase(db);
  });

  afterAll(() => {
    db.close();
  });

  /**
   * Test: Create and retrieve user
   * 測試：創建和獲取用戶
   */
  it('should create and retrieve a user', async () => {
    const userId = 'test-user-1';
    const username = 'testuser';

    await createUser(db, userId, username, 'test@example.com');

    const user = await getUser(db, userId);

    expect(user).toBeDefined();
    expect(user?.id).toBe(userId);
    expect(user?.username).toBe(username);
    expect(user?.email).toBe('test@example.com');
  });

  /**
   * Test: Handle duplicate user creation
   * 測試：處理重複用戶創建
   */
  it('should handle duplicate user creation gracefully', async () => {
    const userId = 'test-user-2';
    const username = 'duplicate';

    await createUser(db, userId, username, 'dup@example.com');

    // 嘗試創建相同 ID 的用戶
    await expect(
      createUser(db, userId, 'different', 'diff@example.com')
    ).rejects.toThrow();
  });

  /**
   * Test: Get non-existent user
   * 測試：獲取不存在的用戶
   */
  it('should return null for non-existent user', async () => {
    const user = await getUser(db, 'non-existent-user');
    expect(user).toBeNull();
  });
});
```

---

## 9. E2E 測試

### Cypress 設置

```bash
cd frontend
npm install --save-dev cypress @testing-library/cypress
npx cypress open
```

**文件：** `frontend/cypress.config.ts`

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});
```

### E2E 測試範例

**文件：** `frontend/cypress/e2e/complete-workflow.cy.ts`

```typescript
describe('Complete Analysis Workflow', () => {
  beforeEach(() => {
    // 訪問首頁
    cy.visit('/');
  });

  /**
   * E2E Test: Complete 5-step workflow
   * E2E 測試：完成 5 步驟工作流
   */
  it('should complete the entire analysis workflow', () => {
    // Step 1: Upload file
    cy.contains(/上傳資料|Upload/i).should('be.visible');
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test_data.csv');
    cy.contains(/P1/).should('be.visible');  // 驗證數據預覽
    cy.contains(/下一步|Next/i).click();

    // Step 2: Data cleaning
    cy.contains(/設定清理|Cleaning/i).should('be.visible');
    cy.contains(/下一步|Next/i).click();

    // Step 3: Data format
    cy.contains(/數據格式|Format/i).should('be.visible');
    cy.get('[data-testid="metrics-select"]').click();
    cy.contains('Voltage').click();
    cy.contains(/下一步|Next/i).click();

    // Step 4: Chart configuration
    cy.contains(/圖表|Chart/i).should('be.visible');
    cy.get('[data-testid="chart-type-select"]').click();
    cy.contains('Scatter').click();
    cy.get('canvas').should('be.visible');  // 驗證圖表渲染
    cy.contains(/下一步|Next/i).click();

    // Step 5: Export
    cy.contains(/匯出|Export/i).should('be.visible');
    cy.contains(/Excel/).click();
    cy.contains(/下載|Download/i).should('be.visible');
  });

  /**
   * E2E Test: Error handling
   * E2E 測試：錯誤處理
   */
  it('should handle invalid file upload gracefully', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/invalid.txt');
    cy.contains(/無效.*檔案|invalid.*file/i).should('be.visible');
  });

  /**
   * E2E Test: Navigation
   * E2E 測試：導航
   */
  it('should allow navigation between steps', () => {
    // 上傳文件
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test_data.csv');
    cy.contains(/下一步|Next/i).click();

    // 點擊步驟指示器返回
    cy.get('[data-testid="stepper-step-0"]').click();
    cy.contains(/上傳資料|Upload/i).should('be.visible');
  });
});
```

---

## 10. 測試最佳實踐

### AAA 模式 (Arrange-Act-Assert)

```typescript
it('should calculate average correctly', () => {
  // Arrange (準備)
  const data = [10, 20, 30];
  const calculator = new Calculator();

  // Act (執行)
  const result = calculator.average(data);

  // Assert (斷言)
  expect(result).toBe(20);
});
```

### 測試隔離

```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: jest.Mocked<Database>;

  beforeEach(() => {
    // 每個測試前重置
    mockDatabase = {
      query: jest.fn(),
    } as any;
    userService = new UserService(mockDatabase);
  });

  afterEach(() => {
    // 清理
    jest.clearAllMocks();
  });

  it('test 1', () => {
    // 測試 1 不會影響測試 2
  });

  it('test 2', () => {
    // 獨立的測試環境
  });
});
```

### Mock 外部依賴

```typescript
// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.get.mockResolvedValue({
  data: { message: 'success' },
});

// Mock 模組的部分函數
jest.mock('../utils/helpers', () => ({
  ...jest.requireActual('../utils/helpers'),
  specificFunction: jest.fn(() => 'mocked'),
}));
```

### 測試異步代碼

```typescript
// 使用 async/await
it('should fetch data asynchronously', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// 使用 waitFor（React Testing Library）
it('should display data after loading', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});

// 測試錯誤情況
it('should handle errors', async () => {
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

### 測試覆蓋率目標

```bash
# 生成覆蓋率報告
npm run test:coverage

# 查看報告
open coverage/lcov-report/index.html
```

**推薦覆蓋率目標：**
- 工具函數（utils）：80%+
- Service 層：70%+
- 組件：60%+
- E2E：關鍵流程覆蓋

---

## 📚 延伸資源

- [Jest 官方文檔](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress 文檔](https://docs.cypress.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Kent C. Dodds - Testing Blog](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*最後更新：2025-01-13*
*維護者：開發團隊*
*測試問題？歡迎提交 Issue！*
