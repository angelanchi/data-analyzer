/**
 * API Service
 * API 服務層
 *
 * ## 功能說明 (Features)
 * 這是前端與後端 API 通信的核心服務層，封裝所有的 HTTP 請求。
 * 基於 axios，提供統一的錯誤處理、超時配置和請求/響應攔截。
 *
 * ## 主要功能模組 (Main Function Modules)
 * ### 文件上傳 (File Upload)
 * - **uploadFile** - 上傳 CSV/Excel 文件
 *
 * ### 數據處理 (Data Processing)
 * - **processData** - 處理數據並應用清理規則
 * - **previewDataCleaning** - 預覽清理效果
 * - **getDataStatistics** - 獲取數據統計信息
 * - **validateCleaningRules** - 驗證清理規則
 *
 * ### 圖表生成 (Chart Generation)
 * - **generateChart** - 生成圖表
 *
 * ### 項目管理 (Project Management)
 * - **getProjects** - 獲取項目列表
 * - **createProject** - 創建新項目
 * - **updateProject** - 更新項目
 * - **deleteProject** - 刪除項目
 *
 * ### 數據導出 (Data Export)
 * - **exportData** - 導出數據為 CSV/Excel
 *
 * ### 分析任務 (Analysis Jobs)
 * - **createAnalysisJob** - 創建分析任務
 * - **getAnalysisJobStatus** - 獲取任務狀態
 *
 * ## 錯誤處理 (Error Handling)
 * 所有 API 調用都經過響應攔截器處理，將原始錯誤轉換為友好的中文錯誤訊息：
 * - **ECONNREFUSED/ERR_NETWORK**: "無法連接到伺服器..."
 * - **404**: "請求的資源不存在"
 * - **500**: "伺服器內部錯誤..."
 * - **400-499**: "請求錯誤..."
 *
 * ## 配置 (Configuration)
 * - **baseURL**: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
 * - **timeout**: 30000ms (30 秒)
 * - **headers**: { 'Content-Type': 'application/json' }
 *
 * ## 使用方式 (Usage)
 * ```ts
 * import { uploadFile, processData } from '@/services/api';
 *
 * // 上傳文件
 * const result = await uploadFile(file);
 * const fileId = result.data.fileId;
 *
 * // 處理數據
 * const processed = await processData(fileId, cleaningRules);
 * ```
 *
 * @module api
 */
import axios from 'axios';
import { DataPoint, Project, ApiResponse, ChartConfig, AnalysisJobRequest, AnalysisJobCreateResponse, AnalysisJobStatusResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_ORIGIN = API_BASE_URL.replace(/\/?api$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

/**
 * 檢查 API 連接狀態
 * Check API Connection Status
 *
 * 向後端發送 health check 請求，測試 API 是否可用。
 * 超時設定為 5 秒，快速失敗避免長時間等待。
 *
 * @returns {Promise<boolean>} API 連接是否正常（true=正常，false=連接失敗）
 *
 * @example
 * ```ts
 * const isConnected = await checkApiConnection();
 * if (!isConnected) {
 *   alert('無法連接到伺服器，請檢查網絡連接');
 * }
 * ```
 */
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    await api.get('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

// 創建友好的錯誤消息
const createFriendlyErrorMessage = (error: any): string => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    return '無法連接到伺服器，請檢查網絡連接或聯繫管理員';
  }
  if (error.code === 'ENOTFOUND') {
    return '找不到伺服器，請檢查伺服器地址設置';
  }
  if (error.response?.status === 404) {
    return '請求的資源不存在';
  }
  if (error.response?.status === 500) {
    return '伺服器內部錯誤，請稍後再試';
  }
  if (error.response?.status >= 400 && error.response?.status < 500) {
    return '請求錯誤，請檢查輸入內容';
  }
  return error.message || '未知錯誤';
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const friendlyMessage = createFriendlyErrorMessage(error);
    console.error('API Error:', friendlyMessage, error);

    // 創建增強的錯誤對象
    const enhancedError = new Error(friendlyMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK';

    return Promise.reject(enhancedError);
  }
);

/**
 * 上傳數據文件
 * Upload Data File
 *
 * 上傳 CSV 或 Excel 文件到後端進行解析。
 * 後端會解析文件內容，生成唯一的 fileId，並返回前 100 行預覽數據。
 *
 * ## 支援的文件格式 (Supported Formats)
 * - **CSV**: text/csv
 * - **Excel**: .xlsx, .xls
 *
 * ## 處理流程 (Process Flow)
 * 1. 將文件包裝為 FormData
 * 2. POST 到 /api/upload
 * 3. 後端解析文件並保存為 processed_{fileId}.json
 * 4. 返回 fileId 和前 100 行數據用於預覽
 *
 * @param {File} file - 要上傳的文件對象（從 <input type="file"> 獲取）
 * @returns {Promise<ApiResponse<{ fileId: string; data: DataPoint[] }>>}
 *          包含 fileId 和預覽數據的響應
 *
 * @throws {Error} 網絡錯誤或文件解析失敗
 *
 * @example
 * ```tsx
 * // 在文件上傳組件中使用
 * const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = event.target.files?.[0];
 *   if (!file) return;
 *
 *   try {
 *     const result = await uploadFile(file);
 *     console.log('文件ID:', result.data.fileId);
 *     console.log('預覽數據:', result.data.data);
 *     // 保存 fileId 用於後續處理
 *     setFileId(result.data.fileId);
 *   } catch (error) {
 *     console.error('上傳失敗:', error);
 *   }
 * };
 * ```
 */
export const uploadFile = async (
  file: File
): Promise<ApiResponse<{ fileId: string; data: DataPoint[] }>> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

/**
 * 處理數據並應用清理規則
 * Process Data with Cleaning Rules
 *
 * 讀取已上傳的文件並應用清理規則，返回處理後的完整數據。
 * 這是數據清理流程的核心步驟，將原始數據轉換為可用於分析的清潔數據。
 *
 * @param {string} fileId - 文件 ID（從 uploadFile 獲得）
 * @param {any[]} cleaningRules - 清理規則數組（可為空數組表示不清理）
 * @returns {Promise<ApiResponse<DataPoint[]>>} 處理後的完整數據
 *
 * @example
 * ```ts
 * // 不應用清理規則，僅讀取數據
 * const result = await processData(fileId, []);
 *
 * // 應用清理規則
 * const result = await processData(fileId, [
 *   {
 *     field: 'Voltage',
 *     enabled: true,
 *     minValue: 3.0,
 *     maxValue: 4.2,
 *     removeOutliers: true,
 *     outlierMethod: 'iqr',
 *     handleMissing: 'remove'
 *   }
 * ]);
 * console.log('清理後數據:', result.data);
 * ```
 */
export const processData = async (
  fileId: string,
  cleaningRules: any[]
): Promise<ApiResponse<DataPoint[]>> => {
  const response = await api.post('/data/process', { fileId, cleaningRules });
  return response.data;
};

/**
 * 預覽數據清理效果
 * Preview Data Cleaning Effects
 *
 * 在不實際應用清理的情況下，預覽清理規則的效果。
 * 返回詳細的統計信息、被移除的行及其原因、清理前後對比等。
 *
 * ## 返回信息 (Return Information)
 * - **cleanedData**: 清理後的數據（前 100 行）
 * - **originalCount**: 原始行數
 * - **cleanedCount**: 清理後行數
 * - **removedCount**: 移除行數
 * - **retentionRate**: 保留率（%）
 * - **removedRows**: 被移除的行詳情（含原因）
 * - **originalStatistics**: 清理前統計
 * - **cleanedStatistics**: 清理後統計
 *
 * @param {Array<Record<string, unknown>>} data - 原始數據
 * @param {any[]} rules - 清理規則數組
 * @returns {Promise<ApiResponse<any>>} 詳細的預覽結果
 *
 * @example
 * ```ts
 * const preview = await previewDataCleaning(rawData, rules);
 *
 * console.log(`原始: ${preview.data.originalCount} 行`);
 * console.log(`清理後: ${preview.data.cleanedCount} 行`);
 * console.log(`保留率: ${preview.data.retentionRate}%`);
 *
 * // 查看被移除的行
 * preview.data.removedRows.forEach(row => {
 *   console.log(`第 ${row.rowIndex} 行:`, row.reasons);
 * });
 * ```
 */
export const previewDataCleaning = async (
  data: Array<Record<string, unknown>>,
  rules: any[]
): Promise<ApiResponse<any>> => {
  const response = await api.post('/data/preview-cleaning', { data, rules });
  return response.data;
};

export const getDataStatistics = async (
  data: Array<Record<string, unknown>>,
  fields?: string[]
): Promise<ApiResponse<any>> => {
  const response = await api.post('/data/statistics', { data, fields });
  return response.data;
};

export const validateCleaningRules = async (
  data: Array<Record<string, unknown>>,
  rules: any[]
): Promise<ApiResponse<any>> => {
  const response = await api.post('/data/validate', { data, rules });
  return response.data;
};

export const generateChart = async (
  data: Array<Record<string, unknown>>,
  config: ChartConfig
): Promise<ApiResponse<{ chartData: any; chartConfig: any }>> => {
  const response = await api.post('/charts/generate', { data, config });
  return response.data;
};

export const getProjects = async (): Promise<ApiResponse<Project[]>> => {
  const response = await api.get('/projects');
  return response.data;
};

export const createProject = async (
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<Project>> => {
  const response = await api.post('/projects', project);
  return response.data;
};

export const updateProject = async (
  id: string,
  project: Partial<Project>
): Promise<ApiResponse<Project>> => {
  const response = await api.put(`/projects/${id}`, project);
  return response.data;
};

export const deleteProject = async (id: string): Promise<ApiResponse<void>> => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

/**
 * 導出數據為 CSV 或 Excel 文件
 * Export Data to CSV or Excel
 *
 * 將數據導出為可下載的 CSV 或 Excel 文件。
 * 支援包含統計信息、自定義文件名、元數據等選項。
 *
 * ## 支援的格式 (Supported Formats)
 * - **csv**: CSV 文件（逗號分隔值）
 * - **xlsx**: Excel 文件（Office Open XML）
 *
 * ## 導出選項 (Export Options)
 * - **includeStatistics**: 是否包含統計信息工作表
 * - **filename**: 自定義文件名（不含副檔名）
 * - **metadata**: 元數據對象（包含項目信息等）
 * - **flattenedData**: 扁平化數據（用於彙整視圖）
 * - **groupedData**: 分組數據（用於分組視圖）
 * - **primarySort**: 主要排序欄位
 * - **secondarySort**: 次要排序欄位
 *
 * ## 導出流程 (Export Flow)
 * 1. POST 數據和選項到 /api/export/data
 * 2. 後端生成文件並返回下載 URL
 * 3. 前端使用 downloadUrl 觸發瀏覽器下載
 *
 * @param {Array<Record<string, unknown>>} data - 要導出的數據
 * @param {'csv' | 'xlsx'} format - 導出格式
 * @param {Object} [options] - 導出選項
 * @returns {Promise<ApiResponse<{ downloadUrl: string }>>} 包含下載 URL 的響應
 *
 * @example
 * ```ts
 * // 基本導出為 CSV
 * const result = await exportData(processedData, 'csv');
 * window.location.href = result.data.downloadUrl;  // 觸發下載
 * ```
 *
 * @example
 * ```ts
 * // 導出為 Excel，包含統計信息和自定義文件名
 * const result = await exportData(processedData, 'xlsx', {
 *   includeStatistics: true,
 *   filename: 'battery_analysis_2024',
 *   metadata: {
 *     projectName: '電池數據分析',
 *     exportDate: new Date().toISOString(),
 *     author: '張三'
 *   },
 *   flattenedData: flattenedData,
 *   groupedData: groupedData,
 *   primarySort: 'Batch_No',
 *   secondarySort: 'Point_ID'
 * });
 *
 * // 使用 anchor 標籤下載
 * const link = document.createElement('a');
 * link.href = result.data.downloadUrl;
 * link.download = 'battery_analysis_2024.xlsx';
 * link.click();
 * ```
 */
export const exportData = async (
  data: Array<Record<string, unknown>>,
  format: 'csv' | 'xlsx',
  options?: {
    includeStatistics?: boolean;
    filename?: string;
    metadata?: any;
    flattenedData?: Array<Record<string, unknown>>;
    groupedData?: Array<Record<string, unknown>>;
    primarySort?: string | null;
    secondarySort?: string | null;
  }
): Promise<ApiResponse<{ downloadUrl: string }>> => {
  const response = await api.post('/export/data', {
    data,
    format,
    options,
    filename: options?.filename,
    metadata: options?.metadata,
    flattenedData: options?.flattenedData,
    groupedData: options?.groupedData,
    primarySort: options?.primarySort,
    secondarySort: options?.secondarySort
  });
  return response.data;
};

// Note: Chart export is now handled entirely in the frontend.
// This function is no longer used. Chart export is done via:
// - frontend/src/utils/chartExport.ts
// See ExportOptions.tsx for usage.

export default api;

export { API_BASE_URL, API_ORIGIN };

export const createAnalysisJob = async (payload: AnalysisJobRequest): Promise<AnalysisJobCreateResponse> => {
  const response = await api.post('/analysis/run', payload);
  return response.data as AnalysisJobCreateResponse;
};

export const getAnalysisJobStatus = async (jobId: string): Promise<AnalysisJobStatusResponse> => {
  const response = await api.get(`/analysis/jobs/${jobId}`);
  return response.data as AnalysisJobStatusResponse;
};
