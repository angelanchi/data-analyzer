# Data Analyzer - Backend

**版本**: 2.0
**最後更新**: 2025-01-12

## 概述

Data Analyzer 的後端是基於 Node.js + Express 構建的 RESTful API 服務器，提供數據處理、分析、協作和匯出功能。

## 技術棧

- **運行環境**: Node.js 18.x+
- **框架**: Express 4.x
- **語言**: TypeScript 5.x
- **資料庫**: SQLite 3（使用 better-sqlite3）
- **實時通訊**: Socket.io 4.x
- **文件處理**:
  - PapaParse (CSV 解析)
  - SheetJS (xlsx) (Excel 處理)
- **安全性**:
  - Helmet (HTTP 標頭安全)
  - CORS (跨域資源共享)
  - express-rate-limit (速率限制)
- **工具**:
  - Multer (文件上傳)
  - uuid (唯一識別碼生成)

## 專案結構

```
backend/
├── src/
│   ├── routes/              # API 路由定義
│   │   ├── uploadRoutes.ts        # 文件上傳
│   │   ├── dataRoutes.ts          # 數據處理
│   │   ├── chartRoutes.ts         # 圖表配置
│   │   ├── exportRoutes.ts        # 數據匯出
│   │   ├── projectRoutes.ts       # 專案管理
│   │   ├── userRoutes.ts          # 使用者管理
│   │   ├── batchRoutes.ts         # 批次操作
│   │   ├── analysisRoutes.ts      # 分析作業（v2.1+ 計劃中）
│   │   └── dataFileRoutes.ts      # 數據文件管理
│   │
│   ├── controllers/         # 控制器層（處理請求）
│   │   ├── authController.ts      # 認證控制
│   │   ├── dataController.ts      # 數據處理
│   │   ├── userController.ts      # 使用者操作
│   │   ├── uploadController.ts    # 文件上傳
│   │   ├── chartController.ts     # 圖表生成
│   │   ├── exportController.ts    # 數據匯出
│   │   ├── projectController.ts   # 專案CRUD
│   │   ├── batchController.ts     # 批次操作
│   │   ├── analysisController.ts  # 分析作業（v2.1+）
│   │   └── dataFileController.ts  # 文件管理
│   │
│   ├── services/            # 業務邏輯層
│   │   ├── authService.ts             # 認證服務
│   │   ├── userService.ts             # 使用者服務
│   │   ├── collaborationService.ts    # 協作服務
│   │   ├── conflictService.ts         # 衝突解決
│   │   ├── versionService.ts          # 版本控制
│   │   ├── exportService.ts           # 匯出服務
│   │   ├── dataCleaningService.ts     # 數據清理
│   │   ├── batchAnalysisService.ts    # 批次分析
│   │   └── analysisJobQueue.ts        # 分析作業隊列（v2.1+）
│   │
│   ├── middleware/          # 中介軟體
│   │   ├── errorHandler.ts            # 錯誤處理
│   │   └── notFoundHandler.ts         # 404 處理
│   │
│   ├── utils/               # 工具函數
│   │   └── database.ts                # 資料庫工具
│   │
│   ├── handlers/            # 事件處理器
│   │   └── socketHandlers.ts          # Socket.io 事件處理
│   │
│   └── index.ts             # 應用入口
│
├── data/                    # 資料庫文件（.gitignore）
├── uploads/                 # 上傳文件存儲（.gitignore）
├── exports/                 # 匯出文件存儲（.gitignore）
├── package.json             # 依賴管理
└── tsconfig.json            # TypeScript 配置
```

## 開發環境設定

### 前置需求

- Node.js 18.x 或更高版本
- npm 8.x 或更高版本
- SQLite 3（通常內建於 Node.js）

### 安裝依賴

```bash
cd backend
npm install
```

### 環境變數配置

在 `backend/` 目錄下創建 `.env` 文件（開發環境）：

```env
# 服務器配置
PORT=3001
NODE_ENV=development

# 前端 URL（用於 CORS）
FRONTEND_URL=http://localhost:3000

# 資料庫
DATABASE_PATH=./data/database.sqlite

# 文件存儲
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports

# 安全性（生產環境務必更改）
SESSION_SECRET=your-secret-key-change-in-production

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 啟動開發服務器

```bash
npm run dev
```

服務器將在 `http://localhost:3001` 啟動，使用 **nodemon** 自動重啟。

### 構建生產版本

```bash
npm run build
```

構建產物將輸出到 `backend/dist/` 目錄。

### 運行生產服務器

```bash
npm start
```

## 架構設計

### MVC 架構

後端採用經典的 **MVC（Model-View-Controller）** 架構：

```
Request → Routes → Controllers → Services → Database
                                    ↓
Response ← Controllers ← Services ← Database
```

#### 各層職責

| 層級 | 目錄 | 職責 |
|------|------|------|
| **路由層** | `routes/` | 定義 API 端點，路由到對應的控制器 |
| **控制器層** | `controllers/` | 處理 HTTP 請求/回應，調用服務層 |
| **服務層** | `services/` | 業務邏輯實作，資料庫操作 |
| **資料庫層** | `utils/database.ts` | SQLite 資料庫連接和查詢 |

### 資料庫設計

#### 核心表結構

##### 1. `users` 表
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  email TEXT UNIQUE,
  avatarColor TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  isOnline INTEGER DEFAULT 0,
  lastActiveAt TEXT
);
```

##### 2. `projects` 表
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ownerId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (ownerId) REFERENCES users(id)
);
```

##### 3. `project_collaborators` 表
```sql
CREATE TABLE project_collaborators (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  addedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

##### 4. `project_data_files` 表
```sql
CREATE TABLE project_data_files (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  fileId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  filePath TEXT NOT NULL,
  addedAt TEXT NOT NULL,
  addedBy TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (addedBy) REFERENCES users(id)
);
```

##### 5. `project_analysis_configs` 表
```sql
CREATE TABLE project_analysis_configs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

##### 6. `collaboration_sessions` 表
```sql
CREATE TABLE collaboration_sessions (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  userId TEXT NOT NULL,
  socketId TEXT NOT NULL,
  joinedAt TEXT NOT NULL,
  lastActive TEXT NOT NULL,
  cursorPosition TEXT, -- JSON
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

##### 7. `collaboration_events` 表
```sql
CREATE TABLE collaboration_events (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  userId TEXT NOT NULL,
  eventType TEXT NOT NULL,
  eventData TEXT, -- JSON
  timestamp TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### 資料庫初始化

資料庫在首次運行時自動初始化（見 `src/utils/database.ts`）。

### API 端點組織

所有 API 端點的前綴為 `/api`：

```
/api/upload        # 文件上傳
/api/data          # 數據處理
/api/charts        # 圖表配置
/api/export        # 數據匯出
/api/projects      # 專案管理
/api/users         # 使用者管理
/api/batch         # 批次操作
/api/analysis      # 分析作業（v2.1+）
/api/data-files    # 數據文件管理
```

詳細 API 文檔請參閱：[API_REFERENCE.md](../docs/API_REFERENCE.md)

## 開發規範

### TypeScript 類型定義

1. **優先使用** `shared/types/` 中的共享類型
2. **控制器專用類型** 定義在控制器文件頂部
3. **避免使用** `any`，優先使用 `unknown`
4. **資料庫查詢** 使用明確的類型定義

### 控制器開發規範

```typescript
import { Request, Response } from 'express';
import { SomeService } from '@/services/someService';
import { SomeType } from 'shared/types';

export class SomeController {
  static async getItems(req: Request, res: Response) {
    try {
      const { param } = req.params;
      const items = await SomeService.getItems(param);

      return res.status(200).json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error('[SomeController] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  }
}
```

### 服務層開發規範

```typescript
import { db } from '@/utils/database';
import { SomeType } from 'shared/types';

export class SomeService {
  static async getItems(param: string): Promise<SomeType[]> {
    const query = `SELECT * FROM table WHERE column = ?`;
    const rows = db.prepare(query).all(param) as SomeType[];

    return rows;
  }

  static async createItem(data: SomeType): Promise<SomeType> {
    const query = `
      INSERT INTO table (id, name, value)
      VALUES (?, ?, ?)
    `;

    db.prepare(query).run(data.id, data.name, data.value);

    return data;
  }
}
```

### 路由開發規範

```typescript
import express from 'express';
import { SomeController } from '@/controllers/someController';
import { asyncHandler } from '@/middleware/errorHandler';

const router = express.Router();

// GET /api/some/:id
router.get('/:id', asyncHandler(SomeController.getItems));

// POST /api/some
router.post('/', asyncHandler(SomeController.createItem));

export default router;
```

### 錯誤處理

#### 統一錯誤處理中介軟體

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[ErrorHandler]', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
};
```

#### 使用範例

```typescript
router.post('/upload', asyncHandler(UploadController.handleUpload));
```

### 命名慣例

- **控制器類**: PascalCase + `Controller` 後綴（`UserController`）
- **服務類**: PascalCase + `Service` 後綴（`UserService`）
- **路由文件**: camelCase + `Routes` 後綴（`userRoutes.ts`）
- **函數/變數**: camelCase（`getUsers`, `userData`）
- **常量**: UPPER_SNAKE_CASE（`MAX_FILE_SIZE`, `DB_PATH`）
- **類型/介面**: PascalCase（`UserData`, `ProjectConfig`）

## WebSocket 協作功能

### Socket.io 事件架構

#### 事件流程

```
Client                     Server
  |                          |
  |-- authenticate --------->|  驗證使用者
  |<--------- authenticated -|
  |                          |
  |-- join-project --------->|  加入專案
  |<--------- project-joined-|
  |                          |
  |-- chart-change --------->|  圖表變更
  |                          |---> broadcast to others
  |<--------- collaboration-event (from others)
  |                          |
  |-- leave-project -------->|  離開專案
  |<--------- project-left --|
  |                          |
  |-- disconnect ----------->|  斷開連接
```

#### 主要事件

| 事件名稱 | 方向 | 說明 |
|---------|------|------|
| `authenticate` | Client → Server | 使用者認證 |
| `authenticated` | Server → Client | 認證成功 |
| `join-project` | Client → Server | 加入專案協作 |
| `project-joined` | Server → Client | 加入成功，返回活躍用戶 |
| `leave-project` | Client → Server | 離開專案 |
| `project-left` | Server → Client | 離開確認 |
| `data-change` | Client → Server | 數據變更 |
| `chart-change` | Client → Server | 圖表變更 |
| `collaboration-event` | Server → Client | 廣播協作事件 |
| `cursor-move` | Client → Server | 游標移動 |
| `typing` | Client → Server | 打字狀態 |
| `heartbeat` | Client → Server | 心跳檢測 |
| `disconnect` | Client → Server | 斷開連接 |

### 連接管理策略（v2.0 優化）

#### 連接限制

每個用戶最多允許 **3 個並發連接**：

```typescript
// src/handlers/socketHandlers.ts
const userConnections = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 3;

// 超過限制時自動斷開最舊的連接
if (connections.size >= MAX_CONNECTIONS_PER_USER) {
  const oldestSocketId = connections.values().next().value;
  oldestSocket.disconnect(true);
}
```

#### 超時配置

```typescript
// src/index.ts
const io = new SocketIOServer(server, {
  pingTimeout: 10000,        // 10秒無響應後斷開
  pingInterval: 25000,       // 每25秒發送心跳
  connectTimeout: 45000,     // 45秒連接超時
  maxHttpBufferSize: 1e6,    // 1MB
});
```

## 常用開發任務

### 新增 API 端點

1. **定義路由** (`src/routes/newRoutes.ts`)
   ```typescript
   router.get('/items', asyncHandler(NewController.getItems));
   ```

2. **實作控制器** (`src/controllers/newController.ts`)
   ```typescript
   export class NewController {
     static async getItems(req: Request, res: Response) {
       // 實作邏輯
     }
   }
   ```

3. **實作服務** (`src/services/newService.ts`)
   ```typescript
   export class NewService {
     static async getItems(): Promise<Item[]> {
       // 資料庫查詢
     }
   }
   ```

4. **註冊路由** (`src/index.ts`)
   ```typescript
   import newRoutes from '@/routes/newRoutes';
   app.use('/api/new', newRoutes);
   ```

### 新增資料庫表

1. 在 `src/utils/database.ts` 的 `initDatabase()` 函數中添加 CREATE TABLE 語句
2. 定義對應的 TypeScript 介面（在 `shared/types/` 或本地）
3. 重啟服務器以應用變更

### 新增 Socket.io 事件

1. 在 `src/handlers/socketHandlers.ts` 中添加事件處理器
   ```typescript
   socket.on('new-event', async (data) => {
     // 處理邏輯
   });
   ```

2. 在前端 `CollaborationContext` 中訂閱事件

## 測試

### 運行測試（計劃中）

```bash
npm test
```

### API 測試

推薦使用以下工具：
- **Postman**: GUI 工具，適合手動測試
- **Thunder Client** (VS Code): 輕量級 API 測試
- **curl**: 命令行工具

範例：
```bash
# 測試上傳端點
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test.csv"

# 測試數據處理端點
curl -X POST http://localhost:3001/api/data/process \
  -H "Content-Type: application/json" \
  -d '{"fileId": "123", "config": {}}'
```

## 故障排除

### 常見問題

**Q: 為什麼資料庫初始化失敗？**

A: 檢查：
1. `data/` 目錄是否存在且有寫入權限
2. SQLite 是否正確安裝
3. `DATABASE_PATH` 環境變數是否正確

**Q: 為什麼 Socket.io 連接失敗？**

A: 檢查：
1. 前端 `REACT_APP_WS_URL` 是否指向正確的後端地址
2. CORS 設定是否允許前端域名
3. 防火牆是否阻擋端口 3001

**Q: 為什麼文件上傳失敗？**

A: 檢查：
1. `uploads/` 目錄是否存在且有寫入權限
2. 文件大小是否超過限制（默認 50MB）
3. Multer 配置是否正確

**Q: 為什麼 TypeScript 編譯失敗？**

A: 檢查：
1. `shared/types/` 是否已編譯
2. 路徑別名 `@/` 配置是否正確（`tsconfig.json`）
3. 依賴版本是否匹配

### 日誌調試

開啟詳細日誌：
```typescript
// 在控制器或服務中添加
console.log('[ModuleName] Debug info:', data);
```

Socket.io 連接日誌：
```typescript
// backend/src/handlers/socketHandlers.ts 已包含詳細日誌
console.log(`[${io.sockets.sockets.size}] 用戶連接: ${socket.id}`);
```

## 性能優化

### 已實施的優化

1. **資料庫查詢優化**
   - 使用 prepared statements
   - 適當的索引設計

2. **文件處理優化**
   - 流式處理大文件
   - 分塊上傳（前端實作）

3. **Socket.io 優化**
   - 連接數限制（每用戶 3 個）
   - 心跳檢測和自動斷開
   - 事件廣播優化

4. **API 速率限制**
   - 防止 DDoS 攻擊
   - 保護服務器資源

### 優化建議

1. **資料庫**
   - 考慮升級到 PostgreSQL（大規模部署）
   - 實作連接池
   - 添加資料庫索引

2. **緩存**
   - 引入 Redis 緩存（用戶會話、熱點數據）
   - 實作 HTTP 緩存標頭

3. **擴展性**
   - 使用 PM2 或 Docker 部署多實例
   - 考慮微服務架構（大規模應用）

## 安全性

### 已實施的安全措施

1. **Helmet**: 設定安全的 HTTP 標頭
2. **CORS**: 限制跨域請求來源
3. **速率限制**: 防止 API 濫用
4. **文件驗證**: 檢查文件類型和大小
5. **SQL 注入防護**: 使用 prepared statements

### 安全建議

1. **生產環境**
   - 更改 `SESSION_SECRET`
   - 啟用 HTTPS
   - 使用環境變數管理敏感資訊

2. **認證** （v2.1+ 計劃中）
   - 實作 JWT 或 OAuth
   - 添加權限系統

3. **資料驗證**
   - 使用 Joi 或 Zod 驗證請求數據
   - 清理使用者輸入

## 部署

### 生產環境部署步驟

1. 構建 TypeScript
   ```bash
   npm run build
   ```

2. 設定生產環境變數（`.env.production`）

3. 啟動服務器
   ```bash
   NODE_ENV=production npm start
   ```

4. 使用 PM2 管理程序（推薦）
   ```bash
   pm2 start dist/index.js --name data-analyzer-backend
   pm2 save
   pm2 startup
   ```

詳細部署指南：[DEPLOYMENT.md](../docs/DEPLOYMENT.md)

## 相關文檔

- [專案主 README](../README.md)
- [系統架構文檔](../docs/ARCHITECTURE.md)
- [API 參考文檔](../docs/API_REFERENCE.md)
- [前端開發文檔](../frontend/README.md)
- [貢獻指南](../CONTRIBUTING.md)

## 支援

如有問題，請參閱：
- [常見問題](../docs/USER_GUIDE.md#常見問題)
- [GitHub Issues](https://github.com/your-repo/issues)
- 專案文檔：`docs/` 目錄

---

**版本歷史**:
- v2.0 (2025-01-12): 初始版本，移除 Python 依賴，優化 WebSocket 連接管理
