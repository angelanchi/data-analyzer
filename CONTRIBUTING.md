# 貢獻指南

感謝您對 Data Analyzer 專案的關注！本文檔提供完整的代碼貢獻流程和規範。

## 目錄

- [行為準則](#行為準則)
- [如何貢獻](#如何貢獻)
- [開發環境設定](#開發環境設定)
- [代碼規範](#代碼規範)
- [提交流程](#提交流程)
- [Pull Request 流程](#pull-request-流程)
- [測試要求](#測試要求)
- [文檔貢獻](#文檔貢獻)
- [問題回報](#問題回報)

## 行為準則

### 我們的承諾

為了營造開放友好的環境，我們承諾讓參與專案的每個人都能享受無騷擾的體驗，不論年齡、體型、殘疾、種族、性別認同、經驗水平、國籍、外貌、種族、宗教或性認同。

### 我們的標準

**正面行為範例**：
- 使用友好和包容的語言
- 尊重不同的觀點和經驗
- 優雅地接受建設性批評
- 專注於對社區最有利的事情
- 對其他社區成員表示同理心

**不可接受的行為範例**：
- 使用性化語言或圖像
- 侮辱/貶損性評論，人身或政治攻擊
- 公開或私下騷擾
- 未經明確許可發布他人的私人信息
- 其他在專業環境中可能被視為不當的行為

## 如何貢獻

### 貢獻類型

我們歡迎以下類型的貢獻：

1. **代碼貢獻**
   - 新功能開發
   - Bug 修復
   - 性能優化
   - 代碼重構

2. **文檔貢獻**
   - 修正文檔錯誤
   - 改進文檔清晰度
   - 新增使用範例
   - 翻譯文檔

3. **測試貢獻**
   - 新增單元測試
   - 新增整合測試
   - 改進測試覆蓋率

4. **問題回報**
   - Bug 回報
   - 功能建議
   - 性能問題回報

5. **社區貢獻**
   - 回答問題
   - 代碼審查
   - 分享使用經驗

## 開發環境設定

### 前置需求

- **Node.js**: 18.x 或更高版本
- **npm**: 8.x 或更高版本
- **Git**: 2.x 或更高版本
- **編輯器**: 推薦使用 VS Code

### Fork 和 Clone 專案

1. **Fork 專案**
   - 訪問 [GitHub 專案頁面](https://github.com/your-repo/data-analyzer)
   - 點擊右上角的 "Fork" 按鈕

2. **Clone 到本地**
   ```bash
   git clone https://github.com/your-username/data-analyzer.git
   cd data-analyzer
   ```

3. **添加 upstream remote**
   ```bash
   git remote add upstream https://github.com/original-repo/data-analyzer.git
   ```

### 安裝依賴

```bash
# 安裝根目錄依賴（如有）
npm install

# 安裝前端依賴
cd frontend
npm install

# 安裝後端依賴
cd ../backend
npm install

# 編譯共享類型
cd ../shared/types
npm install
npm run build
```

### 配置環境變數

**後端** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_PATH=./data/database.sqlite
```

**前端** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
```

### 啟動開發服務器

```bash
# 在一個終端視窗啟動後端
cd backend
npm run dev

# 在另一個終端視窗啟動前端
cd frontend
npm start
```

## 代碼規範

### TypeScript 規範

#### 命名慣例

```typescript
// 組件/類：PascalCase
class UserService { }
export const DataUpload: React.FC = () => { };

// 函數/變數：camelCase
function getUserData() { }
const userData = {};

// 常量：UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const API_BASE_URL = 'http://localhost:3001';

// 類型/介面：PascalCase
interface UserData { }
type ChartConfig = { };

// 枚舉：PascalCase
enum ChartType {
  Bar = 'bar',
  Line = 'line'
}

// 私有成員：前綴 _（可選）
class Example {
  private _privateField: string;
}
```

#### 類型定義

```typescript
// ✅ 好的做法
interface User {
  id: string;
  name: string;
  email?: string;  // 可選屬性
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ 避免使用
function getUser(id: any): any {  // 不要使用 any
  // ...
}

// ✅ 使用 unknown 替代 any
function processData(data: unknown): void {
  if (typeof data === 'string') {
    // 類型守衛
  }
}
```

#### 導入順序

```typescript
// 1. React 和第三方庫
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';

// 2. 類型定義
import { User, Project } from 'shared/types';
import { LocalType } from './types';

// 3. 組件和服務
import { SubComponent } from '../SubComponent';
import { api } from '../../services/api';

// 4. 工具函數
import { formatDate } from '../../utils/date';

// 5. 樣式和資源
import './styles.css';
```

### 代碼風格

#### 縮排和格式

- 使用 **2 空格**縮排
- 每行最多 **100 字符**（可彈性調整）
- 使用 **分號**結尾
- 使用 **單引號**（字串）

#### 註釋規範

```typescript
/**
 * 獲取使用者資料
 * @param userId - 使用者 ID
 * @returns 使用者資料物件
 * @throws {Error} 當使用者不存在時
 */
async function getUserData(userId: string): Promise<User> {
  // 實作邏輯
}

// 單行註釋用於簡短說明
const maxRetries = 3;  // 最大重試次數

/*
 * 多行註釋用於複雜說明
 * 說明業務邏輯或演算法
 */
```

#### React 組件規範

```typescript
import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  onUpdate: (data: string) => void;
}

export const MyComponent: React.FC<Props> = ({ title, onUpdate }) => {
  // 1. State hooks
  const [data, setData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 2. Effect hooks
  useEffect(() => {
    // 副作用邏輯
    return () => {
      // 清理函數
    };
  }, [dependency]);

  // 3. Event handlers
  const handleClick = () => {
    // 事件處理
  };

  // 4. Render helpers
  const renderContent = () => {
    if (loading) return <div>Loading...</div>;
    return <div>{data}</div>;
  };

  // 5. JSX return
  return (
    <div>
      <h1>{title}</h1>
      {renderContent()}
      <button onClick={handleClick}>Update</button>
    </div>
  );
};

export default MyComponent;
```

### ESLint 和 Prettier

專案使用 ESLint 和 Prettier 確保代碼一致性。

#### 檢查代碼

```bash
# 前端
cd frontend
npm run lint

# 後端
cd backend
npm run lint
```

#### 自動修復

```bash
npm run lint:fix
```

#### VS Code 設定

在 `.vscode/settings.json` 中添加：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 提交流程

### 分支策略

我們使用 **Git Flow** 分支模型：

```
master (main)          # 生產環境分支
  ├── develop          # 開發分支
  │     ├── feature/*  # 功能分支
  │     ├── bugfix/*   # Bug 修復分支
  │     └── hotfix/*   # 熱修復分支
  └── release/*        # 發布分支
```

### 創建功能分支

```bash
# 確保 develop 分支是最新的
git checkout develop
git pull upstream develop

# 創建新分支
git checkout -b feature/your-feature-name

# 或修復 bug
git checkout -b bugfix/issue-123-fix-upload
```

### 分支命名規範

- **功能**: `feature/add-chart-export`
- **Bug 修復**: `bugfix/fix-websocket-leak`
- **熱修復**: `hotfix/critical-security-fix`
- **發布**: `release/v2.1.0`

### Commit 訊息規範

我們遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

#### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 類型

- **feat**: 新功能
- **fix**: Bug 修復
- **docs**: 文檔變更
- **style**: 代碼格式（不影響功能）
- **refactor**: 重構（不新增功能也不修復 bug）
- **perf**: 性能優化
- **test**: 新增或修改測試
- **chore**: 構建過程或輔助工具變更

#### 範例

```bash
# 好的 commit 訊息
git commit -m "feat(charts): add box plot chart type"
git commit -m "fix(websocket): prevent connection leak by limiting connections per user"
git commit -m "docs(api): update export endpoint documentation"
git commit -m "refactor(services): extract data cleaning logic to separate service"

# 多行 commit
git commit -m "feat(export): add multi-sheet Excel export

- Implement data overview sheet
- Add batch data sheet
- Include grouped summary sheet

Closes #123"
```

### Commit 最佳實踐

1. **每個 commit 只做一件事**
2. **commit 訊息要清晰描述變更內容**
3. **頻繁 commit**（不要累積太多變更）
4. **在 commit 前測試代碼**
5. **使用 present tense**（"add feature" 不是 "added feature"）

## Pull Request 流程

### 提交 PR 前的檢查清單

- [ ] 代碼遵循專案規範
- [ ] 所有測試通過
- [ ] 新增必要的測試
- [ ] 更新相關文檔
- [ ] Commit 訊息符合規範
- [ ] 解決所有衝突
- [ ] 代碼已經過 ESLint 檢查

### 創建 Pull Request

1. **推送分支到 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **在 GitHub 上創建 PR**
   - 訪問您的 Fork repository
   - 點擊 "Compare & pull request"
   - 選擇 base repository 的 `develop` 分支

3. **填寫 PR 描述**

#### PR 模板

```markdown
## 變更說明

簡要描述這個 PR 做了什麼。

## 變更類型

- [ ] Bug fix（不破壞現有功能的修復）
- [ ] New feature（不破壞現有功能的新功能）
- [ ] Breaking change（會破壞現有功能的修改）
- [ ] Documentation update（文檔更新）

## 相關 Issue

Closes #123
Fixes #456

## 測試方式

描述如何測試這些變更：
1. 啟動開發服務器
2. 導航到 ...
3. 點擊 ...
4. 驗證 ...

## 截圖（如適用）

（貼上截圖）

## 檢查清單

- [ ] 我的代碼遵循專案的代碼規範
- [ ] 我已經進行了自我審查
- [ ] 我已經註釋了難以理解的代碼
- [ ] 我已經更新了相關文檔
- [ ] 我的變更不會產生新的警告
- [ ] 我已經新增了證明修復有效或功能正常的測試
- [ ] 新增和現有的單元測試在本地都通過
```

### Code Review 流程

1. **等待審查**：維護者會審查您的 PR
2. **回應評論**：積極回應審查者的評論和建議
3. **修改代碼**：根據反饋修改代碼
4. **更新 PR**：推送新的 commit 到同一分支

```bash
# 修改代碼後
git add .
git commit -m "fix(review): address review comments"
git push origin feature/your-feature-name
```

5. **合併**：當 PR 被批准後，維護者會合併您的代碼

### PR 最佳實踐

1. **保持 PR 小而專注**（一個 PR 做一件事）
2. **提供清晰的描述和上下文**
3. **及時回應審查意見**
4. **保持 PR 更新**（定期合併 develop 分支）
5. **測試所有變更**

## 測試要求

### 運行測試

```bash
# 前端測試（計劃中）
cd frontend
npm test

# 後端測試（計劃中）
cd backend
npm test

# 測試覆蓋率
npm run test:coverage
```

### 測試規範

#### 單元測試

```typescript
// utils/dataViews.test.ts
import { transformToSingleView } from './dataViews';

describe('transformToSingleView', () => {
  it('should transform batch data to single view', () => {
    const input = [/* 測試數據 */];
    const expected = [/* 預期結果 */];

    const result = transformToSingleView(input);

    expect(result).toEqual(expected);
  });

  it('should handle empty input', () => {
    const result = transformToSingleView([]);
    expect(result).toEqual([]);
  });
});
```

#### 整合測試

```typescript
// services/api.test.ts
import { api } from './api';
import MockAdapter from 'axios-mock-adapter';

describe('API Service', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should upload file successfully', async () => {
    mock.onPost('/api/upload').reply(200, { success: true });

    const file = new File(['content'], 'test.csv');
    const response = await uploadFile(file);

    expect(response.success).toBe(true);
  });
});
```

### 測試覆蓋率要求

- **新功能**：必須包含測試，覆蓋率 > 80%
- **Bug 修復**：必須包含回歸測試
- **重構**：確保現有測試通過

## 文檔貢獻

### 文檔類型

1. **代碼文檔**：JSDoc 註釋
2. **API 文檔**：`docs/API_REFERENCE.md`
3. **使用者指南**：`docs/USER_GUIDE.md`
4. **開發文檔**：`frontend/README.md`, `backend/README.md`

### 文檔規範

- **清晰簡潔**：使用簡單明瞭的語言
- **範例驅動**：提供實際使用範例
- **保持更新**：代碼變更時同步更新文檔
- **正確格式**：遵循 Markdown 語法

### 文檔 PR

文檔變更也需要通過 PR 提交：

```bash
git checkout -b docs/update-api-reference
# 修改文檔
git add docs/API_REFERENCE.md
git commit -m "docs(api): update export endpoint documentation"
git push origin docs/update-api-reference
```

## 問題回報

### Bug 回報

使用 [GitHub Issues](https://github.com/your-repo/data-analyzer/issues) 回報 bug。

#### Bug 回報模板

```markdown
**描述 Bug**
清晰簡潔地描述 bug。

**重現步驟**
1. 前往 '...'
2. 點擊 '...'
3. 向下滾動到 '...'
4. 看到錯誤

**預期行為**
清晰簡潔地描述您預期發生的事情。

**截圖**
如果適用，添加截圖以幫助解釋您的問題。

**環境：**
 - OS: [例如 Windows 11]
 - Browser: [例如 Chrome 120]
 - Version: [例如 v2.0]

**額外上下文**
添加任何其他關於問題的上下文。
```

### 功能建議

#### 功能建議模板

```markdown
**您的功能請求是否與問題相關？請描述。**
清晰簡潔地描述問題是什麼。例如：每次我執行 [...] 時都會感到沮喪

**描述您想要的解決方案**
清晰簡潔地描述您想要發生的事情。

**描述您考慮過的替代方案**
清晰簡潔地描述您考慮過的任何替代解決方案或功能。

**額外上下文**
添加任何其他關於功能請求的上下文或截圖。
```

## 發布流程

（維護者使用）

### 版本號規範

遵循 [Semantic Versioning](https://semver.org/)：

- **MAJOR** (v2.0.0): 破壞性變更
- **MINOR** (v2.1.0): 新功能（向後兼容）
- **PATCH** (v2.0.1): Bug 修復

### 發布檢查清單

- [ ] 更新 `CHANGELOG.md`
- [ ] 更新版本號（`package.json`）
- [ ] 運行所有測試
- [ ] 更新文檔
- [ ] 創建 release 分支
- [ ] 合併到 master
- [ ] 創建 Git tag
- [ ] 發布 GitHub Release

## 獲得幫助

如果您有任何問題：

1. **查看文檔**：`docs/` 目錄
2. **搜尋現有 Issues**：可能已有解答
3. **創建新 Issue**：描述您的問題
4. **加入討論**：GitHub Discussions（如有）

## 致謝

感謝所有為專案做出貢獻的開發者！您的努力讓 Data Analyzer 變得更好。

---

**最後更新**: 2025-01-12
**版本**: 1.0
