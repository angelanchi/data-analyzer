# 故障排查指南 (Troubleshooting Guide)

> **目標讀者**: 所有開發者和使用者
> **更新日期**: 2025-11-14

## 目錄 (Table of Contents)

1. [前端問題](#前端問題-frontend-issues)
2. [後端問題](#後端問題-backend-issues)
3. [數據處理問題](#數據處理問題-data-processing-issues)
4. [圖表渲染問題](#圖表渲染問題-chart-rendering-issues)
5. [編譯和構建問題](#編譯和構建問題-compilation-and-build-issues)
6. [部署問題](#部署問題-deployment-issues)

---

## 前端問題 (Frontend Issues)

### 問題 1: 前端無法啟動

**症狀**:
```
Error: Cannot find module ...
```

**解決方案**:
```bash
# 1. 清除 node_modules 和鎖定文件
cd frontend
rm -rf node_modules package-lock.json

# 2. 重新安裝依賴
npm install

# 3. 重新啟動
npm start
```

**常見原因**:
- 依賴版本衝突
- node_modules 損壞
- npm cache 問題

**預防措施**:
```bash
# 定期清理 npm cache
npm cache clean --force

# 使用固定版本的依賴（package-lock.json）
# 確保團隊使用相同的 Node.js 版本
```

---

### 問題 2: 組件不顯示或白屏

**症狀**:
- 頁面空白
- 組件不渲染
- 控制台沒有明顯錯誤

**檢查步驟**:

#### Step 1: 檢查瀏覽器控制台
打開瀏覽器開發者工具 (F12)，查看：
- Console 標籤：是否有JavaScript錯誤
- Network 標籤：API請求是否成功
- React DevTools：組件是否掛載

#### Step 2: 檢查條件渲染
```typescript
// ❌ 錯誤：可能因為 loading 始終為 true
{loading && <CircularProgress />}
{!loading && data.length > 0 && <MyComponent data={data} />}

// ✅ 正確：添加調試日誌
console.log('Render conditions:', { loading, dataLength: data.length });
{loading && <CircularProgress />}
{!loading && data.length > 0 && <MyComponent data={data} />}
```

#### Step 3: 檢查 Props 傳遞
```typescript
// 在組件內添加日誌
const MyComponent = (props) => {
  console.log('MyComponent Props:', props);
  // ...
};
```

**常見原因**:
- 數據未正確載入
- 條件渲染邏輯錯誤
- Props 未正確傳遞
- CSS 問題（組件被隱藏）

---

### 問題 3: 路由無法正常工作

**症狀**:
- 點擊鏈接沒有反應
- 頁面刷新後 404 錯誤
- 路徑不匹配

**解決方案**:

#### 問題：React Router 路徑不匹配
```typescript
// ❌ 錯誤
<Route path="analysis" element={<AnalysisPage />} />  // 缺少 '/'

// ✅ 正確
<Route path="/analysis" element={<AnalysisPage />} />
```

#### 問題：瀏覽器刷新後 404
```typescript
// 開發環境：確保 package.json 有正確配置
{
  "homepage": ".",  // React App 根路徑
}

// 生產環境：配置服務器重定向所有路由到 index.html
```

---

### 問題 4: API 請求失敗

**症狀**:
```
Network Error
CORS Error
404 Not Found
```

**解決方案**:

#### CORS 錯誤
```typescript
// backend/src/index.ts
app.use(cors({
  origin: 'http://localhost:3000',  // 前端地址
  credentials: true
}));
```

#### 網絡錯誤（無法連接到後端）
```bash
# 1. 檢查後端是否運行
cd backend
npm run dev

# 2. 檢查後端端口（預設 3001）
# 瀏覽器訪問：http://localhost:3001/api/health

# 3. 檢查前端 API 配置
# frontend/src/services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

#### 404 Not Found
```typescript
// 檢查 API 路徑是否正確
// 前端：/api/data/process
// 後端：router.post('/process', ...)  // 注意路徑匹配

// 正確的後端路由設置：
// backend/src/routes/dataRoutes.ts
router.post('/process', asyncHandler(dataController.processData));

// backend/src/index.ts
app.use('/api/data', dataRoutes);  // 最終路徑: /api/data/process
```

---

## 後端問題 (Backend Issues)

### 問題 5: 後端無法啟動

**症狀**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**解決方案**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>

# 或更改端口（backend/.env）
PORT=3002
```

---

### 問題 6: TypeScript 編譯錯誤

**症狀**:
```
TSError: ⨯ Unable to compile TypeScript:
src/handlers/socketHandlers.ts(35,57): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

**解決方案**:
```typescript
// ❌ 錯誤：未處理 undefined 情況
const value: string | undefined = getValue();
processString(value);  // 錯誤：可能是 undefined

// ✅ 正確：添加類型檢查
const value: string | undefined = getValue();
if (value !== undefined) {
  processString(value);
}

// 或使用可選鏈和默認值
processString(value ?? 'default-value');
```

**常見類型錯誤**:
```typescript
// 1. 可選屬性訪問
const user = await getUser();
console.log(user.name);  // ❌ user 可能是 null
console.log(user?.name); // ✅ 安全訪問

// 2. 數組訪問
const items = getItems();
const first = items[0];  // ❌ items[0] 可能是 undefined
const first = items[0] ?? null;  // ✅ 明確處理

// 3. API 響應
const response = await api.get('/data');
const data = response.data;  // ❌ 缺少類型檢查
const data: DataType = response.data as DataType;  // ✅ 類型斷言
```

---

### 問題 7: 數據庫錯誤

**症狀**:
```
SQLITE_ERROR: no such column: updated_at
```

**解決方案**:
```bash
# 1. 檢查數據庫初始化
cd backend
rm -f database.sqlite  # 刪除舊數據庫
npm run dev  # 重新創建數據庫

# 2. 檢查數據庫 schema
# backend/src/utils/database.ts
# 確保表結構包含所需欄位
```

**預防措施**:
- 使用數據庫遷移工具
- 版本控制 schema 定義
- 添加欄位存在性檢查

---

## 數據處理問題 (Data Processing Issues)

### 問題 8: 數據轉換失敗

**症狀**:
```
Error: Cannot read property 'Voltage' of undefined
數據預覽為空
```

**檢查清單**:

#### 1. 檢查輸入數據格式
```typescript
// 在 createDataViews 前添加日誌
console.log('Input Data Sample:', data.slice(0, 3));
console.log('Data Length:', data.length);
console.log('First Row Keys:', Object.keys(data[0] || {}));
```

#### 2. 檢查欄位名稱
```typescript
// 常見問題：欄位名稱大小寫不匹配
const availableFields = Object.keys(data[0]);
console.log('Available Fields:', availableFields);

// 檢查選擇的欄位是否存在
const selectedMetrics = ['Voltage_stat', 'Current_stat'];
const missingFields = selectedMetrics.filter(field => !availableFields.includes(field));
if (missingFields.length > 0) {
  console.error('Missing Fields:', missingFields);
}
```

#### 3. 檢查數據類型
```typescript
// 確保數值欄位是數字
data.forEach((row, index) => {
  Object.entries(row).forEach(([key, value]) => {
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      console.warn(`Row ${index}, Field ${key}: String number detected`);
    }
  });
});
```

---

### 問題 9: 清理規則不生效

**症狀**:
- 數據沒有被過濾
- 保留率 100%
- 清理前後數據相同

**檢查步驟**:

#### 1. 檢查規則是否啟用
```typescript
const activeRules = rules.filter(rule => rule.enabled);
console.log('Active Rules:', activeRules.length);

// 確保規則的 enabled 為 true
rules.forEach((rule, index) => {
  console.log(`Rule ${index}:`, {
    field: rule.field,
    enabled: rule.enabled,
    minValue: rule.minValue,
    maxValue: rule.maxValue
  });
});
```

#### 2. 檢查欄位值範圍
```typescript
// 檢查實際數據是否在設定範圍外
const field = 'Voltage';
const values = data.map(row => row[field]).filter(v => v != null);
console.log('Field Range:', {
  min: Math.min(...values),
  max: Math.max(...values),
  ruleMin: rule.minValue,
  ruleMax: rule.maxValue
});
```

#### 3. 檢查數據類型匹配
```typescript
// 常見問題：字串與數字比較
const value = '3.7';  // 字串
const minValue = 3.0;  // 數字

// ❌ 錯誤：字串比較
if (value >= minValue) { ... }  // 可能不符合預期

// ✅ 正確：轉換為數字
const numValue = parseFloat(value);
if (!isNaN(numValue) && numValue >= minValue) { ... }
```

---

## 圖表渲染問題 (Chart Rendering Issues)

### 問題 10: Plotly 圖表不顯示

**症狀**:
- 散點圖空白
- 控制台顯示 Plotly 錯誤
- 圖表容器為空

**解決方案**:

#### 1. 檢查瀏覽器擴展衝突
```typescript
// frontend/src/utils/chartSafetyCheck.ts
const warnings = checkPlotlyConflicts();
if (warnings.length > 0) {
  console.warn('Plotly 衝突警告:', warnings);
  // 建議：暫時禁用可疑的瀏覽器擴展
}
```

常見衝突的擴展：
- 廣告攔截器
- 隱私保護擴展
- Script 攔截器

**臨時解決方案**：
- 使用無痕模式
- 禁用所有擴展後測試

#### 2. 檢查數據格式
```typescript
// Plotly 要求特定的數據格式
const plotlyData = {
  x: data.map(row => row[config.xAxis]),  // 必須是數組
  y: data.map(row => row[config.yAxis]),  // 必須是數組
  mode: 'markers',
  type: 'scatter'
};

console.log('Plotly Data:', {
  xLength: plotlyData.x.length,
  yLength: plotlyData.y.length,
  xSample: plotlyData.x.slice(0, 3),
  ySample: plotlyData.y.slice(0, 3)
});
```

#### 3. 檢查容器尺寸
```typescript
// 確保圖表容器有明確的寬高
<div ref={chartRef} style={{ width: 800, height: 400 }}>
  <Plot data={plotlyData} layout={layout} />
</div>
```

---

### 問題 11: Chart.js 圖表顏色異常

**症狀**:
- 柱狀圖顏色全部相同
- 圖例不正確

**解決方案**:
```typescript
// 確保每個數據集有不同的顏色
const COLORS = [
  'rgba(54, 162, 235, 0.8)',
  'rgba(255, 99, 132, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(255, 206, 86, 0.8)',
];

const datasets = yFields.map((field, index) => ({
  label: field,
  data: data.map(row => row[field]),
  backgroundColor: COLORS[index % COLORS.length],  // 循環使用顏色
  borderColor: COLORS[index % COLORS.length].replace('0.8', '1'),
  borderWidth: 1
}));
```

---

### 問題 12: 圖表導出失敗

**症狀**:
```
Error: Cannot read property 'toDataURL' of null
導出的圖片為空
```

**解決方案**:
```typescript
// 確保 ref 已正確設置
const chartRef = useRef<any>(null);

<ChartRenderer ref={chartRef} data={data} config={config} />

// 導出前檢查 ref
const handleExport = () => {
  if (!chartRef.current) {
    console.error('Chart ref is null');
    return;
  }

  try {
    exportChartAsPNG(chartRef.current, 'my-chart.png');
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

---

## 編譯和構建問題 (Compilation and Build Issues)

### 問題 13: ESLint 錯誤過多

**症狀**:
```
  Line 120:80:  Line too long (max 100 characters)  max-len
  Line 125:15:  'data' is missing in props validation  react/prop-types
```

**解決方案**:

#### 1. 自動修復
```bash
npm run lint:fix
```

#### 2. 調整 ESLint 規則
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'max-len': ['warn', { code: 120 }],  // 放寬行長限制
    'react/prop-types': 'off',  // 使用 TypeScript 代替 prop-types
  }
};
```

#### 3. 逐項修復
```typescript
// max-len: 拆分長行
// ❌ 錯誤
const result = await api.post('/api/data/process', { fileId, cleaningRules, options, metadata });

// ✅ 正確
const result = await api.post('/api/data/process', {
  fileId,
  cleaningRules,
  options,
  metadata
});
```

---

### 問題 14: TypeScript 嚴格模式錯誤

**症狀**:
```
Object is possibly 'null'
Object is possibly 'undefined'
```

**解決方案**:
```typescript
// 1. 可選鏈
const value = user?.profile?.name;  // 安全訪問深層屬性

// 2. 空值合併
const name = user?.name ?? 'Guest';  // 提供默認值

// 3. 類型守衛
function isValidUser(user: User | null): user is User {
  return user !== null && user.id !== undefined;
}

if (isValidUser(user)) {
  // TypeScript 知道這裡 user 不是 null
  console.log(user.id);
}

// 4. 非空斷言（謹慎使用）
const value = getValue()!;  // 告訴 TypeScript 這絕不是 null/undefined
```

---

## 部署問題 (Deployment Issues)

### 問題 15: 生產構建失敗

**症狀**:
```
npm run build
...
Error: Build failed
```

**解決方案**:

#### 1. 檢查環境變量
```bash
# 前端 .env.production
REACT_APP_API_URL=https://your-api.com/api

# 確保所有必需的環境變量都已設置
```

#### 2. 增加 Node.js 內存
```bash
# package.json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max_old_space_size=4096 react-scripts build"
  }
}
```

#### 3. 清除緩存後重建
```bash
rm -rf node_modules build
npm install
npm run build
```

---

### 問題 16: 部署後 API 調用失敗

**症狀**:
- 本地運行正常
- 部署後 API 請求 404

**解決方案**:

#### 1. 檢查 API 基礎 URL
```typescript
// 確保生產環境使用正確的 API 地址
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// 檢查環境變量是否正確設置
console.log('API Base URL:', API_BASE_URL);
```

#### 2. 檢查 CORS 配置
```typescript
// backend/src/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

#### 3. 檢查反向代理配置
```nginx
# Nginx 配置示例
location /api/ {
  proxy_pass http://backend:3001/api/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

---

## 獲取幫助 (Getting Help)

### 調試技巧

#### 1. 啟用詳細日誌
```typescript
// 前端
localStorage.setItem('DEBUG', 'true');

// 後端
DEBUG=* npm run dev
```

#### 2. 使用 React DevTools
- 安裝瀏覽器擴展
- 檢查組件樹
- 查看 Props 和 State

#### 3. 使用 Network 標籤
- 查看所有 API 請求
- 檢查請求/響應數據
- 確認狀態碼

### 報告問題

提交 Issue 時請包含：
1. **問題描述**：清楚描述遇到的問題
2. **重現步驟**：列出導致問題的具體步驟
3. **預期行為**：說明應該發生什麼
4. **實際行為**：說明實際發生了什麼
5. **環境信息**：
   - Node.js 版本
   - npm 版本
   - 操作系統
   - 瀏覽器版本
6. **錯誤日誌**：完整的錯誤訊息和堆棧追蹤
7. **截圖**：如果適用

---

## 延伸閱讀 (Further Reading)

- [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md) - 數據流向指南
- [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) - 組件架構指南
- [COMMON_TASKS.md](./COMMON_TASKS.md) - 常見開發任務
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 貢獻指南
