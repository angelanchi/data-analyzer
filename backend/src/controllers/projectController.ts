import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, dbAll } from '@/utils/database';
import { ApiResponse, Project } from 'shared/types';
import { createAppError } from '@/middleware/errorHandler';

export const projectController = {
  getProjects: async (req: Request, res: Response) => {
    const projects = await query.findMany('projects', { status: 'active' }, 'updated_at DESC');
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects.map(p => ({
        ...p,
        collaborators: JSON.parse(p.collaborators || '[]'),
        data_files: JSON.parse(p.data_files || '[]'),
        charts: JSON.parse(p.charts || '[]'),
        tags: JSON.parse(p.tags || '[]')
      })),
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  createProject: async (req: Request, res: Response) => {
    const { name, description, owner } = req.body;
    
    if (!name || !owner) {
      throw createAppError('專案名稱和擁有者為必填欄位', 400);
    }

    const projectId = uuidv4();
    const project = {
      id: projectId,
      name,
      description: description || '',
      owner,
      collaborators: '[]',
      data_files: '[]',
      charts: '[]',
      status: 'active',
      tags: '[]'
    };

    await query.insert('projects', project);
    
    const response: ApiResponse<Project> = {
      success: true,
      data: {
        ...project,
        collaborators: [],
        data_files: [],
        charts: [],
        tags: []
      } as any,
      message: '專案建立成功',
      timestamp: new Date().toISOString()
    };
    res.status(201).json(response);
  },

  getProject: async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const project = await query.findOne('projects', { id: projectId });

    if (!project) {
      throw createAppError('專案不存在', 404);
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: {
        ...project,
        collaborators: JSON.parse(project.collaborators || '[]'),
        data_files: JSON.parse(project.data_files || '[]'),
        charts: JSON.parse(project.charts || '[]'),
        tags: JSON.parse(project.tags || '[]')
      },
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  getProjectDataFiles: async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const project = await query.findOne('projects', { id: projectId });

    if (!project) {
      throw createAppError('專案不存在', 404);
    }

    const fileIds: string[] = JSON.parse(project.data_files || '[]');

    if (fileIds.length === 0) {
      const response: ApiResponse<any[]> = {
        success: true,
        data: [],
        timestamp: new Date().toISOString()
      };
      return res.status(200).json(response);
    }

    // 獲取所有關聯的數據文件詳細信息 - 使用 SQL IN 查詢
    const placeholders = fileIds.map(() => '?').join(', ');
    const files = await dbAll(
      `SELECT * FROM data_files WHERE id IN (${placeholders})`,
      fileIds
    );

    // 解析 columns 欄位
    const filesWithParsedColumns = files.map(file => ({
      ...file,
      columns: JSON.parse(file.columns || '[]')
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: filesWithParsedColumns,
      timestamp: new Date().toISOString()
    };
    return res.status(200).json(response);
  },

  updateProject: async (req: Request, res: Response) => {
    // TODO: 實作專案更新邏輯
    const response: ApiResponse = {
      success: true,
      message: '專案更新功能開發中',
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  deleteProject: async (req: Request, res: Response) => {
    // TODO: 實作專案刪除邏輯
    const response: ApiResponse = {
      success: true,
      message: '專案刪除功能開發中',
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  addCollaborator: async (req: Request, res: Response) => {
    // TODO: 實作協作者管理邏輯
    const response: ApiResponse = {
      success: true,
      message: '協作者管理功能開發中',
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  removeCollaborator: async (req: Request, res: Response) => {
    // TODO: 實作移除協作者邏輯
    const response: ApiResponse = {
      success: true,
      message: '移除協作者功能開發中',
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  getCollaborators: async (req: Request, res: Response) => {
    // TODO: 實作獲取協作者列表邏輯
    const response: ApiResponse = {
      success: true,
      message: '獲取協作者列表功能開發中',
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  },

  // 添加數據文件到專案
  addDataFilesToProject: async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { fileIds } = req.body;

    console.log('[addDataFilesToProject] Request received:', { projectId, fileIds, type: typeof fileIds, isArray: Array.isArray(fileIds) });

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      console.error('[addDataFilesToProject] Invalid fileIds:', fileIds);
      throw createAppError('fileIds 必須是非空數組', 400);
    }

    // 獲取專案
    const project = await query.findOne('projects', { id: projectId });
    if (!project) {
      console.error('[addDataFilesToProject] Project not found:', projectId);
      throw createAppError('專案不存在', 404);
    }

    console.log('[addDataFilesToProject] Project found:', { id: project.id, name: project.name });

    // 驗證所有文件是否存在 - 使用 SQL IN 查詢
    const placeholders = fileIds.map(() => '?').join(', ');
    const existingFilesInDb = await dbAll(
      `SELECT id FROM data_files WHERE id IN (${placeholders})`,
      fileIds
    );

    console.log('[addDataFilesToProject] Files found in DB:', {
      requested: fileIds.length,
      found: existingFilesInDb.length,
      files: existingFilesInDb
    });

    if (existingFilesInDb.length !== fileIds.length) {
      const existingIds = existingFilesInDb.map((f: any) => f.id);
      const missingIds = fileIds.filter(id => !existingIds.includes(id));
      console.error('[addDataFilesToProject] Missing files:', { missingIds, existingIds, requestedIds: fileIds });
      throw createAppError(`以下文件不存在: ${missingIds.join(', ')}`, 400);
    }

    // 獲取現有的數據文件列表
    const existingFiles: string[] = JSON.parse(project.data_files || '[]');

    // 追加新文件（去重）
    const uniqueFiles = Array.from(new Set([...existingFiles, ...fileIds]));

    // 更新專案
    await query.update('projects',
      { data_files: JSON.stringify(uniqueFiles) },
      { id: projectId }
    );

    const response: ApiResponse = {
      success: true,
      message: `成功添加 ${fileIds.length} 個數據文件到專案`,
      data: {
        projectId,
        addedFiles: fileIds,
        totalFiles: uniqueFiles.length
      },
      timestamp: new Date().toISOString()
    };
    return res.status(200).json(response);
  },

  // 創建分析配置
  createAnalysisConfig: async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const {
      name,
      selectedMetrics,
      selectedCategoricalMetrics,
      selectedGroups,
      primarySort,
      secondarySort,
      columnTypeOverrides,
      chartConfig,
      cleaningRules,
      metadata
    } = req.body;

    if (!name) {
      throw createAppError('配置名稱不能為空', 400);
    }

    // 驗證專案存在
    const project = await query.findOne('projects', { id: projectId });
    if (!project) {
      throw createAppError('專案不存在', 404);
    }

    const configId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query.insert('analysis_configurations', {
      id: configId,
      project_id: projectId,
      name,
      selected_metrics: JSON.stringify(selectedMetrics || []),
      selected_categorical_metrics: JSON.stringify(selectedCategoricalMetrics || []),
      selected_groups: JSON.stringify(selectedGroups || []),
      primary_sort: primarySort || null,
      secondary_sort: secondarySort || null,
      column_type_overrides: JSON.stringify(columnTypeOverrides || {}),
      chart_config: chartConfig ? JSON.stringify(chartConfig) : null,
      cleaning_rules: JSON.stringify(cleaningRules || []),
      metadata: metadata ? JSON.stringify(metadata) : null
    });

    const response: ApiResponse = {
      success: true,
      message: '分析配置保存成功',
      data: {
        configId,
        projectId,
        name
      },
      timestamp: new Date().toISOString()
    };
    return res.status(201).json(response);
  },

  // 獲取專案的所有分析配置
  getAnalysisConfigs: async (req: Request, res: Response) => {
    const { projectId } = req.params;

    // 驗證專案存在
    const project = await query.findOne('projects', { id: projectId });
    if (!project) {
      throw createAppError('專案不存在', 404);
    }

    const configs = await query.findMany('analysis_configurations',
      { project_id: projectId },
      'created_at DESC'
    );

    // 解析 JSON 字段
    const parsedConfigs = configs.map(config => ({
      ...config,
      selected_metrics: JSON.parse(config.selected_metrics || '[]'),
      selected_categorical_metrics: JSON.parse(config.selected_categorical_metrics || '[]'),
      selected_groups: JSON.parse(config.selected_groups || '[]'),
      column_type_overrides: JSON.parse(config.column_type_overrides || '{}'),
      chart_config: config.chart_config ? JSON.parse(config.chart_config) : null,
      cleaning_rules: JSON.parse(config.cleaning_rules || '[]'),
      metadata: config.metadata ? JSON.parse(config.metadata) : null
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: parsedConfigs,
      timestamp: new Date().toISOString()
    };
    return res.status(200).json(response);
  },

  // 更新分析配置
  updateAnalysisConfig: async (req: Request, res: Response) => {
    const { configId } = req.params;
    const {
      name,
      selectedMetrics,
      selectedCategoricalMetrics,
      selectedGroups,
      primarySort,
      secondarySort,
      columnTypeOverrides,
      chartConfig,
      cleaningRules,
      metadata
    } = req.body;

    // 驗證配置存在
    const config = await query.findOne('analysis_configurations', { id: configId });
    if (!config) {
      throw createAppError('分析配置不存在', 404);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (selectedMetrics !== undefined) updateData.selected_metrics = JSON.stringify(selectedMetrics);
    if (selectedCategoricalMetrics !== undefined) updateData.selected_categorical_metrics = JSON.stringify(selectedCategoricalMetrics);
    if (selectedGroups !== undefined) updateData.selected_groups = JSON.stringify(selectedGroups);
    if (primarySort !== undefined) updateData.primary_sort = primarySort;
    if (secondarySort !== undefined) updateData.secondary_sort = secondarySort;
    if (columnTypeOverrides !== undefined) updateData.column_type_overrides = JSON.stringify(columnTypeOverrides);
    if (chartConfig !== undefined) updateData.chart_config = JSON.stringify(chartConfig);
    if (cleaningRules !== undefined) updateData.cleaning_rules = JSON.stringify(cleaningRules);
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);

    await query.update('analysis_configurations', updateData, { id: configId });

    const response: ApiResponse = {
      success: true,
      message: '分析配置更新成功',
      data: { configId },
      timestamp: new Date().toISOString()
    };
    return res.status(200).json(response);
  }
};