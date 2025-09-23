import { DataPoint } from 'shared/types';
import { query } from '@/utils/database';
import fs from 'fs/promises';
import path from 'path';

export interface BatchFile {
  fileId: string;
  sourceName: string;
  data: DataPoint[];
  columns: string[];
}

export interface CommonColumns {
  common: string[];
  all: Record<string, string[]>;
}

export interface FlattenedData extends DataPoint {
  Source_File: string;
}

export interface GroupedData {
  Point_ID: string;
  [key: string]: any; // 動態欄位如 Batch1_Voltage, Batch2_Voltage
}

export interface ComparisonResult {
  Point_ID: string;
  Mean: number;
  StdDev: number;
  [key: string]: any; // 各批次的數值
}

export interface BatchViewOptions {
  flattenParams?: string[];
  groupParams?: string[];
}

export interface BatchViewMetadata {
  batchCount: number;
  flattenedRowCount: number;
  groupedPointCount: number;
  flattenParams: string[] | null;
  groupParams: string[] | null;
  sources: Array<{
    fileId: string;
    sourceName: string;
    rowCount: number;
  }>;
  columns: CommonColumns;
}

export interface BatchViewResult {
  flattenedData: FlattenedData[];
  groupedData: GroupedData[];
  metadata: BatchViewMetadata;
}

export class BatchAnalysisService {
  /**
   * 載入多個批次文件
   * @param fileIds 文件ID數組
   * @returns 批次文件數據
   */
  static async loadBatches(fileIds: string[]): Promise<BatchFile[]> {
    const batches: BatchFile[] = [];

    for (const fileId of fileIds) {
      // 從數據庫獲取文件信息
      const fileInfo = await query.findOne('data_files', { id: fileId });
      if (!fileInfo) {
        throw new Error(`文件不存在: ${fileId}`);
      }

      // 讀取處理後的數據
      const processedDataPath = path.join(__dirname, '../../uploads', `processed_${fileId}.json`);

      try {
        const dataContent = await fs.readFile(processedDataPath, 'utf-8');
        const data = JSON.parse(dataContent) as DataPoint[];

        batches.push({
          fileId,
          sourceName: fileInfo.original_name.replace(/\.(csv|xlsx?)$/i, ''), // 移除擴展名
          data,
          columns: JSON.parse(fileInfo.columns || '[]')
        });
      } catch (error) {
        console.error(`讀取文件失敗 ${fileId}:`, error);
        throw new Error(`無法讀取文件數據: ${fileInfo.original_name}`);
      }
    }

    return batches;
  }

  /**
   * 找出所有文件的共同欄位
   * @param batches 批次文件數據
   * @returns 共同欄位信息
   */
  static getCommonColumns(batches: BatchFile[]): CommonColumns {
    if (batches.length === 0) {
      return { common: [], all: {} };
    }

    // 收集所有文件的欄位
    const allColumns: Record<string, string[]> = {};
    let commonColumns: Set<string> | null = null;

    for (const batch of batches) {
      const columns = new Set(batch.columns);
      allColumns[batch.sourceName] = batch.columns;

      if (commonColumns === null) {
        commonColumns = new Set(batch.columns);
      } else {
        // 取交集
        const intersection = new Set<string>();
        for (const col of commonColumns) {
          if (columns.has(col)) {
            intersection.add(col);
          }
        }
        commonColumns = intersection;
      }
    }

    return {
      common: commonColumns ? Array.from(commonColumns).sort() : [],
      all: allColumns
    };
  }

  /**
   * 將數據轉換為扁平化格式
   * @param batches 批次文件數據
   * @param params 要保留的參數欄位
   * @returns 扁平化數據
   */
  static toFlattened(batches: BatchFile[], params?: string[]): FlattenedData[] {
    const flattenedData: FlattenedData[] = [];

    for (const batch of batches) {
      for (const row of batch.data) {
        const flatRow: FlattenedData = {
          ...row,
          Source_File: batch.sourceName
        };

        // 如果指定了參數，只保留指定的欄位
        if (params) {
          const filteredRow: Partial<FlattenedData> = {
            Point_ID: flatRow.Point_ID,
            Source_File: flatRow.Source_File
          };

          for (const param of params) {
            if (param in flatRow) {
              (filteredRow as any)[param] = (flatRow as any)[param];
            }
          }

          flattenedData.push(filteredRow as FlattenedData);
        } else {
          flattenedData.push(flatRow);
        }
      }
    }

    return flattenedData;
  }

  /**
   * 將數據轉換為分組化格式（按Point_ID分組，按Source_File展開）
   * @param batches 批次文件數據
   * @param params 要轉換的參數欄位
   * @returns 分組化數據
   */
  static toGrouped(batches: BatchFile[], params: string[]): GroupedData[] {
    // 首先獲取所有唯一的Point_ID
    const pointIds = new Set<string>();
    for (const batch of batches) {
      for (const row of batch.data) {
        if (row.Point_ID) {
          pointIds.add(row.Point_ID);
        }
      }
    }

    const groupedData: GroupedData[] = [];

    // Pre-index rows per batch to avoid repeated scans
    const indexedBatches = batches.map(batch => {
      const lookup = new Map<string, DataPoint>();
      for (const row of batch.data) {
        if (row.Point_ID) {
          lookup.set(row.Point_ID, row);
        }
      }

      return {
        sourceName: batch.sourceName,
        lookup
      };
    });

    // 為每個Point_ID創建一行
    for (const pointId of Array.from(pointIds).sort()) {
      const groupedRow: GroupedData = { Point_ID: pointId };

      // 為每個參數和每個批次創建欄位
      for (const param of params) {
        for (const { sourceName, lookup } of indexedBatches) {
          const sourceData = lookup.get(pointId);
          const columnName = `${sourceName}_${param}`;

          if (sourceData && param in sourceData) {
            groupedRow[columnName] = (sourceData as any)[param];
          } else {
            groupedRow[columnName] = null;
          }
        }
      }

      groupedData.push(groupedRow);
    }

    return groupedData;
  }

  /**
   * 建立批次數據視圖，提供扁平化與分組化結果
   * @param batches 批次文件資料
   * @param options 視圖配置
   */
  static createDataViews(
    batches: BatchFile[],
    options: BatchViewOptions = {}
  ): BatchViewResult {
    const { flattenParams, groupParams } = options;

    const flattenedData = BatchAnalysisService.toFlattened(batches, flattenParams);
    const groupedData = groupParams && groupParams.length > 0
      ? BatchAnalysisService.toGrouped(batches, groupParams)
      : [];

    const commonColumns = BatchAnalysisService.getCommonColumns(batches);

    return {
      flattenedData,
      groupedData,
      metadata: {
        batchCount: batches.length,
        flattenedRowCount: flattenedData.length,
        groupedPointCount: groupedData.length,
        flattenParams: flattenParams ?? null,
        groupParams: groupParams && groupParams.length > 0 ? groupParams : null,
        sources: batches.map(batch => ({
          fileId: batch.fileId,
          sourceName: batch.sourceName,
          rowCount: batch.data.length
        })),
        columns: commonColumns
      }
    };
  }

  /**
   * 進行批次間比較分析
   * @param groupedData 分組化數據
   * @param param 要分析的參數
   * @returns 比較分析結果
   */
  static compareAcrossBatches(groupedData: GroupedData[], param: string): ComparisonResult[] {
    const results: ComparisonResult[] = [];

    for (const row of groupedData) {
      const result: ComparisonResult = {
        Point_ID: row.Point_ID,
        Mean: 0,
        StdDev: 0
      };

      // 收集該參數在所有批次中的數值
      const values: number[] = [];
      const batchValues: Record<string, number> = {};

      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith(`_${param}`) && value !== null && value !== undefined) {
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          if (!isNaN(numValue)) {
            values.push(numValue);
            batchValues[key] = numValue;
          }
        }
      }

      // 將批次數值添加到結果中
      Object.assign(result, batchValues);

      // 計算統計指標
      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        result.Mean = Math.round(mean * 1000) / 1000; // 保留3位小數

        if (values.length > 1) {
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
          result.StdDev = Math.round(Math.sqrt(variance) * 1000) / 1000;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * 獲取數據統計信息
   * @param data 數據
   * @param param 參數
   * @returns 統計信息
   */
  static getStatistics(data: FlattenedData[], param: string) {
    const values: number[] = [];
    const bySource: Record<string, number[]> = {};

    for (const row of data) {
      if (param in row && row[param as keyof FlattenedData] !== null && row[param as keyof FlattenedData] !== undefined) {
        const value = row[param as keyof FlattenedData];
        const numValue = typeof value === 'number' ? value : parseFloat(value as string);

        if (!isNaN(numValue)) {
          values.push(numValue);

          if (!bySource[row.Source_File]) {
            bySource[row.Source_File] = [];
          }
          bySource[row.Source_File].push(numValue);
        }
      }
    }

    const calculateStats = (vals: number[]) => {
      if (vals.length === 0) return null;

      const sorted = [...vals].sort((a, b) => a - b);
      const mean = vals.reduce((sum, val) => sum + val, 0) / vals.length;
      const variance = vals.length > 1 ?
        vals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (vals.length - 1) : 0;

      return {
        count: vals.length,
        mean: Math.round(mean * 1000) / 1000,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median: sorted.length % 2 === 0 ?
          (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
          sorted[Math.floor(sorted.length / 2)],
        std: Math.round(Math.sqrt(variance) * 1000) / 1000
      };
    };

    return {
      overall: calculateStats(values),
      bySource: Object.fromEntries(
        Object.entries(bySource).map(([source, vals]) => [source, calculateStats(vals)])
      )
    };
  }
}

export default BatchAnalysisService;