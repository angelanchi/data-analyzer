import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { ApiResponse, DataPoint, CleaningRule } from 'shared/types';
import { DataCleaningService } from '@/services/dataCleaningService';
import { createAppError } from '@/middleware/errorHandler';

/**
 * Data Controller
 * 數據處理控制器
 *
 * ## 功能說明 (Features)
 * 處理已上傳數據的各種操作，包括數據清理、統計分析、預覽等功能。
 * 主要負責協調前端請求與 DataCleaningService 之間的數據處理邏輯。
 *
 * ## 主要功能 (Main Functions)
 * 1. **processData** - 處理數據並應用清理規則
 * 2. **previewData** - 分頁預覽處理後的數據
 * 3. **getStatistics** - 計算數據統計信息
 * 4. **validateData** - 驗證清理規則的有效性
 * 5. **cleanData** - 應用清理規則並返回清理後的數據
 * 6. **previewCleaning** - 預覽清理效果（包含移除行詳情）
 *
 * ## 數據處理流程 (Data Processing Flow)
 * ```
 * 1. 前端上傳文件 → uploadController 解析並保存為 processed_{fileId}.json
 * 2. 前端請求數據處理 → dataController.processData 讀取 JSON 文件
 * 3. 應用清理規則 → DataCleaningService 執行清理邏輯
 * 4. 返回清理後數據 → 前端展示或進一步分析
 * ```
 *
 * ## 清理規則驗證 (Cleaning Rule Validation)
 * - 驗證欄位是否存在於數據中
 * - 驗證數值範圍邏輯（minValue < maxValue）
 * - 驗證默認值設定（handleMissing='default' 必須提供 defaultValue）
 *
 * @module dataController
 */
export const dataController = {
  /**
   * 處理數據並應用清理規則
   * Process Data with Cleaning Rules
   *
   * 讀取已上傳並解析的數據文件，可選地應用清理規則後返回處理結果。
   * 這是數據分析流程中的核心步驟，將原始數據轉換為可用於分析的清潔數據。
   *
   * ## 處理步驟 (Processing Steps)
   * 1. 驗證 fileId 參數
   * 2. 從 uploads 目錄讀取 processed_{fileId}.json 文件
   * 3. 如果提供了 cleaningRules：
   *    - 驗證清理規則的有效性
   *    - 應用清理規則處理數據
   * 4. 返回處理後的數據
   *
   * ## 清理規則應用 (Cleaning Rule Application)
   * - **數值範圍過濾**: 移除超出 minValue 和 maxValue 範圍的行
   * - **異常值檢測**: 使用 IQR 或 Z-Score 方法移除離群值
   * - **缺失值處理**: 跳過、移除或使用默認值填充
   *
   * @route POST /api/data/process
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {string} req.body.fileId - 文件 ID (UUID)
   * @param {CleaningRule[]} [req.body.cleaningRules] - 清理規則數組（可選）
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<DataPoint[]>} 處理後的數據數組
   *
   * @throws {AppError} 400 - 缺少文件ID或清理規則驗證失敗
   * @throws {AppError} 500 - 文件讀取失敗或數據處理失敗
   *
   * @example
   * ```ts
   * // 前端調用範例 - 僅讀取數據，不清理
   * const response = await fetch('/api/data/process', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     fileId: 'abc-123-def-456'
   *   })
   * });
   * const result = await response.json();
   * // result.data - 原始數據
   * ```
   *
   * @example
   * ```ts
   * // 前端調用範例 - 應用清理規則
   * const response = await fetch('/api/data/process', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     fileId: 'abc-123-def-456',
   *     cleaningRules: [
   *       {
   *         field: 'Voltage',
   *         enabled: true,
   *         minValue: 3.0,
   *         maxValue: 4.2,
   *         removeOutliers: true,
   *         outlierMethod: 'iqr',
   *         handleMissing: 'remove'
   *       }
   *     ]
   *   })
   * });
   * const result = await response.json();
   * // result.data - 清理後的數據
   * ```
   */
  processData: async (req: Request, res: Response) => {
    const { fileId, cleaningRules } = req.body;

    if (!fileId) {
      throw createAppError('缺少文件ID', 400);
    }

    try {
      // 讀取處理後的數據文件
      const processedDataPath = path.join(__dirname, '../../uploads', `processed_${fileId}.json`);
      const dataContent = await fs.readFile(processedDataPath, 'utf-8');
      const originalData: DataPoint[] = JSON.parse(dataContent);

      let processedData = originalData;

      // 如果有清理規則，應用清理
      if (cleaningRules && Array.isArray(cleaningRules)) {
        const validation = DataCleaningService.validateCleaningRules(cleaningRules, originalData);
        if (!validation.valid) {
          throw createAppError(`清理規則驗證失敗: ${validation.errors.join(', ')}`, 400);
        }

        processedData = DataCleaningService.cleanData(originalData, cleaningRules);
      }

      const response: ApiResponse<DataPoint[]> = {
        success: true,
        data: processedData,
        message: '數據處理完成',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`數據處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  /**
   * 分頁預覽處理後的數據
   * Preview Processed Data with Pagination
   *
   * 提供數據的分頁預覽功能，支援自定義起始位置和數量限制。
   * 適用於大型數據集的前端展示，避免一次性加載過多數據。
   *
   * ## 分頁參數 (Pagination Parameters)
   * - **limit**: 返回的最大行數（默認 100）
   * - **offset**: 起始行的索引（默認 0）
   *
   * ## 使用場景 (Use Cases)
   * - 數據表格的分頁展示
   * - 數據瀏覽器的滾動加載
   * - 大型數據集的性能優化
   *
   * @route GET /api/data/:fileId/preview?limit=100&offset=0
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {string} req.params.fileId - 文件 ID
   * @param {number} [req.query.limit=100] - 返回的行數限制
   * @param {number} [req.query.offset=0] - 起始行索引
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<{ data: DataPoint[]; total: number; offset: number; limit: number }>}
   *          返回預覽數據、總行數、偏移量和限制數量
   *
   * @throws {AppError} 500 - 文件讀取失敗
   *
   * @example
   * ```ts
   * // 前端調用範例 - 獲取前 100 行
   * const response = await fetch('/api/data/abc-123/preview?limit=100&offset=0');
   * const result = await response.json();
   * console.log(result.data.total);  // 總行數
   * console.log(result.data.data);   // 前 100 行數據
   * ```
   *
   * @example
   * ```ts
   * // 前端調用範例 - 分頁加載（第2頁）
   * const response = await fetch('/api/data/abc-123/preview?limit=50&offset=50');
   * const result = await response.json();
   * // result.data.data - 第 51-100 行數據
   * ```
   */
  previewData: async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    try {
      const processedDataPath = path.join(__dirname, '../../uploads', `processed_${fileId}.json`);
      const dataContent = await fs.readFile(processedDataPath, 'utf-8');
      const data: DataPoint[] = JSON.parse(dataContent);

      const startIndex = parseInt(offset as string);
      const limitCount = parseInt(limit as string);
      const previewData = data.slice(startIndex, startIndex + limitCount);

      const response: ApiResponse<{
        data: DataPoint[];
        total: number;
        offset: number;
        limit: number;
      }> = {
        success: true,
        data: {
          data: previewData,
          total: data.length,
          offset: startIndex,
          limit: limitCount
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`數據預覽失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  /**
   * 計算數據統計信息
   * Calculate Data Statistics
   *
   * 計算數據集中各欄位的統計指標，包括計數、缺失值、唯一值、數值統計等。
   * 提供數據質量評估和清理決策的依據。
   *
   * ## 統計指標 (Statistical Metrics)
   * - **count**: 總行數
   * - **nullCount**: 缺失值數量
   * - **uniqueCount**: 唯一值數量
   * - **dataType**: 數據類型（'numeric' 或 'string'）
   *
   * ### 數值型欄位額外指標 (Additional Metrics for Numeric Fields)
   * - **mean**: 平均值
   * - **min**: 最小值
   * - **max**: 最大值
   * - **std**: 標準差
   * - **median**: 中位數
   *
   * @route POST /api/data/statistics
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {DataPoint[]} req.body.data - 數據數組
   * @param {string[]} [req.body.fields] - 要計算統計的欄位名稱（可選，默認為所有欄位）
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<Record<string, DataStatistics>>} 各欄位的統計信息對象
   *
   * @throws {AppError} 400 - 無效的數據格式
   * @throws {AppError} 500 - 統計分析失敗
   *
   * @example
   * ```ts
   * // 前端調用範例 - 計算所有欄位的統計
   * const response = await fetch('/api/data/statistics', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     data: [
   *       { Batch_No: 'A1', Voltage: 3.7, Current: 2.1 },
   *       { Batch_No: 'A1', Voltage: 3.8, Current: 2.0 },
   *       { Batch_No: 'A2', Voltage: 3.6, Current: null }
   *     ]
   *   })
   * });
   * const result = await response.json();
   * // result.data.Voltage = { count: 3, nullCount: 0, mean: 3.7, min: 3.6, max: 3.8, ... }
   * // result.data.Current = { count: 3, nullCount: 1, mean: 2.05, ... }
   * ```
   *
   * @example
   * ```ts
   * // 前端調用範例 - 僅計算特定欄位
   * const response = await fetch('/api/data/statistics', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     data: myData,
   *     fields: ['Voltage', 'Current']  // 只計算這兩個欄位
   *   })
   * });
   * ```
   */
  getStatistics: async (req: Request, res: Response) => {
    const { data, fields } = req.body;

    if (!data || !Array.isArray(data)) {
      throw createAppError('無效的數據格式', 400);
    }

    try {
      const statistics = DataCleaningService.calculateStatistics(data, fields);

      const response: ApiResponse = {
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`統計分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  /**
   * 驗證清理規則的有效性
   * Validate Cleaning Rules
   *
   * 在實際應用清理規則之前，驗證規則的邏輯正確性和與數據的兼容性。
   * 幫助前端在用戶配置清理規則時提供即時反饋，避免無效配置。
   *
   * ## 驗證項目 (Validation Items)
   * 1. **欄位存在性檢查**: 驗證規則中的欄位是否存在於數據中
   * 2. **數值範圍邏輯**: 驗證 minValue < maxValue
   * 3. **默認值設定**: 驗證 handleMissing='default' 時是否提供了 defaultValue
   *
   * ## 返回格式 (Return Format)
   * - **valid**: 布爾值，表示所有規則是否有效
   * - **errors**: 字符串數組，包含所有驗證錯誤訊息
   *
   * @route POST /api/data/validate
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {DataPoint[]} req.body.data - 數據數組
   * @param {CleaningRule[]} req.body.rules - 清理規則數組
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<{ valid: boolean; errors: string[] }>} 驗證結果
   *
   * @throws {AppError} 400 - 無效的數據格式或規則格式
   * @throws {AppError} 500 - 數據驗證失敗
   *
   * @example
   * ```ts
   * // 前端調用範例 - 驗證通過
   * const response = await fetch('/api/data/validate', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     data: myData,
   *     rules: [
   *       {
   *         field: 'Voltage',
   *         enabled: true,
   *         minValue: 3.0,
   *         maxValue: 4.2,
   *         handleMissing: 'skip'
   *       }
   *     ]
   *   })
   * });
   * const result = await response.json();
   * // result.data.valid = true
   * // result.data.errors = []
   * ```
   *
   * @example
   * ```ts
   * // 前端調用範例 - 驗證失敗
   * const response = await fetch('/api/data/validate', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     data: myData,
   *     rules: [
   *       {
   *         field: 'NonExistentField',  // 欄位不存在
   *         enabled: true,
   *         minValue: 5.0,
   *         maxValue: 3.0,  // 最小值大於最大值
   *         handleMissing: 'default'  // 未提供 defaultValue
   *       }
   *     ]
   *   })
   * });
   * const result = await response.json();
   * // result.data.valid = false
   * // result.data.errors = [
   * //   '欄位 "NonExistentField" 不存在於數據中',
   * //   '欄位 "NonExistentField" 的最小值不能大於等於最大值',
   * //   '欄位 "NonExistentField" 選擇使用默認值但未設定默認值'
   * // ]
   * ```
   */
  validateData: async (req: Request, res: Response) => {
    const { data, rules } = req.body;

    if (!data || !Array.isArray(data)) {
      throw createAppError('無效的數據格式', 400);
    }

    if (!rules || !Array.isArray(rules)) {
      throw createAppError('無效的規則格式', 400);
    }

    try {
      const validation = DataCleaningService.validateCleaningRules(rules, data);

      const response: ApiResponse = {
        success: validation.valid,
        data: validation,
        message: validation.valid ? '驗證通過' : '驗證失敗',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`數據驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  /**
   * 應用清理規則並返回清理後的數據
   * Apply Cleaning Rules and Return Cleaned Data
   *
   * 對提供的數據應用一組清理規則，返回處理後的乾淨數據。
   * 這是數據清理功能的核心端點，會先驗證規則有效性，然後執行清理。
   *
   * ## 清理規則類型 (Cleaning Rule Types)
   * 1. **數值範圍過濾**: 移除 minValue 到 maxValue 範圍外的行
   * 2. **異常值移除**: 使用 IQR 或 Z-Score 方法檢測並移除離群值
   * 3. **缺失值處理**:
   *    - `skip`: 跳過，保留缺失值
   *    - `remove`: 移除包含缺失值的行
   *    - `default`: 使用指定的默認值填充
   *
   * ## 處理流程 (Processing Flow)
   * 1. 驗證數據和規則格式
   * 2. 調用 DataCleaningService.validateCleaningRules 驗證規則有效性
   * 3. 調用 DataCleaningService.cleanData 執行清理
   * 4. 返回清理後數據和統計訊息（原始行數 → 清理後行數）
   *
   * @route POST /api/data/clean
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {DataPoint[]} req.body.data - 原始數據數組
   * @param {CleaningRule[]} req.body.rules - 清理規則數組
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<DataPoint[]>} 清理後的數據數組，message 包含統計訊息
   *
   * @throws {AppError} 400 - 無效的數據格式、規則格式或規則驗證失敗
   * @throws {AppError} 500 - 數據清理失敗
   *
   * @example
   * ```ts
   * // 前端調用範例 - 清理數據
   * const response = await fetch('/api/data/clean', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     data: rawData,  // 1000 行原始數據
   *     rules: [
   *       {
   *         field: 'Voltage',
   *         enabled: true,
   *         minValue: 3.0,
   *         maxValue: 4.2,
   *         removeOutliers: true,
   *         outlierMethod: 'iqr',
   *         handleMissing: 'remove'
   *       },
   *       {
   *         field: 'Current',
   *         enabled: true,
   *         handleMissing: 'default',
   *         defaultValue: 0
   *       }
   *     ]
   *   })
   * });
   * const result = await response.json();
   * // result.data - 清理後的數據（可能是 850 行）
   * // result.message = "數據清理完成，從 1000 行處理為 850 行"
   * ```
   */
  cleanData: async (req: Request, res: Response) => {
    const { data, rules } = req.body;

    if (!data || !Array.isArray(data)) {
      throw createAppError('無效的數據格式', 400);
    }

    if (!rules || !Array.isArray(rules)) {
      throw createAppError('無效的清理規則格式', 400);
    }

    try {
      // 驗證清理規則
      const validation = DataCleaningService.validateCleaningRules(rules, data);
      if (!validation.valid) {
        throw createAppError(`清理規則驗證失敗: ${validation.errors.join(', ')}`, 400);
      }

      // 執行清理
      const cleanedData = DataCleaningService.cleanData(data, rules);

      const response: ApiResponse<DataPoint[]> = {
        success: true,
        data: cleanedData,
        message: `數據清理完成，從 ${data.length} 行處理為 ${cleanedData.length} 行`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`數據清理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  /**
   * 預覽清理效果
   * Preview Cleaning Effects
   *
   * 在不實際應用清理規則的情況下，預覽清理後的效果。
   * 提供詳細的清理統計、移除行信息、前後對比統計等，幫助用戶評估清理規則的影響。
   *
   * ## 預覽返回信息 (Preview Information)
   * - **cleanedData**: 清理後的數據（僅前 100 行）
   * - **originalCount**: 原始數據行數
   * - **cleanedCount**: 清理後數據行數
   * - **removedCount**: 移除的行數
   * - **retentionRate**: 數據保留率（百分比）
   * - **removedRows**: 被移除的行詳情數組
   *   - `rowIndex`: 原始行索引
   *   - `rowData`: 該行的原始數據
   *   - `reasons`: 移除原因數組（可能多個規則同時觸發）
   * - **originalStatistics**: 清理前的統計信息
   * - **cleanedStatistics**: 清理後的統計信息
   * - **affectedFields**: 受影響的欄位列表
   *
   * ## 使用場景 (Use Cases)
   * - 在前端配置清理規則時，即時顯示預覽效果
   * - 評估清理規則是否過於嚴格（保留率過低）
   * - 查看哪些數據會被移除以及移除原因
   * - 對比清理前後的統計變化
   *
   * @route POST /api/data/preview-cleaning
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {DataPoint[]} req.body.data - 原始數據數組
   * @param {CleaningRule[]} req.body.rules - 清理規則數組
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse} 詳細的預覽結果，包含清理統計和移除行詳情
   *
   * @throws {AppError} 400 - 無效的數據格式或規則格式
   * @throws {AppError} 500 - 清理預覽失敗
   *
   * @example
   * ```ts
   * // 前端調用範例 - 預覽清理效果
   * const response = await fetch('/api/data/preview-cleaning', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     data: rawData,  // 1000 行原始數據
   *     rules: [
   *       {
   *         field: 'Voltage',
   *         enabled: true,
   *         minValue: 3.0,
   *         maxValue: 4.2,
   *         removeOutliers: true,
   *         outlierMethod: 'iqr',
   *         handleMissing: 'remove'
   *       }
   *     ]
   *   })
   * });
   * const result = await response.json();
   *
   * // result.data = {
   * //   cleanedData: [...],  // 前 100 行清理後的數據
   * //   originalCount: 1000,
   * //   cleanedCount: 850,
   * //   removedCount: 150,
   * //   retentionRate: 85.0,
   * //   removedRows: [
   * //     {
   * //       rowIndex: 15,
   * //       rowData: { Voltage: 5.0, Current: 2.1 },
   * //       reasons: [
   * //         { field: 'Voltage', ruleType: 'range', detail: '值 5.0 超出範圍 [3.0, 4.2]' }
   * //       ]
   * //     },
   * //     {
   * //       rowIndex: 42,
   * //       rowData: { Voltage: null, Current: 2.0 },
   * //       reasons: [
   * //         { field: 'Voltage', ruleType: 'missing', detail: '缺失值' }
   * //       ]
   * //     },
   * //     ...
   * //   ],
   * //   originalStatistics: { Voltage: { mean: 3.75, std: 0.8, ... }, ... },
   * //   cleanedStatistics: { Voltage: { mean: 3.65, std: 0.3, ... }, ... },
   * //   affectedFields: ['Voltage']
   * // }
   * ```
   *
   * @example
   * ```ts
   * // 前端顯示預覽信息
   * const preview = result.data;
   * console.log(`原始: ${preview.originalCount} 行`);
   * console.log(`清理後: ${preview.cleanedCount} 行`);
   * console.log(`移除: ${preview.removedCount} 行 (${(100 - preview.retentionRate).toFixed(1)}%)`);
   * console.log(`保留率: ${preview.retentionRate.toFixed(1)}%`);
   *
   * // 顯示移除的行和原因
   * preview.removedRows.forEach(row => {
   *   console.log(`第 ${row.rowIndex} 行被移除:`, row.reasons);
   * });
   * ```
   */
  previewCleaning: async (req: Request, res: Response) => {
    const { data, rules } = req.body;

    if (!data || !Array.isArray(data)) {
      throw createAppError('無效的數據格式', 400);
    }

    if (!rules || !Array.isArray(rules)) {
      throw createAppError('無效的清理規則格式', 400);
    }

    try {
      const previewResult = DataCleaningService.previewCleaning(data, rules);

      const response: ApiResponse = {
        success: true,
        data: previewResult,
        message: '清理預覽完成',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`清理預覽失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  }
};