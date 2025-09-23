import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { dataFileController } from '@/controllers/dataFileController';

const router = express.Router();

// 數據文件路由
router.get('/:fileId', asyncHandler(dataFileController.getDataFile));
router.get('/:fileId/preview', asyncHandler(dataFileController.previewDataFile));
router.get('/:fileId/download', asyncHandler(dataFileController.downloadDataFile));
router.get('/:fileId/download/processed', asyncHandler(dataFileController.downloadProcessedData));

export default router;
