import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { exportController } from '@/controllers/exportController';

const router = express.Router();

// 匯出路由
router.post('/data', asyncHandler(exportController.exportData));
// Note: /chart endpoint is deprecated - chart export is now handled in frontend
// router.post('/chart', asyncHandler(exportController.exportChart));
router.get('/download/:filename', asyncHandler(exportController.downloadFile));
router.delete('/cleanup/:filename', asyncHandler(exportController.cleanupFile));

export default router;