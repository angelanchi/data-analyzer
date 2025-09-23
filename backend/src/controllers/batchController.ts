import { Request, Response } from 'express';
import { BatchAnalysisService } from '@/services/batchAnalysisService';
import { createAppError } from '@/middleware/errorHandler';
import { ApiResponse } from 'shared/types';

export const batchController = {
  // 載入批次數據並檢測共同欄位
  loadBatches: async (req: Request, res: Response) => {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      throw createAppError('請提供有效的文件ID數組', 400);
    }

    try {
      const batches = await BatchAnalysisService.loadBatches(fileIds);
      const commonColumns = BatchAnalysisService.getCommonColumns(batches);

      const response: ApiResponse = {
        success: true,
        data: {
          batches: batches.map(batch => ({
            fileId: batch.fileId,
            sourceName: batch.sourceName,
            rowCount: batch.data.length,
            columns: batch.columns
          })),
          commonColumns
        },
        message: `成功載入 ${batches.length} 個批次文件`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(
        `批次載入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        400
      );
    }
  },

  // 獲取扁平化數據
  getFlattenedData: async (req: Request, res: Response) => {
    const { fileIds, params } = req.body;

    if (!fileIds || !Array.isArray(fileIds)) {
      throw createAppError('請提供有效的文件ID數組', 400);
    }

    try {
      const batches = await BatchAnalysisService.loadBatches(fileIds);
      const flattenedData = BatchAnalysisService.toFlattened(batches, params);

      const response: ApiResponse = {
        success: true,
        data: {
          flattenedData,
          totalRows: flattenedData.length,
          sources: [...new Set(flattenedData.map(row => row.Source_File))]
        },
        message: '扁平化數據生成成功',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(
        `扁平化數據生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        400
      );
    }
  },

  // 獲取分組化數據
  getGroupedData: async (req: Request, res: Response) => {
    const { fileIds, params } = req.body;

    if (!fileIds || !Array.isArray(fileIds)) {
      throw createAppError('請提供有效的文件ID數組', 400);
    }

    if (!params || !Array.isArray(params) || params.length === 0) {
      throw createAppError('請提供要分析的參數', 400);
    }

    try {
      const batches = await BatchAnalysisService.loadBatches(fileIds);
      const groupedData = BatchAnalysisService.toGrouped(batches, params);

      const response: ApiResponse = {
        success: true,
        data: {
          groupedData,
          pointCount: groupedData.length,
          batchCount: batches.length,
          parameters: params
        },
        message: '分組化數據生成成功',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(
        `分組化數據生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        400
      );
    }
  },

  // Combined batch data views (flattened + grouped)
  getDataViews: async (req: Request, res: Response) => {
    const { fileIds, flattenParams, groupParams } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      throw createAppError('Please provide at least one batch file ID', 400);
    }

    if (flattenParams && !Array.isArray(flattenParams)) {
      throw createAppError('flattenParams must be an array when provided', 400);
    }

    if (groupParams && !Array.isArray(groupParams)) {
      throw createAppError('groupParams must be an array when provided', 400);
    }

    try {
      const batches = await BatchAnalysisService.loadBatches(fileIds);
      const dataViews = BatchAnalysisService.createDataViews(batches, {
        flattenParams,
        groupParams
      });

      const response: ApiResponse = {
        success: true,
        data: dataViews,
        message: 'Batch data views generated',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(
        'Failed to generate batch data views: ' + (error instanceof Error ? error.message : 'Unknown error'),
        400
      );
    }
  },

  // Batch comparison across selected files
  compareAcrossBatches: async (req: Request, res: Response) => {
    const { fileIds, param } = req.body;

    if (!fileIds || !Array.isArray(fileIds)) {
      throw createAppError('請提供有效的文件ID數組', 400);
    }

    if (!param || typeof param !== 'string') {
      throw createAppError('請提供要分析的參數', 400);
    }

    try {
      const batches = await BatchAnalysisService.loadBatches(fileIds);
      const groupedData = BatchAnalysisService.toGrouped(batches, [param]);
      const comparisonResult = BatchAnalysisService.compareAcrossBatches(groupedData, param);

      const response: ApiResponse = {
        success: true,
        data: {
          comparisonResult,
          parameter: param,
          batchCount: batches.length,
          pointCount: comparisonResult.length
        },
        message: `批次比較分析完成 (${param})`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(
        `批次比較分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        400
      );
    }
  },

  // 獲取數據統計信息
  getStatistics: async (req: Request, res: Response) => {
    const { fileIds, param } = req.body;

    if (!fileIds || !Array.isArray(fileIds)) {
      throw createAppError('請提供有效的文件ID數組', 400);
    }

    if (!param || typeof param !== 'string') {
      throw createAppError('請提供要分析的參數', 400);
    }

    try {
      const batches = await BatchAnalysisService.loadBatches(fileIds);
      const flattenedData = BatchAnalysisService.toFlattened(batches);
      const statistics = BatchAnalysisService.getStatistics(flattenedData, param);

      const response: ApiResponse = {
        success: true,
        data: {
          statistics,
          parameter: param,
          totalDataPoints: flattenedData.length
        },
        message: `統計分析完成 (${param})`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      throw createAppError(
        `統計分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        400
      );
    }
  }
};