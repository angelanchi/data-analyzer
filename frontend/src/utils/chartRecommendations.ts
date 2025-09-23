/**
 * Chart Recommendations Module
 * 圖表智能推薦模塊
 *
 * ## 功能說明 (Features)
 * 根據數據特性（欄位類型、數據檢視模式、指標和分組）自動推薦合適的圖表類型和配置。
 * 提供優先級排序和詳細的推薦理由，幫助用戶快速選擇最佳的數據可視化方式。
 *
 * ## 推薦邏輯 (Recommendation Logic)
 *
 * ### 分組檢視模式 (Grouped View Mode)
 * - **柱狀圖 (Bar Chart)** - 優先級 5：比較各組的聚合指標（mean、count 等）
 * - **散點圖 (Scatter Chart)** - 優先級 3：探索兩個聚合指標之間的相關性
 * - **樣本數統計** - 優先級 2：檢視各分組的樣本數量
 *
 * ### 逐筆資料模式 (Flattened View Mode)
 * - **散點圖 (Scatter Chart)** - 優先級 4：探索兩個數值參數的關係
 * - **柱狀圖 (Bar Chart)** - 優先級 4-5：比較不同類別的數值
 * - **跨批次分析** - 優先級 5：Batch_No 維度的對比分析
 * - **跨測點分析** - 優先級 5：Point_ID（或自定義唯一識別碼）維度的對比分析
 *
 * ## 優先級系統 (Priority System)
 * - **5 (最高)**: 最適合當前數據結構的圖表，強烈推薦
 * - **4 (高)**: 適合的圖表，可有效呈現數據特性
 * - **3 (中)**: 可用的圖表，能提供一定的洞察
 * - **2 (低)**: 可選的圖表，但可能不是最佳選擇
 * - **1 (最低)**: 較少使用的圖表類型
 *
 * @module chartRecommendations
 */

import { ChartType } from '../types';

/**
 * 圖表推薦結果
 * Chart Recommendation Result
 *
 * 包含推薦的圖表類型、優先級、推薦理由和建議的配置
 */
export interface ChartRecommendation {
  /** 推薦的圖表類型（'bar' | 'scatter' 等） */
  type: ChartType;
  /** 優先級，1-5，數字越大越推薦 */
  priority: number; // 1-5, higher is better
  /** 推薦理由，解釋為何推薦此圖表 */
  reason: string;
  /** 建議的圖表配置 */
  suggestedConfig?: {
    /** X 軸欄位名稱 */
    xAxis?: string;
    /** Y 軸欄位名稱（可以是單個或多個） */
    yAxis?: string | string[];
    /** 分組欄位名稱 */
    groupBy?: string;
  };
}

/**
 * 數據分析結果
 * Data Analysis Result
 *
 * 包含數據結構的完整分析，用於生成圖表推薦
 */
export interface DataAnalysis {
  /** 數據檢視模式：'flattened'（逐筆資料）或 'grouped'（分組統計） */
  dataViewMode: 'flattened' | 'grouped';
  /** 所有欄位名稱 */
  columns: string[];
  /** 數值型欄位名稱陣列 */
  numericColumns: string[];
  /** 分類型欄位名稱陣列 */
  categoricalColumns: string[];
  /** 選定的數值指標欄位（原始指標名稱，如 'Voltage'） */
  metrics?: string[];
  /** 選定的分組欄位（如 'Batch_No'） */
  groupFields?: string[];
  /** 值欄位（在分組模式下，包含 _mean、_count 等統計欄位） */
  valueColumns?: string[];
  /** 可配置的唯一識別碼欄位名稱（默認為 'Point_ID'） */
  uniqueIdFieldName?: string;
}

/**
 * 輔助函數：返回陣列中第一個非 undefined 的值
 * Helper function: Returns the first non-undefined value in the array
 *
 * @param values - 字串或 undefined 的陣列
 * @returns 第一個非 undefined 的值，如果全部為 undefined 則返回 undefined
 *
 * @example
 * ```ts
 * firstAvailable([undefined, 'Voltage', 'Current']) // 'Voltage'
 * firstAvailable([undefined, undefined]) // undefined
 * ```
 */
const firstAvailable = (values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    if (value) {
      return value;
    }
  }
  return undefined;
};

/**
 * 輔助函數：格式化欄位名稱為更簡潔的標籤
 * Helper function: Formats field name into a more concise label
 *
 * 從欄位名稱中提取前綴部分，用於生成更友好的圖表推薦描述。
 * 例如：'Voltage_stat_mean' -> 'Voltage'
 *
 * @param value - 原始欄位名稱
 * @param fallback - 如果 value 為空或無法解析時的默認值
 * @returns 格式化後的標籤
 *
 * @example
 * ```ts
 * formatLabel('Voltage_stat_mean', 'metric') // 'Voltage'
 * formatLabel('Current_count', 'metric') // 'Current'
 * formatLabel(undefined, 'metric') // 'metric'
 * ```
 */
const formatLabel = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }
  const parts = value.split('_');
  return parts[0] || fallback;
};

/**
 * 獲取圖表推薦列表
 * Get Chart Recommendations
 *
 * 這是圖表智能推薦的核心函數，根據數據分析結果生成優先級排序的圖表推薦列表。
 *
 * ## 推薦策略 (Recommendation Strategy)
 *
 * ### 分組檢視模式 (Grouped View Mode)
 * 當 `dataViewMode === 'grouped'` 時，數據已經過聚合統計，推薦策略如下：
 *
 * 1. **柱狀圖比較各組指標** (Priority 5)
 *    - 條件：存在分組欄位和聚合指標（_mean、_count 等）
 *    - 用途：比較各組之間的差異
 *    - 示例：比較各批次的平均電壓
 *
 * 2. **柱狀圖展示趨勢** (Priority 4)
 *    - 條件：同上
 *    - 用途：觀察指標隨分組欄位的變化趨勢
 *
 * 3. **散點圖相關性分析** (Priority 3)
 *    - 條件：至少有兩個聚合指標
 *    - 用途：探索兩個指標之間的相關性
 *    - 示例：平均電壓 vs 平均電流的關係
 *
 * 4. **樣本數統計** (Priority 2)
 *    - 條件：存在 totalCount 欄位
 *    - 用途：檢視各分組的樣本數量分佈
 *
 * ### 逐筆資料模式 (Flattened View Mode)
 * 當 `dataViewMode === 'flattened'` 時，保留原始記錄，推薦策略如下：
 *
 * 1. **跨測點分析** (Priority 5)
 *    - 條件：存在唯一識別碼欄位（如 Point_ID）
 *    - 用途：比較不同測點的數值
 *    - 分組：可選按 Batch_No 分組
 *
 * 2. **跨批次比較** (Priority 5)
 *    - 條件：存在 Batch_No 欄位
 *    - 用途：比較不同批次的數值
 *    - 分組：可選按唯一識別碼分組
 *
 * 3. **散點圖探索關係** (Priority 4)
 *    - 條件：至少有兩個數值欄位
 *    - 用途：探索數值參數之間的關係
 *    - 分組：可選按類別欄位分組
 *
 * 4. **跨批次與跨測點綜合分析** (Priority 4)
 *    - 條件：同時存在 Batch_No 和唯一識別碼
 *    - 用途：綜合分析批次和測點維度
 *
 * ## 欄位優先級 (Field Priority)
 *
 * 推薦邏輯會按以下優先級選擇欄位：
 *
 * **分類欄位優先級**:
 * 1. Batch_No（批次編號）
 * 2. 唯一識別碼欄位（默認 Point_ID，可配置）
 * 3. groupFields[0]（用戶選定的分組欄位）
 * 4. categoricalColumns[0]（第一個分類欄位）
 * 5. Source_File（數據來源文件）
 *
 * **數值欄位優先級**:
 * 1. metrics[0]（用戶選定的指標）
 * 2. numericColumns[0]（第一個數值欄位）
 *
 * @param analysis - 數據分析結果，包含欄位類型、檢視模式、指標等信息
 * @returns 圖表推薦陣列，按優先級從高到低排序
 *
 * @example
 * ```ts
 * // 分組檢視模式範例
 * const recommendations = getChartRecommendations({
 *   dataViewMode: 'grouped',
 *   columns: ['Batch_No', 'Voltage_stat_mean', 'Current_stat_mean'],
 *   numericColumns: ['Voltage_stat_mean', 'Current_stat_mean'],
 *   categoricalColumns: ['Batch_No'],
 *   metrics: ['Voltage', 'Current'],
 *   groupFields: ['Batch_No'],
 *   valueColumns: ['Voltage_stat_mean', 'Current_stat_mean']
 * });
 * // 返回：柱狀圖推薦（比較各批次的平均電壓）
 * ```
 *
 * @example
 * ```ts
 * // 逐筆資料模式範例
 * const recommendations = getChartRecommendations({
 *   dataViewMode: 'flattened',
 *   columns: ['Batch_No', 'Point_ID', 'Voltage', 'Current'],
 *   numericColumns: ['Voltage', 'Current'],
 *   categoricalColumns: ['Batch_No', 'Point_ID'],
 *   metrics: ['Voltage', 'Current'],
 *   uniqueIdFieldName: 'Point_ID'
 * });
 * // 返回：
 * // 1. 跨測點分析（Priority 5）
 * // 2. 跨批次比較（Priority 5）
 * // 3. 散點圖探索（Priority 4）
 * ```
 */
export const getChartRecommendations = (analysis: DataAnalysis): ChartRecommendation[] => {
  const recommendations: ChartRecommendation[] = [];
  const {
    dataViewMode,
    numericColumns,
    categoricalColumns,
    metrics = [],
    groupFields = [],
    valueColumns = [],
  } = analysis;

  if (dataViewMode === 'grouped') {
    const groupField = firstAvailable([groupFields[0], categoricalColumns[0], 'Group']);
    const metricValues = metrics
      .map((metric) => firstAvailable([
        valueColumns.find((column) => column.startsWith(`${metric}_`)),
        `${metric}_mean`,
        `${metric}_count`,
        numericColumns.find((column) => column.startsWith(`${metric}_`)),
      ]))
      .filter((value): value is string => Boolean(value));

    if (groupField && metricValues.length > 0) {
      const metricLabel = formatLabel(metricValues[0], 'metric');
      recommendations.push({
        type: 'bar',
        priority: 5,
        reason: `比較 ${groupField} 各組的 ${metricLabel}`,
        suggestedConfig: {
          xAxis: groupField,
          yAxis: metricValues[0],
        },
      });
    }

    if (groupField && metricValues.length > 0) {
      const metricLabel = formatLabel(metricValues[0], 'metric');
      recommendations.push({
        type: 'bar',
        priority: 4,
        reason: `${groupField} 的 ${metricLabel} 趨勢`,
        suggestedConfig: {
          xAxis: groupField,
          yAxis: metricValues[0],
        },
      });
    }


    if (metricValues.length >= 2) {
      const [firstMetric, secondMetric] = metricValues;
      const firstLabel = formatLabel(firstMetric, 'metric');
      const secondLabel = formatLabel(secondMetric, 'metric');
      recommendations.push({
        type: 'scatter',
        priority: 3,
        reason: `${firstLabel} 與 ${secondLabel} 的相關性`,
        suggestedConfig: {
          xAxis: firstMetric,
          yAxis: secondMetric,
        },
      });
    }

    if (valueColumns.includes('totalCount')) {
      recommendations.push({
        type: 'bar',
        priority: 2,
        reason: '檢視各分組的樣本數',
        suggestedConfig: {
          xAxis: groupField ?? 'Group',
          yAxis: 'totalCount',
        },
      });
    }
  } else {
    // Enhanced semantic grouping for flattened data - prioritize cross-batch/cross-point fields
    const uniqueIdField = analysis.uniqueIdFieldName || 'Point_ID';
    const metricField = firstAvailable([metrics[0], numericColumns[0]]);
    const categoryField = firstAvailable([
      categoricalColumns.find(col => col === 'Batch_No'),
      categoricalColumns.find(col => col === uniqueIdField),
      groupFields[0],
      categoricalColumns[0],
      'Source_File'
    ]);

    if (numericColumns.length >= 2) {
      recommendations.push({
        type: 'scatter',
        priority: 4,
        reason: '探索數值參數之間的關係',
        suggestedConfig: {
          xAxis: numericColumns[0],
          yAxis: numericColumns[1],
          groupBy: categoryField,
        },
      });
    }

    if (metricField && categoryField) {
      recommendations.push({
        type: 'bar',
        priority: 4,
        reason: `比較 ${categoryField} 間的 ${metricField}`,
        suggestedConfig: {
          xAxis: categoryField,
          yAxis: metricField,
        },
      });
    }

    // Enhanced cross-batch and cross-point analysis recommendations
    if (metricField && categoricalColumns.includes(uniqueIdField)) {
      recommendations.push({
        type: 'bar',
        priority: 5,
        reason: `跨測點分析：${uniqueIdField} 的 ${metricField}`,
        suggestedConfig: {
          xAxis: uniqueIdField,
          yAxis: metricField,
          groupBy: categoricalColumns.includes('Batch_No') ? 'Batch_No' : categoryField,
        },
      });
    }

    if (metricField && categoricalColumns.includes('Batch_No')) {
      recommendations.push({
        type: 'bar',
        priority: 5,
        reason: `跨批次比較：各批次的 ${metricField}`,
        suggestedConfig: {
          xAxis: 'Batch_No',
          yAxis: metricField,
          groupBy: categoricalColumns.includes(uniqueIdField) ? uniqueIdField : undefined,
        },
      });
    }

    if (metricField && categoricalColumns.includes(uniqueIdField) && categoricalColumns.includes('Batch_No')) {
      recommendations.push({
        type: 'scatter',
        priority: 4,
        reason: `${metricField} 的跨批次與跨測點分析`,
        suggestedConfig: {
          xAxis: 'Batch_No',
          yAxis: metricField,
          groupBy: uniqueIdField,
        },
      });
    }

  }

  if (numericColumns.length >= 2) {
    recommendations.push({
      type: 'scatter',
      priority: 2,
      reason: '一般相關性分析',
      suggestedConfig: {
        xAxis: numericColumns[0],
        yAxis: numericColumns[1],
      },
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
};

/**
 * 獲取數據檢視模式的描述
 * Get Data View Mode Description
 *
 * 返回數據檢視模式的友好描述文字，用於向用戶解釋當前模式的特點。
 *
 * @param dataViewMode - 數據檢視模式（'flattened' 或 'grouped'）
 * @returns 描述文字
 *
 * @example
 * ```ts
 * getDataViewSpecificDescription('grouped')
 * // '分組檢視：每個選定的欄位組合會彙整數值指標（如 _mean、_count）。'
 *
 * getDataViewSpecificDescription('flattened')
 * // '逐筆資料：保留每筆原始欄位並附加 Source_File，方便跨批次比較。'
 * ```
 */
export const getDataViewSpecificDescription = (dataViewMode: 'flattened' | 'grouped'): string => {
  if (dataViewMode === 'grouped') {
    return '分組檢視：每個選定的欄位組合會彙整數值指標（如 _mean、_count）。';
  }
  return '逐筆資料：保留每筆原始欄位並附加 Source_File，方便跨批次比較。';
};

/**
 * 獲取推薦的圖表類型列表（僅優先級 >= 3）
 * Get Recommended Chart Types (Priority >= 3 only)
 *
 * 這是 `getChartRecommendations` 的簡化版本，只返回高優先級（>= 3）的圖表類型，
 * 不包含詳細的推薦理由和建議配置。
 *
 * 適用場景：
 * - 需要快速獲取推薦圖表類型列表
 * - 不需要詳細的推薦理由和配置
 * - 用於 UI 選項過濾或快速決策
 *
 * @param analysis - 數據分析結果
 * @returns 推薦的圖表類型陣列（優先級 >= 3），按優先級從高到低排序
 *
 * @example
 * ```ts
 * const chartTypes = getRecommendedChartTypes({
 *   dataViewMode: 'flattened',
 *   columns: ['Batch_No', 'Voltage', 'Current'],
 *   numericColumns: ['Voltage', 'Current'],
 *   categoricalColumns: ['Batch_No'],
 *   metrics: ['Voltage', 'Current']
 * });
 * // 返回：['bar', 'scatter']（只包含優先級 >= 3 的類型）
 * ```
 */
export const getRecommendedChartTypes = (analysis: DataAnalysis): ChartType[] => {
  const recommendations = getChartRecommendations(analysis);
  return recommendations.filter((item) => item.priority >= 3).map((item) => item.type);
};
