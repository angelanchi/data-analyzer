# Shared Types - 前後端類型共享

**版本**: 2.0
**最後更新**: 2025-01-12

## 概述

`shared/types` 目錄包含前後端共享的 TypeScript 類型定義，確保前後端的數據結構保持一致，提供完整的類型安全。

## 目錄結構

```
shared/
└── types/
    ├── index.ts          # 類型定義源碼（主文件）
    ├── index.js          # 編譯後的 JavaScript（.gitignore）
    ├── index.d.ts        # 編譯後的類型定義（.gitignore）
    ├── index.d.ts.map    # Source map（.gitignore）
    ├── package.json      # 編譯配置
    └── tsconfig.json     # TypeScript 配置
```

## 為什麼需要類型共享？

### 問題
前後端分別維護類型定義時：
- ❌ 類型不一致導致運行時錯誤
- ❌ API 變更時需要手動同步類型
- ❌ 容易遺漏欄位或使用錯誤的類型
- ❌ 增加維護成本

### 解決方案
使用共享類型定義：
- ✅ 前後端使用相同的類型定義
- ✅ 編譯時就能發現類型不匹配
- ✅ 自動補全和 IntelliSense 支援
- ✅ 重構時自動更新所有引用

## 編譯流程

### 開發流程

```mermaid
graph LR
    A[編輯 index.ts] --> B[運行 npm install]
    B --> C[自動編譯]
    C --> D[生成 .js 和 .d.ts]
    D --> E[前端/後端導入]
```

### 編譯命令

```bash
# 在 shared/types 目錄
cd shared/types

# 安裝依賴（如尚未安裝）
npm install

# 手動編譯
npm run build

# 監聽模式（自動編譯）
npm run build:watch
```

### 自動編譯

專案根目錄的 `npm install` 會自動編譯共享類型：

```bash
# 在專案根目錄
npm install  # 會自動運行 postinstall 腳本編譯 shared/types
```

## 使用方法

### 在前端使用

```typescript
// frontend/src/components/Example.tsx
import { User, Project, ChartConfig } from 'shared/types';

interface ExampleProps {
  user: User;
  project: Project;
  chartConfig: ChartConfig;
}

export const Example: React.FC<ExampleProps> = ({ user, project, chartConfig }) => {
  // TypeScript 會驗證類型
  console.log(user.displayName);  // ✅ 類型安全
  console.log(user.unknownField); // ❌ 編譯錯誤

  return <div>{project.name}</div>;
};
```

### 在後端使用

```typescript
// backend/src/controllers/exampleController.ts
import { Request, Response } from 'express';
import { User, Project } from 'shared/types';

export class ExampleController {
  static async getUser(req: Request, res: Response) {
    const user: User = {
      id: '123',
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      avatarColor: '#FF5733',
      createdAt: new Date().toISOString(),
    };

    // TypeScript 會驗證類型
    res.json(user);  // ✅ 類型匹配
  }
}
```

## 核心類型定義

以下是 `shared/types/index.ts` 中定義的主要類型：

### 使用者相關

```typescript
export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarColor: string;
  createdAt: string;
  isOnline?: boolean;
  lastActiveAt?: string;
}
```

### 專案相關

```typescript
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  collaborators: string[];
  dataFiles: string[];
  charts: ChartConfig[];
}
```

### 圖表相關

```typescript
export type ChartType =
  | 'scatter'
  | 'line'
  | 'bar'
  | 'box'
  | 'heatmap';

export interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  options?: Record<string, any>;
}
```

### 數據處理相關

```typescript
export interface DataFile {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface CleaningRule {
  type: 'remove_missing' | 'interpolate' | 'fill_value' | 'remove_outliers' | 'filter_range';
  column: string;
  parameters?: Record<string, any>;
}
```

### 協作相關

```typescript
export interface CollaborationEvent {
  type: 'user-join' | 'user-leave' | 'data-change' | 'chart-change' | 'cursor-move' | 'typing';
  projectId: string;
  userId: string;
  timestamp: string;
  targetComponent?: string;
  fieldPath?: string;
  data?: any;
}
```

## 新增類型定義

### 步驟

1. **編輯源碼**
   ```typescript
   // shared/types/index.ts
   export interface NewType {
     id: string;
     name: string;
     // ...
   }
   ```

2. **重新編譯**
   ```bash
   cd shared/types
   npm run build
   ```

3. **在前後端使用**
   ```typescript
   import { NewType } from 'shared/types';
   ```

### 命名規範

- **介面名稱**: PascalCase（`User`, `ChartConfig`）
- **類型別名**: PascalCase（`ChartType`, `ViewMode`）
- **欄位名稱**: camelCase（`displayName`, `createdAt`）
- **枚舉**: PascalCase，成員使用 lowercase 字串（`ChartType`, `'scatter'`）

### 最佳實踐

1. **使用介面而非類型別名**（除非需要聯合類型）
   ```typescript
   // ✅ 推薦
   export interface User { ... }

   // ❌ 避免（除非需要聯合類型）
   export type User = { ... }
   ```

2. **明確標記可選欄位**
   ```typescript
   export interface User {
     id: string;          // 必需
     email?: string;      // 可選
   }
   ```

3. **使用 Record 代替 any**
   ```typescript
   // ✅ 推薦
   options?: Record<string, unknown>

   // ❌ 避免
   options?: any
   ```

4. **為複雜類型提供 JSDoc 註釋**
   ```typescript
   /**
    * 圖表配置
    * @property type - 圖表類型
    * @property xAxis - X 軸欄位名稱
    * @property yAxis - Y 軸欄位名稱（可以是陣列）
    */
   export interface ChartConfig {
     type: ChartType;
     xAxis: string;
     yAxis: string | string[];
   }
   ```

## 常見問題

### Q: 為什麼修改 index.ts 後前端沒有生效？

A: 需要重新編譯共享類型：
```bash
cd shared/types
npm run build
```

或在專案根目錄重新安裝：
```bash
npm install
```

### Q: 為什麼看到 "Cannot find module 'shared/types'" 錯誤？

A: 檢查以下幾點：
1. 確保已運行 `npm install`（會自動編譯 shared/types）
2. 確保 `shared/types/index.js` 和 `index.d.ts` 存在
3. 確保 tsconfig.json 中的路徑配置正確

### Q: 前後端類型不一致時會發生什麼？

A: TypeScript 會在編譯時報錯：
```typescript
// 如果後端返回的數據不符合 User 介面
const user: User = response.data;  // ❌ 編譯錯誤
```

### Q: 可以在 shared/types 中使用第三方庫的類型嗎？

A: 盡量避免，因為會增加依賴：
- ✅ 使用內建類型（`string`, `number`, `Date`）
- ✅ 自訂介面和類型別名
- ❌ 避免導入第三方庫類型（除非必要）

### Q: index.js 和 index.d.ts 為什麼在 .gitignore 中？

A: 這些是編譯產物，應該在安裝時自動生成：
- 版本控制只需追蹤源碼（index.ts）
- 每個開發者/CI 環境自動編譯，確保一致性
- 減少 git diff 噪音

## 故障排除

### 編譯失敗

```bash
# 清理並重新安裝
cd shared/types
rm -rf node_modules
rm -f index.js index.d.ts index.d.ts.map
npm install
npm run build
```

### 類型定義不更新

```bash
# 強制重新編譯
cd shared/types
npm run build

# 重啟 TypeScript 服務器（VS Code）
Ctrl+Shift+P → TypeScript: Restart TS Server
```

### 導入路徑問題

確保 tsconfig.json 配置正確：

**前端** (`frontend/tsconfig.json`):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "shared/*": ["../shared/*"]
    }
  }
}
```

**後端** (`backend/tsconfig.json`):
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "shared/*": ["../../shared/*"],
      "@/*": ["./*"]
    }
  }
}
```

## 相關文檔

- [前端開發指南](../frontend/README.md)
- [後端開發指南](../backend/README.md)
- [系統架構文檔](../docs/ARCHITECTURE.md)
- [貢獻指南](../CONTRIBUTING.md)

---

**注意**: 修改 shared/types 中的類型定義是破壞性變更，需謹慎處理並更新相關代碼。
