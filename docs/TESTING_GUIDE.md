# Data Analyzer 測試指南 (Testing Guide)

**版本**: 2.0
**最後更新**: 2025-01-12

本文檔提供 Data Analyzer v2.0 核心功能的完整測試指南，包含 WebSocket 連接優化、圖表導出功能、以及專案保存流程的測試步驟。

---

## 目錄

1. [測試環境準備](#測試環境準備)
2. [WebSocket 連接優化測試](#websocket-連接優化測試)
3. [圖表導出功能測試](#圖表導出功能測試)
4. [專案保存和查看流程測試](#專案保存和查看流程測試)
5. [測試報告模板](#測試報告模板)

---

## 測試環境準備

### 前置要求

1. **啟動應用**
   ```bash
   # 在專案根目錄
   npm run dev
   ```
   確保前端 (http://localhost:3000) 和後端 (http://localhost:3001) 都已啟動。

2. **準備測試數據**
   - 準備一個 CSV 測試文件（至少包含 3 列數據）
   - 確保數據包含數值欄位（用於圖表生成）

3. **開啟開發者工具**
   - 在瀏覽器中按 F12 打開開發者工具
   - 切換到 "Network" (網路) 標籤頁
   - 篩選器設置為 "WS" (WebSocket)

4. **準備多個瀏覽器標籤頁**
   - 用於測試多連接場景

---

## WebSocket 連接優化測試

### 測試目標

驗證 v2.0 中的 WebSocket 連接管理優化，確保：
- 每用戶最多 3 個連接
- 防止重複連接到同一專案
- 組件卸載時正確清理連接

### 測試場景 A: 多標籤頁連接限制

**目的**: 驗證連接數限制（最多 3 個）

**步驟**:

1. **打開第一個標籤頁**
   - 訪問 http://localhost:3000
   - 上傳測試數據文件
   - 完成所有分析步驟，進入協作頁面

2. **開啟開發者工具 - Network 標籤**
   - 篩選 WebSocket 連接 (WS)
   - 記錄當前 WebSocket 連接數 (應為 1)

3. **複製標籤頁 3 次** (總共 4 個標籤頁)
   - 在每個新標籤頁中打開 http://localhost:3000
   - 上傳相同的測試文件
   - 進入協作頁面

4. **檢查連接數**
   - 在開發者工具的 Network → WS 中查看 WebSocket 連接
   - **預期結果**: 只有最近的 3 個連接處於 "active" 狀態
   - **預期行為**: 第 4 個連接建立時，第 1 個連接應被自動斷開

5. **驗證後端日誌** (可選)
   ```bash
   # 查看後端控制台輸出
   # 應看到類似訊息:
   # "Max connections (3) reached for user xxx, disconnecting oldest"
   ```

**預期結果**:
- ✅ WebSocket 連接數不超過 3 個
- ✅ 最舊的連接被自動斷開
- ✅ 新連接正常建立
- ✅ 無 "Insufficient resources" 錯誤

**失敗指標**:
- ❌ 連接數超過 3 個
- ❌ 出現 "EADDRINUSE" 或資源不足錯誤
- ❌ 無法建立新連接

---

### 測試場景 B: 重複連接防護

**目的**: 驗證防止重複連接到同一專案

**步驟**:

1. **準備測試環境**
   - 打開瀏覽器標籤頁
   - 完成數據分析流程，進入協作頁面

2. **檢查初始連接**
   - 開發者工具 → Network → WS
   - 確認已建立 1 個 WebSocket 連接

3. **觸發重複連接** (嘗試以下任一方式)
   - 快速刷新頁面 (F5)
   - 快速切換路由 (返回再進入協作頁面)
   - 快速點擊 "Start Collaboration" 按鈕多次

4. **觀察連接行為**
   - 查看 Network → WS 連接列表
   - **預期**: 不應該看到多個並行連接到同一個 projectId

5. **檢查控制台**
   ```javascript
   // 應該看到類似訊息（如果有重複連接嘗試）:
   // "Already connecting to project xxx, skipping..."
   // 或
   // "Already connected to project xxx"
   ```

**預期結果**:
- ✅ 相同 projectId 只有 1 個活動連接
- ✅ 重複連接請求被阻止
- ✅ `isConnecting` 標誌正確工作
- ✅ 無連接泄漏

**失敗指標**:
- ❌ 看到多個連接到同一 projectId
- ❌ 連接數持續增加
- ❌ 出現 "already exists" 錯誤

---

### 測試場景 C: 組件卸載清理

**目的**: 驗證組件卸載時連接正確清理

**步驟**:

1. **建立連接**
   - 進入協作頁面
   - 確認 WebSocket 連接已建立

2. **記錄初始連接數**
   - 開發者工具 → Network → WS
   - 記下當前連接數 (例如: 1)

3. **執行導航操作**
   - 點擊瀏覽器返回按鈕 (離開協作頁面)
   - 或使用應用內導航返回首頁

4. **檢查連接狀態**
   - 在 Network → WS 中查看連接
   - **預期**: 之前的連接應顯示為 "closed" 或 "finished"

5. **重複測試**
   - 再次進入協作頁面 → 離開 (重複 3-5 次)
   - 每次都檢查連接是否正確關閉

6. **長期測試**
   - 執行導航 10 次
   - 最終連接數應為 1 (當前頁面) 或 0 (如果已離開協作頁面)

**預期結果**:
- ✅ 組件卸載時連接立即關閉
- ✅ 重複導航不會積累連接
- ✅ useEffect cleanup 函數正常執行
- ✅ 最終連接數 ≤ 1

**失敗指標**:
- ❌ 離開頁面後連接仍然 "active"
- ❌ 連接數持續累積
- ❌ 內存或資源泄漏跡象

---

## 圖表導出功能測試

### 測試目標

驗證圖表導出功能正常工作，包含：
- Chart.js 圖表導出為 PNG
- Plotly 圖表導出為 PNG/SVG
- 導出文件正確生成和下載

### 測試場景 A: Chart.js 圖表導出 (PNG)

**目的**: 驗證基礎圖表 (線性圖、柱狀圖) 的 PNG 導出

**步驟**:

1. **生成圖表**
   - 上傳包含數值數據的 CSV 文件
   - 進入 "Charts" 步驟
   - 選擇 "Line Chart" (線性圖)
   - 配置 X 軸和 Y 軸
   - 點擊 "Generate Chart"

2. **驗證圖表顯示**
   - 確認圖表正確渲染
   - 檢查圖表包含數據點

3. **執行導出**
   - 點擊 "Export as PNG" 按鈕
   - 觀察下載行為

4. **驗證導出文件**
   - 檢查瀏覽器下載目錄
   - 文件名格式: `chart-YYYY-MM-DD-HHmmss.png`
   - 打開 PNG 文件，確認:
     - ✅ 圖表完整顯示
     - ✅ 標題、軸標籤清晰
     - ✅ 數據點可見
     - ✅ 圖例正確

5. **重複測試其他圖表類型**
   - Bar Chart (柱狀圖)
   - 每種類型都測試導出

**預期結果**:
- ✅ PNG 文件成功下載
- ✅ 文件大小合理 (通常 50KB - 500KB)
- ✅ 圖片清晰，無失真
- ✅ 無 "ref is null" 錯誤

**失敗指標**:
- ❌ 點擊導出無反應
- ❌ 出現 "Cannot read property 'toBase64Image' of null" 錯誤
- ❌ 下載的文件損壞或無法打開
- ❌ 圖表不完整或失真

---

### 測試場景 B: Plotly 圖表導出 (PNG 和 SVG)

**目的**: 驗證進階圖表 (散點圖、箱型圖) 的多格式導出

**步驟**:

1. **生成 Plotly 圖表**
   - 選擇 "Scatter Plot" (散點圖)
   - 配置 X 軸和 Y 軸（數值欄位）
   - 可選: 設置分組 (Group By)
   - 點擊 "Generate Chart"

2. **PNG 導出測試**
   - 點擊 "Export as PNG" 按鈕
   - 等待下載完成
   - 驗證文件:
     - 文件名: `scatter-plot-YYYY-MM-DD-HHmmss.png`
     - 打開圖片，檢查數據點、軸標籤、圖例

3. **SVG 導出測試**
   - 點擊 "Export as SVG" 按鈕
   - 等待下載完成
   - 驗證文件:
     - 文件名: `scatter-plot-YYYY-MM-DD-HHmmss.svg`
     - 用瀏覽器或向量圖編輯器打開
     - 確認為可縮放向量圖 (無失真)

4. **測試其他 Plotly 圖表**
   - Box Plot (箱型圖)
   - Heatmap (熱力圖) - 如果支援
   - 每種都測試 PNG 和 SVG 導出

**預期結果**:
- ✅ PNG 和 SVG 都成功下載
- ✅ SVG 文件可縮放，無失真
- ✅ 導出按鈕響應快速 (< 2 秒)
- ✅ 文件內容完整

**失敗指標**:
- ❌ SVG 導出功能不可用
- ❌ 下載的 SVG 文件為空或損壞
- ❌ PNG 導出超時或失敗
- ❌ 圖表互動元素 (tooltips) 影響導出

---

### 測試場景 C: 導出錯誤處理

**目的**: 驗證異常情況下的錯誤處理

**步驟**:

1. **未生成圖表時嘗試導出**
   - 在 Charts 頁面，不生成圖表
   - 直接點擊 "Export" 按鈕
   - **預期**: 顯示友好錯誤訊息 (例如: "Please generate a chart first")

2. **網路中斷模擬** (可選)
   - 開發者工具 → Network → Offline
   - 嘗試導出圖表
   - **預期**: 顯示網路錯誤提示

3. **瀏覽器兼容性測試**
   - 在不同瀏覽器測試 (Chrome, Firefox, Edge)
   - 確認導出功能在所有瀏覽器都正常

**預期結果**:
- ✅ 錯誤訊息清晰易懂
- ✅ 不會導致應用崩潰
- ✅ 用戶可以重試

---

## 專案保存和查看流程測試

### 測試目標

驗證完整的專案保存和查看流程，包含：
- 數據分析配置保存
- 導航到專案列表
- 專案詳情查看
- API 端點正確性

### 測試場景: 端到端專案保存流程

**步驟**:

#### 1. 完成數據分析流程

```
步驟 1: Upload Data
  → 上傳 CSV 文件
  → 確認文件顯示在列表中

步驟 2: Select Unique ID
  → 選擇唯一識別碼欄位
  → 點擊 "Next"

步驟 3: Clean Data
  → 選擇性執行數據清理
  → 點擊 "Next"

步驟 4: Charts
  → 生成 1-2 個圖表
  → 驗證圖表正確顯示

步驟 5: Collaboration
  → 進入協作頁面
```

#### 2. 保存專案

1. **填寫專案信息**
   - 專案名稱: "Test Project - WebSocket Optimization"
   - 專案描述 (可選): "Testing v2.0 features"

2. **點擊 "Save Project" 按鈕**
   - 觀察保存過程
   - 檢查是否有錯誤訊息

3. **驗證保存成功提示**
   - 應顯示成功訊息: "Project saved successfully!"
   - 出現 "View Project" 按鈕

4. **檢查 Network 請求**
   - 開發者工具 → Network
   - 應看到 POST 請求到 `/api/projects`
   - 狀態碼: 200 OK
   - 響應包含 projectId

#### 3. 導航到專案列表

1. **點擊 "View Project" 按鈕** (v2.0 新功能)
   - 應自動導航到 `/projects` 頁面

2. **驗證專案列表頁面**
   - 確認頁面加載成功
   - 檢查 Network → API 請求到 `/api/projects`
   - 狀態碼: 200 OK

3. **找到剛保存的專案**
   - 在專案列表中查找 "Test Project - WebSocket Optimization"
   - 驗證顯示:
     - ✅ 專案名稱正確
     - ✅ 創建日期顯示
     - ✅ 協作者數量 (至少 1)
     - ✅ 數據文件數量

#### 4. 查看專案詳情

1. **點擊專案卡片**
   - 應導航到 `/projects/:projectId` 頁面

2. **驗證專案詳情頁面**
   - **基本信息**:
     - 專案名稱
     - 描述
     - 創建日期
     - 擁有者資訊

   - **數據文件列表**:
     - 文件名稱
     - 文件大小
     - 上傳日期
     - 預覽/下載按鈕

   - **圖表配置**:
     - 顯示已保存的圖表配置
     - 圖表類型、軸設置

3. **測試數據文件操作**
   - 點擊 "Preview" - 應顯示數據預覽
   - 點擊 "Download" - 應下載原始文件

4. **測試重新載入圖表** (如果支援)
   - 點擊圖表配置
   - 應根據保存的配置重新生成圖表

#### 5. API 端點驗證

**使用開發者工具或 API 測試工具驗證以下端點**:

1. **GET /api/projects**
   ```
   預期響應: 200 OK
   Body: Array of projects
   ```

2. **GET /api/projects/:projectId**
   ```
   預期響應: 200 OK
   Body: {
     id, name, description, ownerId,
     createdAt, updatedAt,
     collaborators: [],
     dataFiles: [],
     charts: []
   }
   ```

3. **POST /api/projects**
   ```
   預期響應: 201 Created
   Body: { projectId, message }
   ```

4. **PUT /api/projects/:projectId** (如果支援)
   ```
   預期響應: 200 OK
   ```

### 預期結果總結

**保存流程**:
- ✅ 專案成功保存到資料庫
- ✅ 返回 projectId
- ✅ 顯示成功訊息和 "View Project" 按鈕

**專案列表**:
- ✅ 正確顯示所有專案
- ✅ 專案資訊完整
- ✅ 可點擊查看詳情

**專案詳情**:
- ✅ 所有數據正確顯示
- ✅ 數據文件可預覽/下載
- ✅ 圖表配置可查看

**API 端點**:
- ✅ 所有端點返回正確狀態碼
- ✅ 數據格式符合預期
- ✅ 無 404 或 500 錯誤

### 失敗指標

**保存流程**:
- ❌ 保存時出現 404 錯誤
- ❌ 無法保存到資料庫
- ❌ 未顯示成功訊息

**專案列表**:
- ❌ 列表為空或顯示錯誤
- ❌ API 請求失敗
- ❌ 專案資訊不完整

**專案詳情**:
- ❌ 頁面無法加載
- ❌ 數據文件列表為空
- ❌ 圖表配置遺失

**API 端點**:
- ❌ 404 Not Found
- ❌ 500 Internal Server Error
- ❌ 響應數據格式錯誤

---

## 測試報告模板

### 測試執行報告

**測試日期**: YYYY-MM-DD
**測試人員**: [姓名]
**應用版本**: 2.0
**瀏覽器**: Chrome/Firefox/Edge [版本號]

---

#### 1. WebSocket 連接優化測試

| 測試場景 | 結果 | 備註 |
|---------|------|------|
| 場景 A: 多標籤頁連接限制 | ☐ Pass ☐ Fail | |
| 場景 B: 重複連接防護 | ☐ Pass ☐ Fail | |
| 場景 C: 組件卸載清理 | ☐ Pass ☐ Fail | |

**連接數測量結果**:
- 初始連接數: ___
- 4 個標籤頁後連接數: ___
- 10 次導航後連接數: ___

**發現的問題**:
```
1. [問題描述]
   - 重現步驟:
   - 預期行為:
   - 實際行為:
   - 嚴重程度: Critical / High / Medium / Low
```

---

#### 2. 圖表導出功能測試

| 圖表類型 | PNG 導出 | SVG 導出 | 備註 |
|---------|---------|---------|------|
| Line Chart | ☐ Pass ☐ Fail | N/A | |
| Bar Chart | ☐ Pass ☐ Fail | N/A | |
| Scatter Plot | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |
| Box Plot | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |

**文件驗證**:
- PNG 文件大小範圍: ___ KB - ___ KB
- SVG 文件可正常打開: ☐ Yes ☐ No
- 圖表內容完整性: ☐ 完整 ☐ 部分遺失 ☐ 完全失敗

**發現的問題**:
```
[同上格式]
```

---

#### 3. 專案保存和查看流程測試

| 測試步驟 | 結果 | 備註 |
|---------|------|------|
| 專案保存 | ☐ Pass ☐ Fail | |
| 導航到專案列表 | ☐ Pass ☐ Fail | |
| 查看專案詳情 | ☐ Pass ☐ Fail | |
| 數據文件預覽 | ☐ Pass ☐ Fail | |
| API 端點驗證 | ☐ Pass ☐ Fail | |

**API 端點測試結果**:
- GET /api/projects: ☐ 200 OK ☐ 失敗
- GET /api/projects/:id: ☐ 200 OK ☐ 失敗
- POST /api/projects: ☐ 201 Created ☐ 失敗

**發現的問題**:
```
[同上格式]
```

---

#### 總結

**總體測試結果**: ☐ 通過 ☐ 部分通過 ☐ 失敗

**關鍵發現**:
1.
2.
3.

**建議修復優先級**:
1. [Critical]
2. [High]
3. [Medium]

**下一步行動**:
- [ ] 修復關鍵問題
- [ ] 重新測試失敗場景
- [ ] 更新文檔

---

## 附錄: 故障排除

### WebSocket 問題

**問題**: 連接數超過 3 個
```javascript
// 檢查 backend/src/handlers/socketHandlers.ts
// 確認 MAX_CONNECTIONS_PER_USER = 3
```

**問題**: 連接未清理
```javascript
// 檢查 frontend 組件的 useEffect cleanup
useEffect(() => {
  return () => {
    socket.disconnect();
  };
}, []);
```

### 圖表導出問題

**問題**: "ref is null" 錯誤
```javascript
// 確認 chart ref 已正確設置
const chartRef = useRef<any>(null);
// 確認 forwardRef 正確傳遞
```

**問題**: 下載未觸發
```javascript
// 檢查瀏覽器下載權限
// 嘗試手動觸發下載:
const a = document.createElement('a');
a.href = dataUrl;
a.download = filename;
a.click();
```

### 專案保存問題

**問題**: 404 錯誤
```bash
# 檢查後端路由註冊
# backend/src/routes/projectRoutes.ts
router.post('/api/projects', projectController.createProject);
```

**問題**: 資料庫錯誤
```bash
# 檢查資料庫文件
ls -la backend/data/analyzer.db

# 檢查資料表
sqlite3 backend/data/analyzer.db ".tables"
```

---

**文檔結束** - 如有問題，請參考 [API_REFERENCE.md](API_REFERENCE.md) 或聯繫開發團隊。
