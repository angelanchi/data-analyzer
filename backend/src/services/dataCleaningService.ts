import { DataPoint, CleaningRule, DataStatistics, RemovalReason, RemovedRowInfo } from 'shared/types';

/**
 * Data Cleaning Service
 * 數據清理服務
 *
 * ## 功能說明 (Features)
 * DataCleaningService 提供完整的數據清理功能，包括缺失值處理、異常值檢測、數值範圍過濾等。
 * 支援兩種清理模式：標準清理（cleanData）和追蹤清理（cleanDataWithTracking），後者提供詳細的移除原因。
 *
 * ## 主要功能 (Main Functions)
 * ### 公開方法 (Public Methods)
 * 1. **cleanData** - 應用清理規則，返回清理後的數據
 * 2. **cleanDataWithTracking** - 應用清理規則並追蹤每行的移除原因
 * 3. **calculateStatistics** - 計算數據統計信息（均值、標準差、中位數等）
 * 4. **previewCleaning** - 預覽清理效果（包含前後對比統計）
 * 5. **validateCleaningRules** - 驗證清理規則的有效性
 *
 * ### 私有方法 (Private Methods)
 * - **applyCleaningRule** - 應用單個清理規則
 * - **applyCleaningRuleWithTracking** - 應用單個清理規則並追蹤移除原因
 * - **handleMissingValues** - 處理缺失值
 * - **handleMissingValuesWithTracking** - 處理缺失值並追蹤
 * - **getNumericValues** - 提取數值型數據
 * - **calculateOutlierBounds** - 計算異常值邊界
 * - **calculateIQRBounds** - 使用 IQR 方法計算異常值邊界
 * - **calculateZScoreBounds** - 使用 Z-Score 方法計算異常值邊界
 *
 * ## 清理規則處理順序 (Processing Order)
 * ```
 * 1. 數值範圍過濾 (minValue, maxValue)
 * 2. 異常值檢測 (removeOutliers: IQR 或 Z-Score)
 * 3. 缺失值處理 (handleMissing: skip, remove, default)
 * ```
 *
 * ## 異常值檢測方法 (Outlier Detection Methods)
 * ### IQR (Interquartile Range) - 四分位距法
 * - 計算第一四分位數 (Q1) 和第三四分位數 (Q3)
 * - IQR = Q3 - Q1
 * - 異常值邊界：[Q1 - 1.5×IQR, Q3 + 1.5×IQR]
 * - 優點：對極值不敏感，適合偏態分布
 *
 * ### Z-Score - 標準分數法
 * - 計算平均值 (mean) 和標準差 (std)
 * - Z-Score = (value - mean) / std
 * - 異常值邊界：[mean - 2.5×std, mean + 2.5×std]
 * - 優點：適合正態分布，數學意義明確
 *
 * ## 缺失值處理策略 (Missing Value Strategies)
 * - **skip**: 跳過不處理，保留缺失值
 * - **remove**: 移除包含缺失值的整行數據
 * - **default**: 使用指定的默認值填充缺失值
 *
 * ## 使用注意事項 (Important Notes)
 * - 規則按啟用順序依次應用（enabled=true）
 * - 每個規則可能移除不同的行，最終結果是所有規則的交集
 * - cleanDataWithTracking 會記錄每行被移除的所有原因（可能多個）
 * - 統計計算會自動識別數值型和字串型欄位
 *
 * @module DataCleaningService
 */
export class DataCleaningService {
  /**
   * 清理數據根據提供的規則
   * Clean Data with Rules
   *
   * 應用一組清理規則處理數據，返回清理後的數據數組。
   * 這是標準的清理方法，不追蹤移除原因，性能較佳，適合生產環境。
   *
   * ## 處理流程 (Processing Flow)
   * 1. 複製原始數據避免修改源數據
   * 2. 過濾出啟用的規則（enabled=true）
   * 3. 按順序應用每個規則：
   *    - 數值範圍過濾
   *    - 異常值檢測
   *    - 缺失值處理
   * 4. 記錄處理統計信息到控制台
   *
   * ## 統計信息 (Statistics Logged)
   * - 原始行數
   * - 清理後行數
   * - 移除行數
   * - 處理的欄位列表
   * - 處理的值數量
   *
   * @param {DataPoint[]} data - 原始數據數組
   * @param {CleaningRule[]} rules - 清理規則數組
   * @returns {DataPoint[]} 清理後的數據數組
   *
   * @example
   * ```ts
   * const cleanedData = DataCleaningService.cleanData(rawData, [
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
   * // 返回清理後的數據，控制台會輸出統計信息
   * ```
   */
  static cleanData(data: DataPoint[], rules: CleaningRule[]): DataPoint[] {
    let cleanedData = [...data];
    const activeRules = rules.filter(rule => rule.enabled);

    // 統計清理過程
    const cleaningStats = {
      originalCount: data.length,
      processedFields: [] as string[],
      removedRows: [] as number[],
      processedValues: 0
    };

    // 對每個規則進行處理
    for (const rule of activeRules) {
      cleanedData = this.applyCleaningRule(cleanedData, rule, cleaningStats);
      cleaningStats.processedFields.push(rule.field);
    }

    console.log('數據清理完成:', {
      原始行數: cleaningStats.originalCount,
      清理後行數: cleanedData.length,
      移除行數: cleaningStats.originalCount - cleanedData.length,
      處理欄位: cleaningStats.processedFields,
      處理值數量: cleaningStats.processedValues
    });

    return cleanedData;
  }

  /**
   * 清理數據並追蹤移除的行（用於預覽）
   * Clean Data with Removal Tracking (For Preview)
   *
   * 與 cleanData 類似，但會追蹤每一行的移除原因，用於生成詳細的清理預覽報告。
   * 返回清理後的數據和被移除行的詳細信息（包括原始索引、數據內容、移除原因）。
   *
   * ## 追蹤機制 (Tracking Mechanism)
   * 1. 為每行添加 `__originalIndex` 臨時字段用於追蹤
   * 2. 使用 Map<rowIndex, reasons[]> 記錄每行的所有移除原因
   * 3. 一行可能因多個規則被標記移除，所有原因都會被記錄
   * 4. 最終移除臨時字段，返回乾淨的數據
   *
   * ## 移除原因類型 (Removal Reason Types)
   * - **range**: 數值超出範圍 (minValue, maxValue)
   * - **outlier**: 離群值（IQR 或 Z-Score 方法）
   * - **missing**: 缺失值
   *
   * ## 返回格式 (Return Format)
   * ```ts
   * {
   *   cleanedData: DataPoint[],  // 清理後的數據
   *   removedRows: RemovedRowInfo[]  // 被移除的行信息
   * }
   * ```
   *
   * ### RemovedRowInfo 結構
   * ```ts
   * {
   *   rowIndex: number,           // 原始行索引
   *   rowData: DataPoint,         // 該行的原始數據
   *   reasons: RemovalReason[]    // 移除原因列表
   * }
   * ```
   *
   * ### RemovalReason 結構
   * ```ts
   * {
   *   field: string,     // 觸發移除的欄位名稱
   *   ruleType: string,  // 規則類型：'range' | 'outlier' | 'missing'
   *   detail: string     // 詳細說明，如 "值 5.0 超出範圍 [3.0, 4.2]"
   * }
   * ```
   *
   * @param {DataPoint[]} data - 原始數據數組
   * @param {CleaningRule[]} rules - 清理規則數組
   * @returns {{ cleanedData: DataPoint[]; removedRows: RemovedRowInfo[] }}
   *          包含清理後數據和移除行詳情的對象
   *
   * @example
   * ```ts
   * const result = DataCleaningService.cleanDataWithTracking(rawData, rules);
   *
   * console.log(`清理後: ${result.cleanedData.length} 行`);
   * console.log(`移除: ${result.removedRows.length} 行`);
   *
   * // 查看被移除的行和原因
   * result.removedRows.forEach(removed => {
   *   console.log(`第 ${removed.rowIndex} 行被移除:`);
   *   console.log('原始數據:', removed.rowData);
   *   removed.reasons.forEach(reason => {
   *     console.log(`  - ${reason.field}: ${reason.detail} (${reason.ruleType})`);
   *   });
   * });
   *
   * // 示例輸出:
   * // 第 15 行被移除:
   * // 原始數據: { Voltage: 5.0, Current: 2.1 }
   * //   - Voltage: 值 5.0 超出範圍 [3.0, 4.2] (range)
   * //   - Voltage: 離群值 (IQR 方法) (outlier)
   * ```
   */
  static cleanDataWithTracking(data: DataPoint[], rules: CleaningRule[]): {
    cleanedData: DataPoint[];
    removedRows: RemovedRowInfo[];
  } {
    const activeRules = rules.filter(rule => rule.enabled);

    // 為每一行添加原始索引追蹤
    const dataWithIndex = data.map((row, index) => ({ ...row, __originalIndex: index }));
    let currentData = dataWithIndex;

    // 追蹤每一行的移除原因
    const removalReasons = new Map<number, RemovalReason[]>();

    // 對每個規則進行處理
    for (const rule of activeRules) {
      const result = this.applyCleaningRuleWithTracking(currentData, rule, removalReasons);
      currentData = result.data;
    }

    // 找出被移除的行
    const remainingIndices = new Set(currentData.map(row => row.__originalIndex));
    const removedRows: RemovedRowInfo[] = [];

    for (let i = 0; i < data.length; i++) {
      if (!remainingIndices.has(i)) {
        removedRows.push({
          rowIndex: i,
          rowData: data[i],
          reasons: removalReasons.get(i) || []
        });
      }
    }

    // 移除追蹤索引字段
    const cleanedData = currentData.map(row => {
      const { __originalIndex, ...rest } = row;
      return rest as DataPoint;
    });

    return { cleanedData, removedRows };
  }

  /**
   * 應用清理規則並追蹤移除原因
   */
  private static applyCleaningRuleWithTracking(
    data: Array<DataPoint & { __originalIndex: number }>,
    rule: CleaningRule,
    removalReasons: Map<number, RemovalReason[]>
  ): { data: Array<DataPoint & { __originalIndex: number }> } {
    const field = rule.field as keyof DataPoint;
    let processedData = [...data];

    // 1. 處理數值範圍過濾
    if (rule.minValue !== undefined || rule.maxValue !== undefined) {
      processedData = processedData.filter(row => {
        const value = row[field];
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(numValue as number)) return true;

        const min = rule.minValue ?? Number.NEGATIVE_INFINITY;
        const max = rule.maxValue ?? Number.POSITIVE_INFINITY;
        const inRange = numValue !== undefined && numValue >= min && numValue <= max;

        if (!inRange) {
          // 記錄移除原因
          const reasons = removalReasons.get(row.__originalIndex) || [];
          reasons.push({
            field: rule.field,
            ruleType: 'range',
            detail: `值 ${numValue} 超出範圍 [${min === Number.NEGATIVE_INFINITY ? '-∞' : min}, ${max === Number.POSITIVE_INFINITY ? '+∞' : max}]`
          });
          removalReasons.set(row.__originalIndex, reasons);
        }

        return inRange;
      });
    }

    // 2. 處理異常值
    if (rule.removeOutliers) {
      const numericValues = this.getNumericValues(processedData as any[], field);
      const outlierBounds = this.calculateOutlierBounds(numericValues, rule.outlierMethod || 'iqr');

      processedData = processedData.filter(row => {
        const value = row[field];
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(numValue as number)) return true;

        const notOutlier = numValue !== undefined && numValue >= outlierBounds.lower && numValue <= outlierBounds.upper;

        if (!notOutlier) {
          // 記錄移除原因
          const reasons = removalReasons.get(row.__originalIndex) || [];
          reasons.push({
            field: rule.field,
            ruleType: 'outlier',
            detail: `離群值 (${rule.outlierMethod === 'zscore' ? 'Z-score' : 'IQR'} 方法)`
          });
          removalReasons.set(row.__originalIndex, reasons);
        }

        return notOutlier;
      });
    }

    // 3. 處理缺失值（只有 remove 會移除行）
    if (rule.handleMissing === 'remove') {
      processedData = processedData.filter(row => {
        const value = row[field];
        const hasValue = value !== null && value !== undefined && value !== '';

        if (!hasValue) {
          // 記錄移除原因
          const reasons = removalReasons.get(row.__originalIndex) || [];
          reasons.push({
            field: rule.field,
            ruleType: 'missing',
            detail: '缺失值'
          });
          removalReasons.set(row.__originalIndex, reasons);
        }

        return hasValue;
      });
    } else if (rule.handleMissing === 'default') {
      // 使用默認值填充，不會移除行
      processedData = this.handleMissingValuesWithTracking(processedData, rule);
    }

    return { data: processedData };
  }

  /**
   * 處理缺失值（帶追蹤）
   */
  private static handleMissingValuesWithTracking(
    data: Array<DataPoint & { __originalIndex: number }>,
    rule: CleaningRule
  ): Array<DataPoint & { __originalIndex: number }> {
    const field = rule.field as keyof DataPoint;

    if (rule.handleMissing === 'default') {
      return data.map(row => {
        const value = row[field];
        if (value === null || value === undefined || value === '') {
          return { ...row, [field]: rule.defaultValue };
        }
        return row;
      });
    }

    return data;
  }

  /**
   * 應用單個清理規則
   */
  private static applyCleaningRule(
    data: DataPoint[],
    rule: CleaningRule,
    stats: any
  ): DataPoint[] {
    const field = rule.field as keyof DataPoint;
    let processedData = [...data];

    // 1. 處理數值範圍過濾
    if (rule.minValue !== undefined || rule.maxValue !== undefined) {
      processedData = processedData.filter(row => {
        const value = row[field];
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(numValue as number)) return true; // 保留非數值

        const min = rule.minValue ?? Number.NEGATIVE_INFINITY;
        const max = rule.maxValue ?? Number.POSITIVE_INFINITY;

        return numValue !== undefined && numValue >= min && numValue <= max;
      });
    }

    // 2. 處理異常值
    if (rule.removeOutliers) {
      const numericValues = this.getNumericValues(processedData, field);
      const outlierBounds = this.calculateOutlierBounds(numericValues, rule.outlierMethod || 'iqr');

      processedData = processedData.filter(row => {
        const value = row[field];
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(numValue as number)) return true; // 保留非數值

        return numValue !== undefined && numValue >= outlierBounds.lower && numValue <= outlierBounds.upper;
      });
    }

    // 3. 處理缺失值
    processedData = this.handleMissingValues(processedData, rule);

    stats.processedValues += data.length - processedData.length;
    return processedData;
  }

  /**
   * 處理缺失值
   */
  private static handleMissingValues(data: DataPoint[], rule: CleaningRule): DataPoint[] {
    const field = rule.field as keyof DataPoint;

    switch (rule.handleMissing) {
      case 'remove':
        return data.filter(row => {
          const value = row[field];
          return value !== null && value !== undefined && value !== '';
        });

      case 'default':
        return data.map(row => {
          const value = row[field];
          if (value === null || value === undefined || value === '') {
            return { ...row, [field]: rule.defaultValue };
          }
          return row;
        });

      case 'skip':
      default:
        return data;
    }
  }

  /**
   * 獲取數值陣列
   */
  private static getNumericValues(data: DataPoint[], field: keyof DataPoint): number[] {
    return data
      .map(row => row[field])
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(value => typeof value === 'string' ? parseFloat(value) : value)
      .filter(value => !isNaN(value as number)) as number[];
  }

  /**
   * 計算異常值邊界
   */
  private static calculateOutlierBounds(
    values: number[],
    method: 'iqr' | 'zscore'
  ): { lower: number; upper: number } {
    if (values.length === 0) {
      return { lower: Number.NEGATIVE_INFINITY, upper: Number.POSITIVE_INFINITY };
    }

    switch (method) {
      case 'iqr':
        return this.calculateIQRBounds(values);
      case 'zscore':
        return this.calculateZScoreBounds(values);
      default:
        return { lower: Number.NEGATIVE_INFINITY, upper: Number.POSITIVE_INFINITY };
    }
  }

  /**
   * IQR方法計算異常值邊界
   */
  private static calculateIQRBounds(values: number[]): { lower: number; upper: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    return {
      lower: q1 - 1.5 * iqr,
      upper: q3 + 1.5 * iqr
    };
  }

  /**
   * Z-score方法計算異常值邊界
   */
  private static calculateZScoreBounds(values: number[]): { lower: number; upper: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    const threshold = 2.5; // Z-score閾值

    return {
      lower: mean - threshold * std,
      upper: mean + threshold * std
    };
  }

  /**
   * 計算數據統計信息
   * Calculate Data Statistics
   *
   * 為數據集中的每個欄位計算詳細的統計指標，包括基本計數和數值統計。
   * 自動識別欄位類型（numeric/string），數值型欄位會計算額外的統計指標。
   *
   * ## 統計指標 (Statistical Metrics)
   * ### 所有欄位的基本指標
   * - **count**: 總行數
   * - **nullCount**: 缺失值數量（null、undefined、空字串）
   * - **uniqueCount**: 唯一值數量
   * - **dataType**: 數據類型（'numeric' 或 'string'）
   *
   * ### 數值型欄位的額外指標
   * - **mean**: 平均值
   * - **min**: 最小值
   * - **max**: 最大值
   * - **std**: 標準差（標準偏差）
   * - **median**: 中位數
   *
   * ## 數值型識別 (Numeric Type Detection)
   * 欄位被識別為數值型的條件：
   * - 至少有一個值可以成功轉換為數字（parseFloat）
   * - 自動處理字串型數字（如 "3.7"）
   *
   * ## 統計計算細節 (Calculation Details)
   * - **標準差**: 使用樣本標準差公式 sqrt(Σ(x - mean)² / n)
   * - **中位數**: 排序後取中間值，偶數個值時取中間兩值的平均
   * - **缺失值**: null、undefined、空字串都算作缺失值
   *
   * @param {DataPoint[]} data - 數據數組
   * @param {string[]} [fields] - 要計算統計的欄位名稱（可選，默認為所有欄位）
   * @returns {Record<string, DataStatistics>} 欄位名稱到統計信息的映射對象
   *
   * @example
   * ```ts
   * // 計算所有欄位的統計
   * const stats = DataCleaningService.calculateStatistics(data);
   *
   * // stats = {
   * //   Voltage: {
   * //     field: 'Voltage',
   * //     count: 1000,
   * //     nullCount: 5,
   * //     uniqueCount: 850,
   * //     dataType: 'numeric',
   * //     mean: 3.7,
   * //     min: 3.0,
   * //     max: 4.2,
   * //     std: 0.25,
   * //     median: 3.68
   * //   },
   * //   Batch_No: {
   * //     field: 'Batch_No',
   * //     count: 1000,
   * //     nullCount: 0,
   * //     uniqueCount: 10,
   * //     dataType: 'string'
   * //   }
   * // }
   * ```
   *
   * @example
   * ```ts
   * // 僅計算特定欄位的統計
   * const stats = DataCleaningService.calculateStatistics(data, ['Voltage', 'Current']);
   *
   * // 使用統計信息
   * console.log(`Voltage 平均值: ${stats.Voltage.mean}`);
   * console.log(`Voltage 標準差: ${stats.Voltage.std}`);
   * console.log(`缺失值比例: ${stats.Voltage.nullCount / stats.Voltage.count * 100}%`);
   * ```
   */
  static calculateStatistics(data: DataPoint[], fields?: string[]): Record<string, DataStatistics> {
    if (data.length === 0) return {};

    const columns = fields || Object.keys(data[0]);
    const statistics: Record<string, DataStatistics> = {};

    for (const field of columns) {
      const values = data.map(row => row[field as keyof DataPoint]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = this.getNumericValues(data, field as keyof DataPoint);

      const stat: DataStatistics = {
        field,
        count: data.length,
        nullCount: data.length - nonNullValues.length,
        uniqueCount: new Set(nonNullValues).size,
        dataType: numericValues.length > 0 ? 'numeric' : 'string'
      };

      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);

        stat.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);

        // 標準差
        const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - stat.mean!, 2), 0) / numericValues.length;
        stat.std = Math.sqrt(variance);

        // 中位數
        const mid = Math.floor(sorted.length / 2);
        stat.median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      }

      statistics[field] = stat;
    }

    return statistics;
  }

  /**
   * 預覽清理效果（不實際修改數據）
   * Preview Cleaning Effects (Without Modifying Data)
   *
   * 執行清理規則預覽，返回詳細的清理統計和對比信息，但不實際修改原始數據。
   * 這是 previewCleaning API 端點的核心邏輯，幫助用戶在應用規則前評估影響。
   *
   * ## 預覽信息 (Preview Information)
   * ### 數據樣本 (Data Sample)
   * - **cleanedData**: 清理後的數據（僅返回前 100 行用於預覽）
   *
   * ### 清理統計 (Cleaning Statistics)
   * - **originalCount**: 原始數據行數
   * - **cleanedCount**: 清理後數據行數
   * - **removedCount**: 移除的行數
   * - **retentionRate**: 數據保留率（百分比）
   *
   * ### 移除詳情 (Removal Details)
   * - **removedRows**: 被移除的行數組
   *   - `rowIndex`: 原始行索引
   *   - `rowData`: 該行的原始數據
   *   - `reasons`: 移除原因列表（可能包含多個原因）
   *
   * ### 統計對比 (Statistics Comparison)
   * - **originalStatistics**: 清理前的統計信息（所有欄位）
   * - **cleanedStatistics**: 清理後的統計信息（所有欄位）
   * - **affectedFields**: 受影響的欄位列表（有啟用規則的欄位）
   *
   * ## 使用場景 (Use Cases)
   * 1. 用戶配置清理規則時的即時預覽
   * 2. 評估清理規則的嚴格程度（通過保留率）
   * 3. 查看哪些數據會被移除以及原因
   * 4. 對比清理前後的統計變化（均值、標準差等）
   *
   * ## 性能注意 (Performance Notes)
   * - 返回的 cleanedData 限制為前 100 行，避免傳輸大量數據
   * - removedRows 包含所有被移除的行（可能很多），用於詳細檢查
   * - 統計計算針對所有數據，確保準確性
   *
   * @param {DataPoint[]} data - 原始數據數組
   * @param {CleaningRule[]} rules - 清理規則數組
   * @returns 包含清理預覽信息的對象
   *
   * @example
   * ```ts
   * const preview = DataCleaningService.previewCleaning(rawData, rules);
   *
   * console.log('=== 清理預覽 ===');
   * console.log(`原始數據: ${preview.originalCount} 行`);
   * console.log(`清理後: ${preview.cleanedCount} 行`);
   * console.log(`移除: ${preview.removedCount} 行`);
   * console.log(`保留率: ${preview.retentionRate.toFixed(1)}%`);
   *
   * // 查看統計變化
   * const voltageOriginal = preview.originalStatistics.Voltage;
   * const voltageCleaned = preview.cleanedStatistics.Voltage;
   * console.log(`Voltage 平均值: ${voltageOriginal.mean} → ${voltageCleaned.mean}`);
   * console.log(`Voltage 標準差: ${voltageOriginal.std} → ${voltageCleaned.std}`);
   *
   * // 查看被移除的行
   * if (preview.removedCount > 0) {
   *   console.log('\n前 5 個被移除的行:');
   *   preview.removedRows.slice(0, 5).forEach(row => {
   *     console.log(`  第 ${row.rowIndex} 行:`, row.reasons.map(r => r.detail).join(', '));
   *   });
   * }
   * ```
   */
  static previewCleaning(data: DataPoint[], rules: CleaningRule[]) {
    const { cleanedData, removedRows } = this.cleanDataWithTracking(data, rules);
    const originalStats = this.calculateStatistics(data);
    const cleanedStats = this.calculateStatistics(cleanedData);

    return {
      cleanedData: cleanedData.slice(0, 100), // 只返回前100行用於預覽
      originalCount: data.length,
      cleanedCount: cleanedData.length,
      removedCount: data.length - cleanedData.length,
      retentionRate: (cleanedData.length / data.length) * 100,
      removedRows: removedRows.map(row => ({
        rowIndex: row.rowIndex,
        rowData: row.rowData,
        reasons: row.reasons
      })),
      originalStatistics: originalStats,
      cleanedStatistics: cleanedStats,
      affectedFields: rules.filter(r => r.enabled).map(r => r.field)
    };
  }

  /**
   * 驗證清理規則的有效性
   * Validate Cleaning Rules
   *
   * 在應用清理規則前驗證其邏輯正確性和與數據的兼容性。
   * 幫助前端在用戶配置規則時提供即時反饋，避免無效配置導致的錯誤。
   *
   * ## 驗證項目 (Validation Items)
   * ### 1. 欄位存在性檢查 (Field Existence)
   * - 驗證規則中的欄位是否存在於數據的第一行中
   * - 錯誤格式：`欄位 "FieldName" 不存在於數據中`
   *
   * ### 2. 數值範圍邏輯檢查 (Value Range Logic)
   * - 驗證 minValue 不能大於等於 maxValue
   * - 僅當兩者都設定時才檢查
   * - 錯誤格式：`欄位 "FieldName" 的最小值不能大於等於最大值`
   *
   * ### 3. 默認值設定檢查 (Default Value Setting)
   * - 驗證當 handleMissing 為 'default' 時必須提供 defaultValue
   * - 錯誤格式：`欄位 "FieldName" 選擇使用默認值但未設定默認值`
   *
   * ## 返回格式 (Return Format)
   * ```ts
   * {
   *   valid: boolean,      // 所有規則是否有效
   *   errors: string[]     // 錯誤訊息列表（valid=false 時包含錯誤）
   * }
   * ```
   *
   * ## 驗證行為 (Validation Behavior)
   * - 只驗證啟用的規則（enabled=true）
   * - 收集所有錯誤訊息，不會在第一個錯誤處停止
   * - 如果欄位不存在，會跳過該規則的後續驗證
   *
   * @param {CleaningRule[]} rules - 要驗證的清理規則數組
   * @param {DataPoint[]} data - 數據數組（用於檢查欄位存在性）
   * @returns {{ valid: boolean; errors: string[] }} 驗證結果和錯誤列表
   *
   * @example
   * ```ts
   * // 驗證通過的例子
   * const result = DataCleaningService.validateCleaningRules([
   *   {
   *     field: 'Voltage',
   *     enabled: true,
   *     minValue: 3.0,
   *     maxValue: 4.2,
   *     handleMissing: 'skip'
   *   }
   * ], data);
   *
   * console.log(result.valid);   // true
   * console.log(result.errors);  // []
   * ```
   *
   * @example
   * ```ts
   * // 驗證失敗的例子
   * const result = DataCleaningService.validateCleaningRules([
   *   {
   *     field: 'NonExistentField',  // 欄位不存在
   *     enabled: true,
   *     minValue: 5.0,
   *     maxValue: 3.0,  // 邏輯錯誤：min > max
   *     handleMissing: 'default'  // 缺少 defaultValue
   *   }
   * ], data);
   *
   * console.log(result.valid);   // false
   * console.log(result.errors);
   * // [
   * //   '欄位 "NonExistentField" 不存在於數據中',
   * //   '欄位 "NonExistentField" 的最小值不能大於等於最大值',
   * //   '欄位 "NonExistentField" 選擇使用默認值但未設定默認值'
   * // ]
   * ```
   *
   * @example
   * ```ts
   * // 在前端使用驗證結果
   * const validation = await api.validateCleaningRules(data, rules);
   *
   * if (!validation.valid) {
   *   // 顯示錯誤訊息給用戶
   *   alert(`清理規則無效:\n${validation.errors.join('\n')}`);
   *   return;
   * }
   *
   * // 驗證通過，繼續應用清理規則
   * const cleaned = await api.cleanData(data, rules);
   * ```
   */
  static validateCleaningRules(rules: CleaningRule[], data: DataPoint[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    for (const rule of rules) {
      if (rule.enabled) {
        // 檢查欄位是否存在
        if (!columns.includes(rule.field)) {
          errors.push(`欄位 "${rule.field}" 不存在於數據中`);
          continue;
        }

        // 檢查數值範圍
        if (rule.minValue !== undefined && rule.maxValue !== undefined) {
          if (rule.minValue >= rule.maxValue) {
            errors.push(`欄位 "${rule.field}" 的最小值不能大於等於最大值`);
          }
        }

        // 檢查默認值設定
        if (rule.handleMissing === 'default' && rule.defaultValue === undefined) {
          errors.push(`欄位 "${rule.field}" 選擇使用默認值但未設定默認值`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}