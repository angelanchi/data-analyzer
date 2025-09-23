import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, DataPoint, ExportOptions } from 'shared/types';
import { ExportService } from '@/services/exportService';
import { createAppError } from '@/middleware/errorHandler';

export const exportController = {
  exportData: async (req: Request, res: Response) => {
    const { data, format, filename, options, metadata, flattenedData, groupedData, primarySort, secondarySort } = req.body;

    if (!data || !Array.isArray(data)) {
      throw createAppError('無效的數據格式', 400);
    }

    if (!format || !['csv', 'xlsx'].includes(format)) {
      throw createAppError('不支援的匯出格式', 400);
    }

    const exportFilename = filename || `export_${Date.now()}`;

    try {
      let filePath: string;

      // Pass all export-related data to export services
      const exportOptions = {
        ...options,
        metadata,
        flattenedData,
        groupedData,
        primarySort,
        secondarySort
      };

      if (format === 'csv') {
        filePath = await ExportService.exportToCSV(data, exportFilename, exportOptions);
      } else {
        filePath = await ExportService.exportToExcel(data, exportFilename, exportOptions);
      }

      const downloadUrl = ExportService.generateDownloadUrl(path.basename(filePath));

      const response: ApiResponse<{ downloadUrl: string }> = {
        success: true,
        data: { downloadUrl },
        message: `數據已成功匯出為 ${format.toUpperCase()} 格式`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`數據匯出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  // Note: Chart export is handled entirely in the frontend using html2canvas and Plotly's built-in export.
  // This endpoint is no longer used but kept for backwards compatibility.
  // To remove this endpoint, also remove the route in exportRoutes.ts.

  downloadFile: async (req: Request, res: Response) => {
    const { filename } = req.params;

    if (!filename) {
      throw createAppError('缺少文件名稱', 400);
    }

    try {
      const filePath = path.join(__dirname, '../../exports', filename);

      // 檢查文件是否存在
      const fileInfo = await ExportService.getFileInfo(filename);
      if (!fileInfo.exists) {
        throw createAppError('文件不存在', 404);
      }

      // 設置響應標頭
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';

      switch (ext) {
        case '.csv':
          contentType = 'text/csv';
          break;
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.svg':
          contentType = 'image/svg+xml';
          break;
        case '.pdf':
          contentType = 'application/pdf';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      // 發送文件
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);

    } catch (error) {
      if (error instanceof Error && error.message === '文件不存在') {
        res.status(404).json({
          success: false,
          error: '文件不存在',
          timestamp: new Date().toISOString()
        });
      } else {
        throw createAppError(`文件下載失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
      }
    }
  },

  cleanupFile: async (req: Request, res: Response) => {
    const { filename } = req.params;

    if (!filename) {
      throw createAppError('缺少文件名稱', 400);
    }

    try {
      const filePath = path.join(__dirname, '../../exports', filename);

      // 檢查文件是否存在
      const fileInfo = await ExportService.getFileInfo(filename);
      if (!fileInfo.exists) {
        throw createAppError('文件不存在', 404);
      }

      // 刪除文件
      await fs.unlink(filePath);

      const response: ApiResponse = {
        success: true,
        message: '文件已成功刪除',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`文件刪除失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  cleanupOldFiles: async (req: Request, res: Response) => {
    const { hours = 24 } = req.query;

    try {
      await ExportService.cleanupOldFiles(parseInt(hours as string));

      const response: ApiResponse = {
        success: true,
        message: `已清理超過 ${hours} 小時的舊文件`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`文件清理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  }
};