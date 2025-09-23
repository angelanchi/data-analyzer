import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { batchController } from '@/controllers/batchController';

const router = express.Router();

// 批次分析路由
router.post('/load', asyncHandler(batchController.loadBatches));
router.post('/flattened', asyncHandler(batchController.getFlattenedData));
router.post('/grouped', asyncHandler(batchController.getGroupedData));
router.post('/views', asyncHandler(batchController.getDataViews));
router.post('/compare', asyncHandler(batchController.compareAcrossBatches));
router.post('/statistics', asyncHandler(batchController.getStatistics));

export default router;