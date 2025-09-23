import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { projectController } from '@/controllers/projectController';
// Trigger reload
const router = express.Router();

// 專案管理路由
router.get('/', asyncHandler(projectController.getProjects));
router.post('/', asyncHandler(projectController.createProject));
router.get('/:projectId', asyncHandler(projectController.getProject));
router.put('/:projectId', asyncHandler(projectController.updateProject));
router.delete('/:projectId', asyncHandler(projectController.deleteProject));

// 協作功能路由
router.post('/:projectId/collaborators', asyncHandler(projectController.addCollaborator));
router.delete('/:projectId/collaborators/:userId', asyncHandler(projectController.removeCollaborator));
router.get('/:projectId/collaborators', asyncHandler(projectController.getCollaborators));

// 專案數據文件路由
router.get('/:projectId/data-files', asyncHandler(projectController.getProjectDataFiles));
router.post('/:projectId/data-files', asyncHandler(projectController.addDataFilesToProject));

// 分析配置路由
router.post('/:projectId/analysis-configs', asyncHandler(projectController.createAnalysisConfig));
router.get('/:projectId/analysis-configs', asyncHandler(projectController.getAnalysisConfigs));
router.put('/analysis-configs/:configId', asyncHandler(projectController.updateAnalysisConfig));

export default router;