import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { chartController } from '@/controllers/chartController';

const router = express.Router();

// 圖表生成路由
router.post('/generate', asyncHandler(chartController.generateChart));
router.get('/types', asyncHandler(chartController.getChartTypes));
router.post('/config/validate', asyncHandler(chartController.validateChartConfig));
router.post('/preview', asyncHandler(chartController.previewChart));

export default router;