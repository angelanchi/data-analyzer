import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { query } from '@/utils/database';
import { ApiResponse, DataPoint } from 'shared/types';
import { createAppError } from '@/middleware/errorHandler';

export const dataFileController = {
  // 獲取數據文件元信息
  getDataFile: async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const file = await query.findOne('data_files', { id: fileId });

    if (!file) {
      throw createAppError('數據文件不存在', 404);
    }

    // 解析 columns 欄位
    const fileData = {
      ...file,
      columns: JSON.parse(file.columns || '[]')
    };

    const response: ApiResponse<any> = {
      success: true,
      data: fileData,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  },

  // 預覽數據文件內容（前50行）
  previewDataFile: async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const { limit = 50 } = req.query;

    // 檢查文件是否存在
    const file = await query.findOne('data_files', { id: fileId });
    if (!file) {
      throw createAppError('數據文件不存在', 404);
    }

    try {
      const processedDataPath = path.join(__dirname, '../../uploads', `processed_${fileId}.json`);
      const dataContent = await fs.readFile(processedDataPath, 'utf-8');
      const data: DataPoint[] = JSON.parse(dataContent);

      const limitCount = Math.min(parseInt(limit as string), 100); // 最多100行
      const previewData = data.slice(0, limitCount);

      // 計算基本統計信息
      const columns = JSON.parse(file.columns || '[]');
      const statistics: any = {};

      columns.forEach((col: string) => {
        const values = previewData.map(row => (row as any)[col]).filter(val => val !== null && val !== undefined);
        const numericValues = values.filter(val => typeof val === 'number');

        if (numericValues.length > 0) {
          const sum = numericValues.reduce((a: number, b: number) => a + b, 0);
          const avg = sum / numericValues.length;
          const sorted = [...numericValues].sort((a, b) => a - b);
          const min = sorted[0];
          const max = sorted[sorted.length - 1];

          statistics[col] = {
            type: 'numeric',
            count: numericValues.length,
            min,
            max,
            avg: Math.round(avg * 100) / 100
          };
        } else {
          statistics[col] = {
            type: 'string',
            count: values.length,
            uniqueCount: new Set(values).size
          };
        }
      });

      const response: ApiResponse<{
        preview: DataPoint[];
        statistics: any;
        totalRows: number;
        columns: string[];
      }> = {
        success: true,
        data: {
          preview: previewData,
          statistics,
          totalRows: data.length,
          columns
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`數據預覽失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  // 下載原始數據文件
  downloadDataFile: async (req: Request, res: Response) => {
    const { fileId } = req.params;

    // 檢查文件是否存在
    const file = await query.findOne('data_files', { id: fileId });
    if (!file) {
      throw createAppError('數據文件不存在', 404);
    }

    try {
      const filePath = path.join(__dirname, '../../uploads', file.filename);

      // 檢查物理文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        throw createAppError('文件已被刪除或不存在', 404);
      }

      // 設置響應頭
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Length', file.size.toString());

      // 讀取並發送文件
      const fileContent = await fs.readFile(filePath);
      res.send(fileContent);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // 重新拋出已處理的錯誤
      }
      throw createAppError(`文件下載失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  },

  // 下載處理後的JSON數據
  downloadProcessedData: async (req: Request, res: Response) => {
    const { fileId } = req.params;

    // 檢查文件是否存在
    const file = await query.findOne('data_files', { id: fileId });
    if (!file) {
      throw createAppError('數據文件不存在', 404);
    }

    try {
      const processedDataPath = path.join(__dirname, '../../uploads', `processed_${fileId}.json`);

      // 檢查處理後的文件是否存在
      try {
        await fs.access(processedDataPath);
      } catch {
        throw createAppError('處理後的數據不存在', 404);
      }

      // 設置響應頭
      const originalNameWithoutExt = file.original_name.replace(/\.[^/.]+$/, '');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalNameWithoutExt)}_processed.json"`);

      // 讀取並發送文件
      const fileContent = await fs.readFile(processedDataPath, 'utf-8');
      res.send(fileContent);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      throw createAppError(`下載處理後數據失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  }
};
