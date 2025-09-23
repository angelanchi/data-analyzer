/**
 * Data Views Utility Module
 * 數據視圖工具模組
 *
 * 本模組負責將原始數據轉換為兩種數據格式：
 * 1. Flattened Data (扁平化數據)：
 *    - 保留所有原始記錄，僅包含選定的欄位
 *    - 支持主要/次要排序
 *    - **主要用途：圖表渲染、UI 顯示**
 * 2. Grouped Statistics (分組統計數據)：
 *    - 依據分類欄位聚合數據，計算統計指標 (mean, min, max, count, sum)
 *    - 生成帶有 _stat_* 後綴的詳細統計欄位
 *    - **主要用途：數據匯出（Excel/CSV）、統計報告生成**
 *    - **注意：不用於圖表渲染**
 *
 * Core Responsibilities:
 * - 自動偵測欄位類型 (numeric vs categorical)
 * - 處理 Unique ID 的多種變體 (Point_ID, PointId, point_id)
 * - 建立扁平化數據和分組統計數據結構
 * - 計算統計聚合 (mean, min, max, count, sum)
 *
 * @module dataViews
 */

import { BatchViewMetadata, BatchViewResult } from '../types';

/**
 * Configuration options for createDataViews function
 * 用於配置數據視圖的選項
 *
 * @interface CreateDataViewsOptions
 */
export interface CreateDataViewsOptions {
  /** @deprecated Use metrics instead - 用於扁平化視圖的數值欄位 */
  flattenParams?: string[];

  /** @deprecated Use groups instead - 用於分組的分類欄位 */
  groupParams?: string[];

  /** Numeric metrics to include in views - 要包含的數值指標欄位 */
  metrics?: string[];

  /** Categorical fields for grouping - 用於分組的分類欄位 */
  groups?: string[];

  /** Categorical metrics (string columns) to output but not use for grouping - 字串指標：要輸出的 categorical 欄位（不用於分組） */
  categoricalMetrics?: string[];

  /** Primary sort field for flattened data - 主要排序欄位 */
  primarySort?: string | null;

  /** Secondary sort field for flattened data - 次要排序欄位 */
  secondarySort?: string | null;

  /** User-specified column type overrides - 用戶手動指定的欄位類型覆寫 */
  columnTypeOverrides?: Record<string, 'numeric' | 'string'>;
}

/**
 * Input data row type with optional system fields
 * 輸入數據行類型，包含可選的系統欄位
 *
 * 支援多種 ID 欄位變體以保持向後兼容性：
 * - Point_ID (推薦格式)
 * - PointId (舊版格式)
 * - point_id (小寫格式)
 */
type InputRow = Record<string, unknown> & {
  Point_ID?: string | number | null;
  PointId?: string | number | null;
  point_id?: string | number | null;
  Source_File?: string | null;  // 系統生成的來源檔案名稱
  Batch_No?: string | number | null;  // 批次編號（可能來自原始數據）
};

/**
 * Fields that should always be treated as categorical, even if they look numeric
 * 即使看起來像數字，也應該永遠視為 categorical 的欄位
 *
 * 這些欄位通常是識別碼或分類標籤，不應進行數學運算
 *
 * Note:
 * - Source_File 不在這裡，因為它是系統生成的，不應該出現在原始欄位列表中
 * - Point_ID 已移除，因為它現在是完全可選的，應該像其他欄位一樣自動推斷類型
 */
const ALWAYS_CATEGORICAL_FIELDS = new Set(['Batch_No']);

/**
 * Convert any value to string or null (helper function)
 * 將任何值轉換為字串或 null（輔助函數）
 *
 * @param value - Any value to convert
 * @returns Trimmed string or null if empty/undefined
 */
const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length === 0 ? null : text;
};

/**
 * Resolve Point_ID with optional fallback - supports multiple variants for backwards compatibility
 * 解析 Point_ID，支援多種變體以保持向後兼容性
 *
 * 查找順序（fallback chain）：
 * 1. Point_ID (推薦格式)
 * 2. PointId (舊版格式)
 * 3. point_id (小寫格式)
 * 4. fallback 參數提供的預設值（可選）
 *
 * **重要：** Point_ID 現在是完全可選的。如果原始數據中沒有 Point_ID 且未提供 fallback，
 * 函數返回 undefined，不會強制生成 ID。
 *
 * @param row - Input data row
 * @param fallback - Optional default value if no ID field exists
 * @returns Resolved Point ID string or undefined if not found and no fallback
 */
const resolvePointId = (row: InputRow, fallback?: string): string | undefined => {
  const resolved =
    toStringOrNull(row.Point_ID) ||
    toStringOrNull(row.PointId) ||
    toStringOrNull(row.point_id);

  if (resolved) {
    return resolved;
  }

  // 只有提供 fallback 時才返回 fallback
  return fallback;
};

/**
 * Resolve source name from row data with fallback
 * 從數據行解析來源名稱，附帶降級機制
 *
 * 查找順序（fallback chain）：
 * 1. Source_File (系統生成或用戶提供)
 * 2. Batch_No (批次編號)
 * 3. "Batch{index+1}" (最終降級，使用行索引生成)
 *
 * @param row - Input data row
 * @param index - Row index (0-based)
 * @returns Resolved source name
 */
const resolveSourceName = (row: InputRow, index: number): string => {
  return (
    toStringOrNull(row.Source_File) ||
    toStringOrNull(row.Batch_No) ||
    `Batch${index + 1}`
  );
};

/**
 * Coerce a string to a number, handling various numeric formats
 * 將字串強制轉換為數字，支援多種數字格式
 *
 * 支援的格式：
 * - 整數：123, -456
 * - 小數：123.45, .5, 123.
 * - 千分位：1,234,567.89 (逗號會被移除)
 * - 科學記數法：1.23e10, -4.5E-3
 *
 * @param raw - Raw string value
 * @returns Parsed number or null if not a valid number
 *
 * @example
 * coerceNumericString("1,234.56") // 1234.56
 * coerceNumericString("-123.45e2") // -12345
 * coerceNumericString("abc") // null
 */
const coerceNumericString = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Remove thousands separators (逗號) and capture the leading numeric segment
  // Supports decimals & scientific notation
  const normalized = trimmed.replace(/,/g, '');
  const match = normalized.match(/^[+-]?(?:\d*\.?\d+|\d+\.?)(?:[eE][+-]?\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Check if a value looks like a number (can be converted to numeric)
 * 檢查值是否看起來像數字（可以被轉換為數值）
 *
 * @param value - Value to check
 * @returns true if value is numeric-like
 */
const isNumericLike = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    return coerceNumericString(value) !== null;
  }
  return false;
};

/**
 * Convert a value to number or null
 * 將值轉換為數字或 null
 *
 * @param value - Value to convert
 * @returns Numeric value or null if conversion fails
 */
const toNumeric = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    return coerceNumericString(value);
  }
  return null;
};

/**
 * Infer column types (numeric vs categorical) from data rows
 * 從數據行推斷欄位類型（數值型 vs 分類型）
 *
 * 演算法邏輯：
 * 1. 掃描所有數據行，統計每個欄位的值
 * 2. 計算每個欄位中「看起來像數字」的值的比例
 * 3. 如果比例 >= 75%，則判定為 numeric
 * 4. 特殊欄位（ALWAYS_CATEGORICAL_FIELDS）永遠視為 categorical
 *
 * @param rows - Array of data rows to analyze
 * @returns Object with two arrays: numeric and categorical field names
 *
 * @example
 * inferColumnTypes([
 *   { id: "1", voltage: "3.3", temp: 25 },
 *   { id: "2", voltage: "3.5", temp: 30 }
 * ])
 * // Returns: { numeric: ['temp', 'voltage'], categorical: ['id'] }
 */
const inferColumnTypes = (
  rows: Array<Record<string, unknown>>
) => {
  // Step 1: 統計每個欄位的數值特性
  const stats = new Map<string, { numeric: number; total: number }>();

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      // 忽略空值
      if (value === null || value === undefined || value === '') return;

      const entry = stats.get(key) ?? { numeric: 0, total: 0 };
      entry.total += 1;
      if (isNumericLike(value)) {
        entry.numeric += 1;
      }
      stats.set(key, entry);
    });
  });

  // Step 2: 根據統計結果分類欄位
  const numeric: string[] = [];
  const categorical: string[] = [];

  stats.forEach((value, key) => {
    const ratio = value.total === 0 ? 0 : value.numeric / value.total;
    // 75% threshold: 如果至少 3/4 的值看起來像數字，則判定為 numeric
    // Exception: ALWAYS_CATEGORICAL_FIELDS 中的欄位永遠是 categorical
    if (!ALWAYS_CATEGORICAL_FIELDS.has(key) && ratio >= 0.75) {
      numeric.push(key);
    } else {
      categorical.push(key);
    }
  });

  // Note: 不再強制添加不存在的欄位到 categorical
  // 只對實際存在於資料中的欄位進行類型推斷

  numeric.sort();
  categorical.sort();

  return { numeric, categorical };
};

/**
 * Remove duplicates from string array and filter out falsy values
 * 移除字串陣列中的重複值並過濾掉假值
 *
 * @param values - Array of strings (may contain duplicates or empty strings)
 * @returns Unique non-empty strings
 */
const uniqueList = (values: string[]): string[] => {
  return Array.from(new Set(values.filter(Boolean)));
};

/**
 * Apply sorting to data based on primary and secondary sort fields
 * 根據主要和次要排序欄位對數據進行排序
 *
 * This is a UI-level operation that can be applied to any data array.
 * 這是一個 UI 層級的操作，可以應用於任何數據陣列。
 *
 * Sorting Logic:
 * 1. 優先按 primarySort 欄位排序（字母順序）
 * 2. 如果 primarySort 值相同，則按 secondarySort 排序（若有指定）
 * 3. 使用 localeCompare 以支援多語言排序
 *
 * @param data - Array of data objects to sort
 * @param primarySort - Primary sort field name (required for sorting)
 * @param secondarySort - Secondary sort field name (optional)
 * @returns Sorted array (new array, original is not modified)
 *
 * @example
 * applySorting(data, 'Batch_No', 'Point_ID')
 * // Sorts by Batch_No first, then by Point_ID for same batch
 */
export const applySorting = (
  data: Array<Record<string, unknown>>,
  primarySort: string | null,
  secondarySort: string | null
): Array<Record<string, unknown>> => {
  if (!primarySort) return data;

  // 創建副本以避免修改原數組（immutable pattern）
  return [...data].sort((a, b) => {
    // Primary sort (主要排序)
    const primaryA = String(a[primarySort] ?? '');
    const primaryB = String(b[primarySort] ?? '');
    if (primaryA !== primaryB) {
      return primaryA.localeCompare(primaryB);
    }

    // Secondary sort (次要排序) - only if specified
    if (secondarySort) {
      const secondaryA = String(a[secondarySort] ?? '');
      const secondaryB = String(b[secondarySort] ?? '');
      return secondaryA.localeCompare(secondaryB);
    }

    return 0;
  });
};

/**
 * Build flattened data view from raw rows
 * 從原始數據行建立扁平化數據視圖
 *
 * Flattened view 包含所有原始記錄，僅包含選定的欄位：
 * - Source_File (系統欄位，來源檔案名稱)
 * - Unique ID field (如果提供，例如 Point_ID)
 * - Group fields (分組欄位，例如 Batch_No, Equipment_ID)
 * - Categorical metrics (字串指標，例如 Operator)
 * - Numeric metrics (數值指標，例如 Voltage, Temperature)
 *
 * @param rows - Normalized input data rows
 * @param metrics - Numeric metric field names to include
 * @param categoricalMetrics - Categorical metric field names to include
 * @param groups - Group field names to include
 * @param uniqueIdFieldName - Optional unique ID field name (e.g., 'Point_ID')
 * @returns Array of flattened data objects
 */
const buildFlattenedData = (
  rows: Array<Record<string, unknown>>,
  metrics: string[],
  categoricalMetrics: string[],
  groups: string[],
  uniqueIdFieldName?: string
): Array<Record<string, unknown>> => {
  if (rows.length === 0) return [];

  return rows.map((row) => {
    // 構建扁平化記錄，按照特定順序添加欄位
    const flattened: Record<string, unknown> = {
      Source_File: row.Source_File ?? null,
    };

    // Step 1: 添加唯一 ID（如果提供）
    if (uniqueIdFieldName) {
      flattened[uniqueIdFieldName] = row[uniqueIdFieldName] ?? null;
    }

    // Step 2: 添加分組欄位
    groups.forEach((group) => {
      flattened[group] = row[group] ?? null;
    });

    // Step 3: 添加字串指標（categorical metrics）
    categoricalMetrics.forEach((catMetric) => {
      flattened[catMetric] = row[catMetric] ?? null;
    });

    // Step 4: 添加數值指標（numeric metrics）
    metrics.forEach((metric) => {
      // 使用 hasOwnProperty 檢查以區分 undefined 和不存在的屬性
      flattened[metric] = Object.prototype.hasOwnProperty.call(row, metric)
        ? row[metric]
        : null;
    });

    return flattened;
  });
};

/**
 * Build source file summary (count records per source)
 * 建立來源檔案摘要（統計每個來源的記錄數）
 *
 * @param rows - Data rows with Source_File field
 * @returns Array of {sourceName, rowCount} objects, sorted by name
 */
const buildSourceSummary = (rows: Array<Record<string, unknown>>) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const source = String(row.Source_File ?? 'Unknown');
    counts.set(source, (counts.get(source) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sourceName, rowCount]) => ({ sourceName, rowCount }));
};

/**
 * Build grouped statistics data with aggregated metrics
 * 建立分組統計數據，包含聚合統計指標
 *
 * **重要：此函數生成的數據主要用於數據匯出，不用於圖表渲染**
 * 圖表渲染使用 flattenedData，因為圖表需要顯示原始數據點和趨勢，
 * 而不是預先計算的平均值。
 *
 * 演算法邏輯：
 * 1. 根據所有 group fields 的組合建立分組 key
 * 2. 將相同 key 的記錄歸入同一組
 * 3. 對每組的數值指標計算統計值 (mean, min, max, count, sum)
 * 4. 按指定欄位排序結果
 *
 * 輸出欄位結構（專為匯出設計）：
 * - {groupField}: 分組欄位值
 * - {metric}: 該指標的平均值（快速查看用）
 * - {metric}_stat_count: 有效數據點數量
 * - {metric}_stat_min: 最小值
 * - {metric}_stat_max: 最大值
 * - {metric}_stat_sum: 總和
 * - totalCount: 該組的總記錄數
 *
 * 使用場景：
 * - ✅ 匯出到 Excel 的 "Grouped Statistics" sheet
 * - ✅ 生成統計報告
 * - ✅ 提供聚合數據給分析功能
 * - ❌ 不傳遞給 ChartRenderer（圖表使用 flattenedData）
 *
 * @param rows - Normalized input data rows
 * @param metrics - Numeric metrics to aggregate
 * @param groups - Fields to group by (e.g., ['Batch_No', 'Equipment_ID'])
 * @param sortBy - Optional sort fields (defaults to groups)
 * @returns Array of grouped records with statistics (for export, not for charts)
 *
 * @example
 * buildGroupedData(data, ['Voltage'], ['Batch_No'])
 * // Returns (用於匯出): [
 * //   { Batch_No: 'A', Voltage: 3.3, Voltage_stat_min: 3.2, Voltage_stat_max: 3.4, ... },
 * //   { Batch_No: 'B', Voltage: 3.5, Voltage_stat_min: 3.4, Voltage_stat_max: 3.6, ... }
 * // ]
 */
const buildGroupedData = (
  rows: Array<Record<string, unknown>>,
  metrics: string[],
  groups: string[],
  sortBy?: string[]
): Array<Record<string, unknown>> => {
  if (rows.length === 0 || groups.length === 0 || metrics.length === 0) {
    return [];
  }

  // Step 1: 建立分組 Map
  // 使用複合 key（所有 group fields 的組合，用 || 分隔）
  const groupMap = new Map<string, Array<Record<string, unknown>>>();

  rows.forEach((row) => {
    // Build a composite key from all group fields
    // 例如：groups=['Batch_No', 'Equipment_ID'] -> key='A||EQ1'
    const keyParts = groups.map((group) => String(row[group] ?? 'null'));
    const key = keyParts.join('||');

    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(row);
  });

  // Step 2: 計算每組的聚合統計
  const groupedRecords: Array<Record<string, unknown>> = [];

  groupMap.forEach((groupRows, key) => {
    const record: Record<string, unknown> = {};

    // 添加分組欄位值（從 key 還原）
    groups.forEach((group, index) => {
      const keyParts = key.split('||');
      record[group] = keyParts[index] === 'null' ? null : keyParts[index];
    });

    // 對每個 metric 計算統計值
    metrics.forEach((metric) => {
      // 提取所有數值（過濾掉 null）
      const values = groupRows
        .map((row) => toNumeric(row[metric]))
        .filter((v): v is number => v !== null);

      if (values.length > 0) {
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // 主要值：平均值（用於圖表顯示）
        record[metric] = mean;
        // 詳細統計值：使用 _stat 後綴（用於匯出和詳細分析）
        record[`${metric}_stat_count`] = values.length;
        record[`${metric}_stat_min`] = min;
        record[`${metric}_stat_max`] = max;
        record[`${metric}_stat_sum`] = sum;
      } else {
        // 該組沒有有效數值
        record[metric] = null;
        record[`${metric}_stat_count`] = 0;
        record[`${metric}_stat_min`] = null;
        record[`${metric}_stat_max`] = null;
        record[`${metric}_stat_sum`] = null;
      }
    });

    // 添加該組的總記錄數（包含所有記錄，不僅是數值記錄）
    record['totalCount'] = groupRows.length;

    groupedRecords.push(record);
  });

  // Step 3: 排序結果
  // 使用指定的 sortBy 欄位，若未指定則使用 group fields
  const sortFields = sortBy && sortBy.length > 0 ? sortBy : groups;
  groupedRecords.sort((a, b) => {
    for (const field of sortFields) {
      const aVal = String(a[field] ?? '');
      const bVal = String(b[field] ?? '');
      if (aVal !== bVal) {
        return aVal.localeCompare(bVal);
      }
    }
    return 0;
  });

  return groupedRecords;
};


/**
 * Compute overall aggregations and per-source aggregations
 * 計算整體聚合統計和按來源檔案的聚合統計
 *
 * 輸出兩種聚合：
 * 1. Overall: 所有數據的整體統計（mean, count, min, max）
 * 2. By Source: 按來源檔案分組的統計（mean, count）
 *
 * @param rows - Normalized data rows with Source_File field
 * @param metrics - Numeric metrics to aggregate
 * @returns Object containing overall and bySource aggregations
 *
 * @example
 * computeOverallAggregations(data, ['Voltage', 'Current'])
 * // Returns: {
 * //   overall: {
 * //     Voltage: { mean: 3.3, count: 100, min: 3.0, max: 3.6 },
 * //     Current: { mean: 1.5, count: 100, min: 1.2, max: 1.8 }
 * //   },
 * //   bySource: [
 * //     { source: 'FileA.csv', metrics: { Voltage: { mean: 3.2, count: 50 }, ... } },
 * //     { source: 'FileB.csv', metrics: { Voltage: { mean: 3.4, count: 50 }, ... } }
 * //   ]
 * // }
 */
const computeOverallAggregations = (
  rows: Array<Record<string, unknown>>,
  metrics: string[]
) => {
  const overall: Record<string, { mean: number | null; count: number; min: number | null; max: number | null }> = {};
  const bySource = new Map<string, Record<string, { sum: number; count: number }>>();

  // 對每個 metric 計算整體統計和按來源統計
  metrics.forEach((metric) => {
    let sum = 0;
    let count = 0;
    let min: number | null = null;
    let max: number | null = null;

    rows.forEach((row) => {
      const value = toNumeric(row[metric]);
      if (value === null) return;

      // 更新整體統計
      sum += value;
      count += 1;
      min = min === null ? value : Math.min(min, value);
      max = max === null ? value : Math.max(max, value);

      // 更新按來源統計
      const source = String(row.Source_File ?? 'Unknown');
      const sourceStats = bySource.get(source) ?? {};
      const current = sourceStats[metric] ?? { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      sourceStats[metric] = current;
      bySource.set(source, sourceStats);
    });

    overall[metric] = {
      mean: count > 0 ? sum / count : null,
      count,
      min,
      max,
    };
  });

  // 轉換 Map 為排序的陣列，計算每個來源的平均值
  const bySourceArray = Array.from(bySource.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, stats]) => {
      const metricsStats: Record<string, { mean: number | null; count: number }> = {};
      Object.entries(stats).forEach(([metric, { sum, count }]) => {
        metricsStats[metric] = {
          mean: count > 0 ? sum / count : null,
          count,
        };
      });
      return { source, metrics: metricsStats };
    });

  return {
    overall,
    bySource: bySourceArray,
  };
};

/**
 * Create data formats (flattened and grouped statistics) from raw input data
 * 從原始輸入數據創建數據格式（扁平化數據和分組統計數據）
 *
 * 這是整個模組的主要導出函數，負責：
 * 1. 數據標準化（normalization）：確保 Source_File 和 Point_ID 存在
 * 2. 欄位類型推斷（type inference）：自動判斷 numeric vs categorical
 * 3. 建立扁平化數據（flattened data）：保留所有原始記錄，用於圖表渲染
 * 4. 建立分組統計數據（grouped statistics）：聚合計算統計指標，用於數據匯出
 * 5. 生成元數據（metadata）：包含欄位信息、統計等
 *
 * Data Flow:
 * Raw Data → Normalize → Infer Types → Build Data Formats → Compute Stats → Return Result
 *
 * **重要：兩種數據格式的不同用途**
 * - flattenedData: 傳遞給 ChartRenderer，用於圖表渲染和 UI 顯示
 * - groupedData: 傳遞給 ExportService，用於 Excel/CSV 匯出和統計報告
 *
 * @param data - Raw input data rows (may have Point_ID variants or not)
 * @param options - Configuration options (see CreateDataViewsOptions)
 * @returns BatchViewResult containing:
 *   - flattenedData: 用於圖表渲染和 UI 顯示的扁平化數據
 *   - groupedData: 用於數據匯出的分組統計數據（不用於圖表）
 *   - metadata: 包含欄位信息、統計等元數據
 *
 * @example
 * // Basic usage with automatic type inference
 * const result = createDataViews([
 *   { Point_ID: 'P1', Voltage: 3.3, Batch_No: 'A' },
 *   { Point_ID: 'P2', Voltage: 3.5, Batch_No: 'A' }
 * ]);
 * // result.flattenedData → 傳給 ChartRenderer
 * // result.groupedData → 傳給 ExportService
 *
 * @example
 * // Advanced usage with custom configuration
 * const result = createDataViews(data, {
 *   metrics: ['Voltage', 'Current'],
 *   groups: ['Batch_No', 'Equipment_ID'],
 *   categoricalMetrics: ['Operator'],
 *   columnTypeOverrides: { 'SerialNumber': 'string' }
 * });
 *
 * // Result structure:
 * // {
 * //   flattenedData: [...], // 所有記錄（用於圖表）
 * //   groupedData: [...],   // 聚合統計（用於匯出）
 * //   metadata: {
 * //     batchCount: 2,
 * //     columnTypes: { numeric: [...], categorical: [...] },
 * //     aggregations: { overall: {...}, bySource: [...] },
 * //     ...
 * //   }
 * // }
 */
export const createDataViews = (
  data: InputRow[],
  options: CreateDataViewsOptions = {}
): BatchViewResult => {
  // Early return: 處理空數據情況
  if (!data || data.length === 0) {
    const emptyMeta: BatchViewMetadata = {
      batchCount: 0,
      flattenedRowCount: 0,
      groupedPointCount: 0,
      flattenParams: null,
      groupParams: null,
      defaultMetrics: null,
      defaultGroups: null,
      columnTypes: { numeric: [], categorical: [] },
      sources: [],
      columns: { common: [], all: { metrics: [], groups: [] } },
      aggregations: {
        overall: {},
        bySource: [],
      },
    };

    return {
      flattenedData: [],
      groupedData: [],
      metadata: emptyMeta,
    };
  }

  // ===== STEP 1: 記錄原始欄位 =====
  // 在 normalize 之前，記錄原始資料中存在的欄位
  // 用於後續過濾出「真正的用戶欄位」vs「系統生成欄位」
  const originalColumns = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => originalColumns.add(key));
  });

  // 檢查原始資料是否有 Point_ID 欄位（任一變體）
  const hasPointId = data.some(row =>
    row.Point_ID !== undefined ||
    row.PointId !== undefined ||
    row.point_id !== undefined
  );

  // ===== STEP 2: 數據標準化 (Normalization) =====
  // 目標：確保每筆記錄都有 Source_File，並根據需要添加 Point_ID
  const normalized = data
    .map((row, index) => {
      const sourceName = resolveSourceName(row, index);
      const result: any = {
        ...row,
        Source_File: sourceName,  // 添加或覆寫 Source_File
      };

      // 只有原始資料有 Point_ID 時才添加/標準化 Point_ID
      // 這避免強制添加用戶不需要的 ID 欄位
      // 不再生成 fallback ID，完全尊重原始數據
      if (hasPointId) {
        const pointId = resolvePointId(row);
        if (pointId !== undefined) {
          result.Point_ID = pointId;
        }
      }

      return result;
    });
    // Point_ID 現在完全可選，不過濾任何記錄

  // ===== STEP 3: 欄位類型推斷 (Type Inference) =====
  const { numeric: inferredNumeric, categorical: inferredCategorical } = inferColumnTypes(normalized);

  // ===== STEP 4: 應用用戶的欄位類型覆寫 =====
  // 用戶可以手動指定某些欄位的類型（例如強制將數字序列號視為字串）
  let finalNumeric = [...inferredNumeric];
  let finalCategorical = [...inferredCategorical];

  if (options.columnTypeOverrides) {
    Object.entries(options.columnTypeOverrides).forEach(([field, type]) => {
      // 從兩個列表中移除該欄位（避免重複）
      finalNumeric = finalNumeric.filter(f => f !== field);
      finalCategorical = finalCategorical.filter(f => f !== field);

      // 根據覆寫的類型添加到對應列表
      if (type === 'numeric') {
        finalNumeric.push(field);
      } else {
        finalCategorical.push(field);
      }
    });

    // 重新排序以保持一致性
    finalNumeric.sort();
    finalCategorical.sort();
  }

  // ===== STEP 5: 過濾出「原始欄位」=====
  // 區分「用戶上傳的欄位」vs「系統生成的欄位」
  // 原始欄位：實際存在於上傳文件中的欄位
  // 系統欄位：Source_File, Point_ID (如果原始數據沒有的話)
  const USEFUL_SYSTEM_FIELDS = ['Source_File'];  // Source_File 雖是系統生成，但對用戶有用
  const originalCategorical = finalCategorical.filter(
    (field) => originalColumns.has(field) || USEFUL_SYSTEM_FIELDS.includes(field)
  );
  const originalNumeric = finalNumeric.filter((field) => originalColumns.has(field));

  // ===== STEP 6: 確定要使用的 metrics 和 groups =====
  // 優先級：用戶指定 > options 參數 > 推斷的預設值
  const metricsInput = options.flattenParams ?? options.metrics ?? inferredNumeric;
  const groupsInput = options.groupParams ?? options.groups ?? (
    // 預設使用 Source_File 作為分組欄位（如果存在），否則使用第一個 categorical 欄位
    inferredCategorical.includes('Source_File') ? ['Source_File'] : inferredCategorical.slice(0, 1)
  );

  // 建立可用欄位集合（用於驗證用戶選擇的欄位是否存在）
  const availableColumns = new Set<string>();
  normalized.forEach((row) => {
    Object.keys(row).forEach((key) => availableColumns.add(key));
  });

  // 過濾並驗證 metrics（數值指標）
  let metrics = uniqueList(metricsInput).filter((metric) => availableColumns.has(metric));
  if (metrics.length === 0) {
    // 降級：如果沒有有效的 metrics，使用所有推斷的 numeric 欄位
    metrics = [...inferredNumeric];
  }

  // 過濾並驗證 groups（分組欄位）
  let groups = uniqueList(groupsInput).filter((group) => availableColumns.has(group));
  if (groups.length === 0 && availableColumns.has('Source_File')) {
    // 降級：如果沒有有效的 groups，使用 Source_File
    groups = ['Source_File'];
  }

  // 處理字串指標（categoricalMetrics）
  // 這些欄位會出現在扁平化視圖中，但不用於分組
  const categoricalMetricsInput = options.categoricalMetrics ?? [];
  const categoricalMetrics = uniqueList(categoricalMetricsInput).filter((catMetric) =>
    availableColumns.has(catMetric) && !groups.includes(catMetric)  // 排除已在 groups 中的欄位
  );

  // ===== STEP 7: 決定是否使用 Unique ID =====
  // 只有原始資料有 Point_ID 時才使用（避免強加系統欄位）
  const usePointId = normalized.some(row => row.Point_ID !== undefined);
  const uniqueIdField = usePointId ? 'Point_ID' : undefined;

  // ===== STEP 8: 構建數據視圖 =====
  let flattenedData = buildFlattenedData(normalized, metrics, categoricalMetrics, groups, uniqueIdField);
  const groupedData = buildGroupedData(normalized, metrics, groups);

  // ===== STEP 8.5: 應用排序（如果指定）=====
  // 在構建 flattenedData 之後立即應用排序
  // 這確保數據預覽、圖表和匯出都使用相同的排序
  const { primarySort, secondarySort } = options;
  if (primarySort) {
    flattenedData = applySorting(flattenedData, primarySort, secondarySort ?? null);
  }

  // ===== STEP 9: 計算統計信息 =====
  const sources = buildSourceSummary(normalized);
  const aggregations = computeOverallAggregations(normalized, metrics);

  // ===== STEP 10: 組裝 Metadata =====
  // Metadata 包含完整的數據集資訊，用於 UI 顯示和後續處理
  const metadata: BatchViewMetadata = {
    batchCount: sources.length,                   // 批次數量（來源文件數）
    flattenedRowCount: flattenedData.length,     // 扁平化視圖的記錄數
    groupedPointCount: groupedData.length,       // 分組視圖的記錄數

    // 當前使用的 metrics 和 groups（可能來自用戶選擇）
    flattenParams: metrics.length ? [...metrics] : null,
    groupParams: groups.length ? [...groups] : null,

    // 推薦的預設 metrics 和 groups（僅包含原始欄位）
    defaultMetrics: originalNumeric.length ? [...originalNumeric] : null,
    defaultGroups: originalCategorical.length ? [...originalCategorical] : null,

    columnTypes: {
      // 所有欄位（包含系統欄位）
      numeric: [...finalNumeric],
      categorical: [...finalCategorical],
      // 原始欄位（只包含上傳資料中的欄位，不含系統生成欄位）
      originalNumeric: [...originalNumeric],
      originalCategorical: [...originalCategorical],
    },

    sources,  // 來源檔案摘要（含每個來源的記錄數）

    columns: {
      common: [...metrics],  // 當前使用的公共欄位（metrics）
      all: {
        metrics: [...originalNumeric],      // 所有可用的數值欄位（原始欄位）
        groups: [...originalCategorical]    // 所有可用的分類欄位（原始欄位）
      },
    },

    // 聚合統計（整體和按來源分組）
    aggregations: {
      overall: aggregations.overall,    // 整體統計
      bySource: aggregations.bySource,  // 按來源的統計
    },
  };

  // ===== STEP 11: 返回結果 =====
  return {
    flattenedData,  // 扁平化數據：所有原始記錄（用於圖表渲染）
    groupedData,    // 分組統計數據：聚合統計記錄（用於數據匯出）
    metadata,       // 元數據：欄位資訊、統計等
  };
};
