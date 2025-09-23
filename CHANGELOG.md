# 變更日誌 (Changelog)

本文檔記錄 Data Analyzer 專案的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Planned
- 即時多人協作功能
- 進階統計分析功能 (v2.1+)
- 更多圖表類型支援
- 使用者認證和權限管理
- 資料版本控制和歷史記錄

## [2.0.0] - 2025-01-12

### 🎉 重大變更 (Breaking Changes)

#### 移除 Python 依賴
- **移除** Python 分析管線和相關依賴
- **移除** `requirements.txt` 文件
- **移除** `analysis_pipeline.py` 腳本
- **移除** `pythonPipelineService.ts` 服務
- **原因**: 簡化技術棧，專注於 Node.js/TypeScript 生態系統

#### 移除外部工具
- **移除** `column_cleaning/` Excel 清理工具目錄
- **原因**: 該工具為獨立模組，與主應用無直接關聯

### ✨ 新增功能 (Added)

#### 開發文檔
- **新增** `frontend/README.md` - 前端開發完整指南
- **新增** `backend/README.md` - 後端開發完整指南
- **新增** `CONTRIBUTING.md` - 代碼貢獻流程和規範
- **新增** `CHANGELOG.md` - 版本變更歷史記錄
- **新增** `shared/README.md` - TypeScript 類型共享說明

#### WebSocket 連接管理優化
- **新增** 每用戶最大連接數限制（3 個）
- **新增** 連接超時配置（pingTimeout, pingInterval）
- **新增** 連接幂等性檢查，防止重複連接
- **新增** 組件卸載時的連接清理機制

#### 專案保存用戶體驗改善
- **新增** 保存成功後的"查看專案"導航按鈕
- **新增** ProjectsPage 實際 API 整合（替代模擬數據）

### 🔧 改進 (Changed)

#### 文檔改進
- **更新** 根目錄 `README.md`
  - 改進專案結構描述
  - 新增開發文檔連結
  - 更新貢獻指南部分
- **更新** `DEPLOYMENT_README.md`
  - 添加版本號和更新日期
- **更新** `.gitignore`
  - 排除 `shared/types/` 編譯產物

#### 代碼改進
- **重構** `analysisJobQueue.ts` - 移除 Python 依賴，標記為計劃中功能
- **重構** `analysisController.ts` - 使用本地類型定義
- **優化** Socket.io 連接處理邏輯
- **優化** 前端組件的 ref 轉發機制

#### 架構改進
- **統一** 錯誤處理機制
- **改進** 資料庫連接管理
- **優化** API 端點組織

### 🐛 修復 (Fixed)

#### Bug 修復
- **修復** WebSocket 連接泄漏問題（從 240+ 連接降至正常的 1-3 個）
- **修復** 圖表導出 ref 為 null 的問題
- **修復** 專案保存 404 錯誤
- **修復** AnalysisPage 組件卸載時未清理連接

#### 依賴修復
- **修復** `analysisJobQueue.ts` 對已刪除服務的依賴
- **修復** `analysisController.ts` 類型導入路徑

### 🗑️ 移除 (Removed)

#### 文件和目錄
- 刪除 `column_cleaning/` 目錄及其所有內容
- 刪除 `backend/src/services/pythonPipelineService.ts`
- 刪除 `analysis_pipeline.py`
- 刪除 `requirements.txt`

#### 功能
- 移除 Python 管線分析功能（計劃在 v2.1+ 以 Node.js 版本重新實現）

### 📚 文檔變更 (Documentation)

#### 新增文檔
- 前端開發指南
- 後端開發指南
- 貢獻指南
- 變更日誌
- 類型共享說明

#### 更新文檔
- 主要 README.md
- 部署快速指南
- API 參考文檔（待驗證）
- 架構文檔（待驗證）

### 🔒 安全性 (Security)

- **加強** WebSocket 連接管理，防止資源耗盡攻擊
- **優化** 連接數限制，提升系統穩定性

---

## [1.0.0] - 2024-XX-XX

### ✨ 初始發布

#### 核心功能
- 5 步驟數據分析工作流程
- 2 種數據檢視模式（逐筆檢視、分組彙總）
- 3 種專業圖表（散點圖、線性圖、點狀圖）
- 智能圖表推薦系統
- 可配置唯一識別碼
- 強大的數據清理功能

#### 技術棧
- React 18 + TypeScript 前端
- Node.js + Express 後端
- SQLite 資料庫
- Socket.io 實時通訊
- Chart.js + Plotly.js 圖表庫

#### 匯出功能
- Excel 多工作表匯出
- CSV 格式匯出
- PNG/SVG 圖表匯出

#### 協作功能（基礎）
- 專案管理
- 數據文件管理
- 分析配置保存

---

## 版本說明

### [2.0.0] vs [1.0.0] 主要差異

| 特性 | v1.0.0 | v2.0.0 |
|------|--------|--------|
| Python 支援 | ✅ | ❌ （已移除） |
| Node.js 版本 | 16+ | 18+ |
| WebSocket 連接管理 | 基礎 | 優化（連接限制、超時） |
| 開發文檔 | 基本 | 完整（前後端指南） |
| 專案保存 UX | 基本 | 改善（導航按鈕） |
| 圖表導出 | 有問題 | 已修復 |
| 代碼貢獻流程 | 無 | 完整文檔 |

### 遷移指南 (v1.0 → v2.0)

#### 對於使用者
- **無需任何操作** - 功能完全向後兼容
- 如果之前使用 Python 管線功能，該功能已移除，請使用內建的數據處理功能

#### 對於開發者
1. **移除 Python 相關代碼**
   ```bash
   # 不再需要安裝 Python 依賴
   # 移除 requirements.txt 引用
   ```

2. **更新 Node.js 版本**
   ```bash
   # 確保使用 Node.js 18+
   node --version  # 應顯示 v18.x 或更高
   ```

3. **重新安裝依賴**
   ```bash
   npm run install:all
   ```

4. **查閱新文檔**
   - 閱讀 `frontend/README.md` 了解前端開發規範
   - 閱讀 `backend/README.md` 了解後端開發規範
   - 閱讀 `CONTRIBUTING.md` 了解貢獻流程

---

## 未來規劃

### v2.1.0 (計劃中)
- 🔐 使用者認證系統 (JWT/OAuth)
- 👥 完整的多人實時協作功能
- 📊 進階統計分析功能（以 Node.js 實現）
- 📈 更多圖表類型
- 🔔 實時通知系統

### v2.2.0 (計劃中)
- 📦 Docker 容器化部署
- 🔍 全文搜索功能
- 📤 批次匯出功能
- 🎨 自訂主題支援
- 🌐 多語言支援 (i18n)

### v3.0.0 (長期規劃)
- ☁️ 雲端部署版本
- 🔄 資料同步功能
- 🤖 機器學習整合
- 📱 移動端應用
- 🔌 插件系統

---

## 貢獻者

感謝所有為 Data Analyzer 做出貢獻的開發者！

---

## 參考資源

- [專案 README](README.md)
- [貢獻指南](CONTRIBUTING.md)
- [API 文檔](docs/API_REFERENCE.md)
- [系統架構](docs/ARCHITECTURE.md)
- [使用者指南](docs/USER_GUIDE.md)

---

**說明**:
- `[Unreleased]` 包含尚未發布的變更
- 版本號格式: MAJOR.MINOR.PATCH
  - MAJOR: 破壞性變更
  - MINOR: 新功能（向後兼容）
  - PATCH: Bug 修復
