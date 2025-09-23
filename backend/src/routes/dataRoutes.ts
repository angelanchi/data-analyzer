import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { dataController } from '@/controllers/dataController';

const router = express.Router();

// 數據處理路由
router.post('/process', asyncHandler(dataController.processData));
router.get('/preview/:fileId', asyncHandler(dataController.previewData));
router.post('/statistics', asyncHandler(dataController.getStatistics));
router.post('/validate', asyncHandler(dataController.validateData));
router.post('/clean', asyncHandler(dataController.cleanData));
router.post('/preview-cleaning', asyncHandler(dataController.previewCleaning));

export default router;