import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DataPoint, ExportOptions } from 'shared/types';

/**
 * 對數據應用排序
 */
function applySorting<T extends Record<string, any>>(
  data: T[],
  primarySort: string | null | undefined,
  secondarySort: string | null | undefined
): T[] {
  if (!primarySort) return data;

  return [...data].sort((a, b) => {
    // Primary sort
    const primaryA = String(a[primarySort] ?? '');
    const primaryB = String(b[primarySort] ?? '');
    if (primaryA !== primaryB) {
      return primaryA.localeCompare(primaryB);
    }

    // Secondary sort (if specified)
    if (secondarySort) {
      const secondaryA = String(a[secondarySort] ?? '');
      const secondaryB = String(b[secondarySort] ?? '');
      return secondaryA.localeCompare(secondaryB);
    }

    return 0;
  });
}

export class ExportService {
  private static readonly EXPORT_DIR = path.join(__dirname, '../../exports');

  /**
   * 確保匯出目錄存在
   */
  private static async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.EXPORT_DIR);
    } catch {
      await fs.mkdir(this.EXPORT_DIR, { recursive: true });
    }
  }

  /**
   * 匯出數據為CSV格式
   */
  static async exportToCSV(
    data: DataPoint[],
    filename: string,
    options?: ExportOptions & {
      metadata?: any;
      flattenedData?: any[];
      groupedData?: any[];
      primarySort?: string | null;
      secondarySort?: string | null;
    }
  ): Promise<string> {
    await this.ensureExportDirectory();

    // 準備CSV內容
    let csvContent = '';

    // 1. Data Overview（總是包含，如果提供了 metadata 和 flattenedData）
    if (options?.metadata && options?.flattenedData) {
      csvContent += this.generateDataOverviewCSV(options.metadata, options.flattenedData);
      csvContent += '\n========================================\n\n';
    }

    // 2. 逐筆數據（已排序）
    const flattenedData = options?.flattenedData || data;
    const sortedFlattenedData = applySorting(
      flattenedData,
      options?.primarySort,
      options?.secondarySort
    );

    if (sortedFlattenedData.length > 0) {
      csvContent += '=== 逐筆數據';
      if (options?.primarySort) {
        csvContent += ` (排序：${options.primarySort}`;
        if (options?.secondarySort) {
          csvContent += ` → ${options.secondarySort}`;
        }
        csvContent += ')';
      }
      csvContent += ' ===\n\n';

      const headers = Object.keys(sortedFlattenedData[0]);
      csvContent += headers.join(',') + '\n';

      for (const row of sortedFlattenedData) {
        const values = headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvContent += values.join(',') + '\n';
      }

      csvContent += '\n';
    }

    // 3. 分組數據（如果存在）
    if (options?.groupedData && options.groupedData.length > 0) {
      csvContent += '========================================\n\n';
      csvContent += '=== 分組彙總數據 ===\n\n';

      const groupHeaders = Object.keys(options.groupedData[0]);
      csvContent += groupHeaders.join(',') + '\n';

      for (const row of options.groupedData) {
        const values = groupHeaders.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvContent += values.join(',') + '\n';
      }

      csvContent += '\n';
    }

    // 寫入文件（添加BOM標記以確保Excel正確識別UTF-8編碼）
    const filePath = path.join(this.EXPORT_DIR, `${filename}.csv`);
    const csvWithBOM = '\uFEFF' + csvContent;  // 添加UTF-8 BOM
    await fs.writeFile(filePath, csvWithBOM, 'utf-8');

    return filePath;
  }

  /**
   * 匯出數據為Excel格式
   */
  static async exportToExcel(
    data: DataPoint[],
    filename: string,
    options?: ExportOptions & {
      metadata?: any;
      flattenedData?: any[];
      groupedData?: any[];
      primarySort?: string | null;
      secondarySort?: string | null;
    }
  ): Promise<string> {
    await this.ensureExportDirectory();

    // 創建工作簿
    const workbook = XLSX.utils.book_new();

    // 1. Data Overview 工作表（總是第一個）
    if (options?.metadata && options?.flattenedData) {
      const overviewSheet = this.generateDataOverviewSheet(
        options.metadata,
        options.flattenedData
      );
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Data Overview');
    }

    // 2. 逐筆數據工作表（已排序，總是包含）
    const flattenedData = options?.flattenedData || data;
    const sortedFlattenedData = applySorting(
      flattenedData,
      options?.primarySort,
      options?.secondarySort
    );

    if (sortedFlattenedData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(sortedFlattenedData);

      // 設置列寬
      const columnWidths = this.calculateColumnWidths(sortedFlattenedData);
      worksheet['!cols'] = columnWidths;

      // 工作表名稱顯示排序信息
      let sheetName = '逐筆數據';
      if (options?.primarySort) {
        sheetName += ' (已排序)';
      }
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // 3. 分組數據工作表（如果存在）
    if (options?.groupedData && options.groupedData.length > 0) {
      const groupedWorksheet = XLSX.utils.json_to_sheet(options.groupedData);

      // 設置列寬
      const groupedColumnWidths = this.calculateColumnWidths(options.groupedData);
      groupedWorksheet['!cols'] = groupedColumnWidths;

      XLSX.utils.book_append_sheet(workbook, groupedWorksheet, '分組彙總數據');
    }

    // 寫入文件
    const filePath = path.join(this.EXPORT_DIR, `${filename}.xlsx`);
    XLSX.writeFile(workbook, filePath);

    return filePath;
  }

  /**
   * 生成 Data Overview 工作表
   */
  private static generateDataOverviewSheet(metadata: any, flattenedData: any[]): XLSX.WorkSheet {
    const overviewData: any[] = [];
    const MAX_PREVIEW_ROWS = 15;

    // Section 1: Summary Information
    overviewData.push({ Section: '=== SUMMARY INFORMATION ===' });
    overviewData.push({ Section: 'Batches', Value: metadata.batchCount || 0 });
    overviewData.push({ Section: 'Total Rows', Value: metadata.flattenedRowCount || flattenedData.length });
    overviewData.push({ Section: 'Numeric Fields', Value: (metadata.columnTypes?.numeric || []).length });
    overviewData.push({ Section: 'Categorical Fields', Value: (metadata.columnTypes?.categorical || []).length });
    overviewData.push({ Section: '' }); // Empty row

    // Section 2: Source Files
    overviewData.push({ Section: '=== SOURCE FILES ===' });
    if (metadata.sources && metadata.sources.length > 0) {
      metadata.sources.forEach((source: any) => {
        overviewData.push({
          Section: source.sourceName,
          Value: `${source.rowCount} rows`
        });
      });
    }
    overviewData.push({ Section: '' }); // Empty row

    // Section 3: Data Preview
    overviewData.push({ Section: `=== 資料預覽 (前 ${MAX_PREVIEW_ROWS} 列) ===` });
    if (flattenedData && flattenedData.length > 0) {
      const previewRows = flattenedData.slice(0, MAX_PREVIEW_ROWS);
      const columns = Object.keys(flattenedData[0]);

      // Add header row
      const headerRow: any = { Section: 'ROW' };
      columns.forEach(col => {
        headerRow[col] = col;
      });
      overviewData.push(headerRow);

      // Add data rows
      previewRows.forEach((row, index) => {
        const dataRow: any = { Section: `Row ${index + 1}` };
        columns.forEach(col => {
          dataRow[col] = row[col] !== null && row[col] !== undefined ? row[col] : '-';
        });
        overviewData.push(dataRow);
      });
    }
    overviewData.push({ Section: '' }); // Empty row

    // Section 4: Overall Statistics
    overviewData.push({ Section: '=== OVERALL STATISTICS ===' });
    if (metadata.aggregations?.overall) {
      const overall = metadata.aggregations.overall;
      const metrics = metadata.flattenParams || metadata.defaultMetrics || metadata.columnTypes?.numeric || [];

      // Table header
      overviewData.push({
        Section: 'Metric',
        Mean: 'Mean',
        Count: 'Count',
        Min: 'Min',
        Max: 'Max'
      });

      metrics.forEach((metric: string) => {
        const stats = overall[metric];
        if (stats) {
          overviewData.push({
            Section: metric,
            Mean: stats.mean !== null && stats.mean !== undefined ? Number(stats.mean).toFixed(3) : '-',
            Count: stats.count || 0,
            Min: stats.min !== null && stats.min !== undefined ? Number(stats.min).toFixed(3) : '-',
            Max: stats.max !== null && stats.max !== undefined ? Number(stats.max).toFixed(3) : '-'
          });
        }
      });
    }
    overviewData.push({ Section: '' }); // Empty row

    // Section 5: Per-Source Metrics
    overviewData.push({ Section: '=== PER-SOURCE METRICS ===' });
    if (metadata.aggregations?.bySource && metadata.aggregations.bySource.length > 0) {
      const bySource = metadata.aggregations.bySource;
      const metrics = metadata.flattenParams || metadata.defaultMetrics || metadata.columnTypes?.numeric || [];

      // Table header
      overviewData.push({
        Section: 'Source',
        Metric: 'Metric',
        Mean: 'Mean',
        Count: 'Count'
      });

      bySource.forEach((sourceData: any) => {
        metrics.forEach((metric: string) => {
          const entry = sourceData.metrics[metric];
          if (entry) {
            overviewData.push({
              Section: sourceData.source,
              Metric: metric,
              Mean: entry.mean !== null && entry.mean !== undefined ? Number(entry.mean).toFixed(3) : '-',
              Count: entry.count || 0
            });
          }
        });
      });
    }

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(overviewData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 },  // Section column
      { wch: 15 },  // Value/Metric column
      { wch: 12 },  // Mean column
      { wch: 10 },  // Count column
      { wch: 12 },  // Min column
      { wch: 12 }   // Max column
    ];

    return worksheet;
  }

  /**
   * 生成 Data Overview CSV 格式
   */
  private static generateDataOverviewCSV(metadata: any, flattenedData: any[]): string {
    let csv = '';
    const MAX_PREVIEW_ROWS = 15;

    csv += '=== DATA OVERVIEW ===\n\n';

    // Section 1: Summary Information
    csv += '=== SUMMARY INFORMATION ===\n';
    csv += `Batches,${metadata.batchCount || 0}\n`;
    csv += `Total Rows,${metadata.flattenedRowCount || flattenedData.length}\n`;
    csv += `Numeric Fields,${(metadata.columnTypes?.numeric || []).length}\n`;
    csv += `Categorical Fields,${(metadata.columnTypes?.categorical || []).length}\n`;
    csv += '\n';

    // Section 2: Source Files
    csv += '=== SOURCE FILES ===\n';
    if (metadata.sources && metadata.sources.length > 0) {
      metadata.sources.forEach((source: any) => {
        csv += `${source.sourceName},${source.rowCount} rows\n`;
      });
    }
    csv += '\n';

    // Section 3: Data Preview
    csv += `=== 資料預覽 (前 ${MAX_PREVIEW_ROWS} 列) ===\n`;
    if (flattenedData && flattenedData.length > 0) {
      const previewRows = flattenedData.slice(0, MAX_PREVIEW_ROWS);
      const columns = Object.keys(flattenedData[0]);

      // Add header row
      csv += 'ROW,' + columns.join(',') + '\n';

      // Add data rows
      previewRows.forEach((row, index) => {
        const values = columns.map(col => {
          const value = row[col] !== null && row[col] !== undefined ? row[col] : '-';
          // Handle values with commas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csv += `Row ${index + 1},` + values.join(',') + '\n';
      });
    }
    csv += '\n';

    // Section 4: Overall Statistics
    csv += '=== OVERALL STATISTICS ===\n';
    if (metadata.aggregations?.overall) {
      const overall = metadata.aggregations.overall;
      const metrics = metadata.flattenParams || metadata.defaultMetrics || metadata.columnTypes?.numeric || [];

      // Table header
      csv += 'Metric,Mean,Count,Min,Max\n';

      metrics.forEach((metric: string) => {
        const stats = overall[metric];
        if (stats) {
          const mean = stats.mean !== null && stats.mean !== undefined ? Number(stats.mean).toFixed(3) : '-';
          const count = stats.count || 0;
          const min = stats.min !== null && stats.min !== undefined ? Number(stats.min).toFixed(3) : '-';
          const max = stats.max !== null && stats.max !== undefined ? Number(stats.max).toFixed(3) : '-';
          csv += `${metric},${mean},${count},${min},${max}\n`;
        }
      });
    }
    csv += '\n';

    // Section 5: Per-Source Metrics
    csv += '=== PER-SOURCE METRICS ===\n';
    if (metadata.aggregations?.bySource && metadata.aggregations.bySource.length > 0) {
      const bySource = metadata.aggregations.bySource;
      const metrics = metadata.flattenParams || metadata.defaultMetrics || metadata.columnTypes?.numeric || [];

      // Table header
      csv += 'Source,Metric,Mean,Count\n';

      bySource.forEach((sourceData: any) => {
        metrics.forEach((metric: string) => {
          const entry = sourceData.metrics[metric];
          if (entry) {
            const mean = entry.mean !== null && entry.mean !== undefined ? Number(entry.mean).toFixed(3) : '-';
            const count = entry.count || 0;
            csv += `${sourceData.source},${metric},${mean},${count}\n`;
          }
        });
      });
    }

    return csv;
  }

  /**
   * 計算Excel列寬
   */
  private static calculateColumnWidths(data: DataPoint[]): any[] {
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    return headers.map(header => {
      // 計算標題長度
      let maxLength = header.length;

      // 檢查前100行數據找到最大長度
      const sampleData = data.slice(0, 100);
      for (const row of sampleData) {
        const value = String(row[header as keyof DataPoint] ?? '');
        maxLength = Math.max(maxLength, value.length);
      }

      // 設置合理的最小和最大寬度
      const width = Math.min(Math.max(maxLength + 2, 10), 50);
      return { wch: width };
    });
  }

  /**
   * Note: Chart export is now handled entirely in the frontend.
   * This method is no longer used but kept for backwards compatibility.
   * Charts are exported using:
   * - html2canvas for PNG export (all chart types)
   * - Plotly's built-in toImage for Plotly charts
   * - Plotly's downloadImage for SVG export (Plotly charts only)
   * See frontend/src/utils/chartExport.ts for implementation.
   */

  /**
   * 清理舊的匯出文件
   */
  static async cleanupOldFiles(olderThanHours: number = 24): Promise<void> {
    try {
      await this.ensureExportDirectory();
      const files = await fs.readdir(this.EXPORT_DIR);
      const now = Date.now();
      const cutoffTime = now - (olderThanHours * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.EXPORT_DIR, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          console.log(`已刪除舊匯出文件: ${file}`);
        }
      }
    } catch (error) {
      console.error('清理舊文件時發生錯誤:', error);
    }
  }

  /**
   * 生成下載URL
   */
  static generateDownloadUrl(filename: string): string {
    return `/api/export/download/${encodeURIComponent(filename)}`;
  }

  /**
   * 獲取文件信息
   */
  static async getFileInfo(filename: string): Promise<{ exists: boolean; size?: number; mtime?: Date }> {
    try {
      const filePath = path.join(this.EXPORT_DIR, filename);
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        mtime: stats.mtime
      };
    } catch {
      return { exists: false };
    }
  }
}