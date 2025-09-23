import { Router } from 'express';
import { AnalysisController } from '@/controllers/analysisController';

const router = Router();

router.post('/run', AnalysisController.createJob);
router.get('/jobs/:jobId', AnalysisController.getJobStatus);

export default router;
