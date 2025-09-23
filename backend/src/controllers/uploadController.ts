import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/utils/database';
import { createAppError } from '@/middleware/errorHandler';
import { ApiResponse, DataFile, DataPoint } from 'shared/types';

/**
 * Upload Controller
 * 文件上傳控制器
 *
 * ## 功能說明 (Features)
 * 處理數據文件（CSV/Excel）的上傳、解析、存儲和管理。
 * 支援的文件格式：
 * - CSV (text/csv)
 * - Excel (.xlsx, .xls)
 *
 * ## 主要功能 (Main Functions)
 * 1. **uploadFile** - 上傳並解析文件
 * 2. **getUploadedFiles** - 獲取已上傳文件列表
 * 3. **getFileInfo** - 獲取特定文件信息
 * 4. **deleteFile** - 刪除文件及其數據
 *
 * ## 文件處理流程 (File Processing Flow)
 * ```
 * 1. 接收上傳文件（通過 multer 中間件）
 * 2. 生成唯一 fileId (UUID)
 * 3. 根據文件類型解析內容：
 *    - CSV: 使用 papaparse
 *    - Excel: 使用 xlsx
 * 4. 自動轉換數值類型（字串數字 → 數值）
 * 5. 保存文件記錄到 data_files 表
 * 6. 將處理後數據保存為 JSON 文件
 * 7. 返回 fileId 和前 100 行預覽數據
 * ```
 *
 * ## 數據庫存儲 (Database Storage)
 * - **data_files 表**: 存儲文件元數據
 * - **processed_{fileId}.json**: 存儲完整的解析數據
 *
 * @module uploadController
 */
export const uploadController = {
  /**
   * 上傳並解析文件
   * Upload and Parse File
   *
   * 接收用戶上傳的 CSV 或 Excel 文件，解析內容並存儲到數據庫。
   *
   * ## 處理步驟 (Processing Steps)
   * 1. 驗證文件存在（req.file 由 multer 提供）
   * 2. 生成唯一的 fileId (UUID)
   * 3. 根據 MIME 類型選擇解析器：
   *    - `text/csv`: papaparse
   *    - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`: xlsx
   * 4. 解析並提取數據：
   *    - 自動識別欄位名稱（從第一行標題）
   *    - 自動轉換數值型別（parseFloat）
   *    - 跳過空行
   * 5. 保存到數據庫：
   *    - 文件元數據存入 data_files 表
   *    - 處理後數據保存為 JSON 文件
   * 6. 返回響應：
   *    - fileId: 用於後續操作
   *    - data: 前 100 行預覽數據
   *
   * ## CSV 解析選項 (CSV Parse Options)
   * - `header: true` - 第一行作為欄位名稱
   * - `skipEmptyLines: true` - 跳過空行
   * - `transform` - 自動轉換數字類型
   *
   * ## 錯誤處理 (Error Handling)
   * - 如果解析失敗，更新 data_files 表的狀態為 'error'
   * - 返回 400 錯誤和詳細錯誤訊息
   *
   * @route POST /api/upload
   * @access Public
   *
   * @param {Request} req - Express 請求對象，包含上傳的文件
   * @param {Express.Multer.File} req.file - multer 處理後的文件對象
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<{ fileId: string; data: DataPoint[] }>} 文件 ID 和預覽數據
   *
   * @throws {AppError} 400 - 沒有上傳文件或文件處理失敗
   *
   * @example
   * ```ts
   * // 前端調用範例
   * const formData = new FormData();
   * formData.append('file', file);
   *
   * const response = await fetch('/api/upload', {
   *   method: 'POST',
   *   body: formData
   * });
   *
   * const result = await response.json();
   * // result.data.fileId - 文件 ID
   * // result.data.data - 前 100 行預覽數據
   * ```
   */
  uploadFile: async (req: Request, res: Response) => {
    if (!req.file) {
      throw createAppError('沒有上傳文件', 400);
    }

    const fileId = uuidv4();
    const filePath = req.file.path;

    try {
      // 解析文件內容
      let data: DataPoint[] = [];
      let columns: string[] = [];

      if (req.file.mimetype === 'text/csv') {
        // 解析CSV文件
        const csvContent = await fs.readFile(filePath, 'utf-8');
        const parseResult = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          transform: (value: string) => {
            // 嘗試轉換數字
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
          }
        });

        data = parseResult.data as DataPoint[];
        columns = parseResult.meta.fields || [];
      } else {
        // 解析Excel文件
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        data = jsonData as DataPoint[];
        if (data.length > 0) {
          columns = Object.keys(data[0]);
        }
      }

      // 保存文件信息到數據庫
      const dataFileRecord = {
        id: fileId,
        filename: req.file.filename,
        original_name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploaded_at: new Date().toISOString(),
        row_count: data.length,
        column_count: columns.length,
        columns: JSON.stringify(columns),
        status: 'processed',
        processed_at: new Date().toISOString()
      };

      await query.insert('data_files', dataFileRecord);

      // 將處理後的數據保存為JSON文件
      const processedDataPath = path.join(
        path.dirname(filePath),
        `processed_${fileId}.json`
      );
      await fs.writeFile(processedDataPath, JSON.stringify(data, null, 2));

      const response: ApiResponse<{ fileId: string; data: DataPoint[] }> = {
        success: true,
        data: { fileId, data: data.slice(0, 100) }, // 只返回前100行預覽
        message: '文件上傳並處理成功',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      // 更新文件狀態為錯誤
      await query.update(
        'data_files',
        {
          status: 'error',
          error_message: error instanceof Error ? error.message : '未知錯誤'
        },
        { id: fileId }
      );

      throw createAppError(`文件處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 400);
    }
  },

  /**
   * 獲取已上傳的文件列表
   * Get Uploaded Files List
   *
   * 查詢數據庫中所有已上傳文件的記錄，按上傳時間降序排列。
   *
   * @route GET /api/upload/files
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<DataFile[]>} 文件列表，按上傳時間降序
   */
  getUploadedFiles: async (req: Request, res: Response) => {
    const files = await query.findMany('data_files', undefined, 'uploaded_at DESC');

    const response: ApiResponse<DataFile[]> = {
      success: true,
      data: files,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  },

  /**
   * 獲取特定文件的詳細信息
   * Get File Information
   *
   * 根據 fileId 查詢特定文件的元數據。
   *
   * @route GET /api/upload/:fileId
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {string} req.params.fileId - 文件 ID
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse<DataFile>} 文件詳細信息
   * @throws {AppError} 404 - 文件不存在
   */
  getFileInfo: async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const file = await query.findOne('data_files', { id: fileId });

    if (!file) {
      throw createAppError('文件不存在', 404);
    }

    const response: ApiResponse<DataFile> = {
      success: true,
      data: file,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  },

  /**
   * 刪除文件及其數據
   * Delete File
   *
   * 刪除指定的文件，包括：
   * 1. 原始上傳文件
   * 2. 處理後的 JSON 文件
   * 3. 數據庫記錄
   *
   * @route DELETE /api/upload/:fileId
   * @access Public
   *
   * @param {Request} req - Express 請求對象
   * @param {string} req.params.fileId - 文件 ID
   * @param {Response} res - Express 響應對象
   *
   * @returns {ApiResponse} 刪除成功訊息
   * @throws {AppError} 404 - 文件不存在
   * @throws {AppError} 500 - 刪除文件失敗
   */
  deleteFile: async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const file = await query.findOne('data_files', { id: fileId });

    if (!file) {
      throw createAppError('文件不存在', 404);
    }

    try {
      // 刪除物理文件
      const filePath = path.join(__dirname, '../../uploads', file.filename);
      const processedDataPath = path.join(__dirname, '../../uploads', `processed_${fileId}.json`);

      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(processedDataPath).catch(() => {});

      // 從數據庫刪除記錄
      await query.delete('data_files', { id: fileId });

      const response: ApiResponse = {
        success: true,
        message: '文件已成功刪除',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(`刪除文件失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 500);
    }
  }
};