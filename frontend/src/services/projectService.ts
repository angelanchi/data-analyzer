import { Project } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * API Response interface (from backend using snake_case)
 * API 響應介面（後端使用 snake_case）
 */
interface ApiProject {
  id: string;
  name: string;
  description: string;
  owner: string;
  collaborators: string[];
  data_files: string[];
  charts: any[];
  status?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Convert API response from snake_case to camelCase
 * 將 API 響應從 snake_case 轉換為 camelCase
 */
function convertApiProjectToProject(apiProject: ApiProject): Project {
  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description,
    owner: apiProject.owner,
    collaborators: apiProject.collaborators || [],
    dataFiles: apiProject.data_files || [],
    charts: apiProject.charts || [],
    createdAt: apiProject.created_at,
    updatedAt: apiProject.updated_at,
  };
}

export interface DataFile {
  id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  row_count: number;
  column_count: number;
  columns: string[];
  status: string;
  uploaded_at: string;
  processed_at?: string;
}

export interface PreviewData {
  preview: any[];
  statistics: Record<string, any>;
  totalRows: number;
  columns: string[];
}

export const projectService = {
  /**
   * 獲取所有專案
   */
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
      throw new Error('獲取專案列表失敗');
    }
    const data = await response.json();
    const apiProjects: ApiProject[] = data.data;
    return apiProjects.map(convertApiProjectToProject);
  },

  /**
   * 獲取單個專案
   */
  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    if (!response.ok) {
      throw new Error('獲取專案失敗');
    }
    const data = await response.json();
    return convertApiProjectToProject(data.data);
  },

  /**
   * 創建新專案
   */
  async createProject(name: string, description: string, owner: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description, owner }),
    });
    if (!response.ok) {
      throw new Error('創建專案失敗');
    }
    const data = await response.json();
    return convertApiProjectToProject(data.data);
  },

  /**
   * 刪除專案
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('刪除專案失敗');
    }
  },

  /**
   * 獲取專案的數據文件
   */
  async getProjectDataFiles(projectId: string): Promise<DataFile[]> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/data-files`);
    if (!response.ok) {
      throw new Error('獲取數據文件失敗');
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * 獲取數據文件信息
   */
  async getDataFile(fileId: string): Promise<DataFile> {
    const response = await fetch(`${API_BASE_URL}/data-files/${fileId}`);
    if (!response.ok) {
      throw new Error('獲取文件信息失敗');
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * 預覽數據文件
   */
  async previewDataFile(fileId: string, limit = 50): Promise<PreviewData> {
    const response = await fetch(`${API_BASE_URL}/data-files/${fileId}/preview?limit=${limit}`);
    if (!response.ok) {
      throw new Error('預覽數據失敗');
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * 下載原始數據文件
   */
  async downloadDataFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/data-files/${fileId}/download`);
    if (!response.ok) {
      throw new Error('下載文件失敗');
    }
    return await response.blob();
  },

  /**
   * 下載處理後的JSON數據
   */
  async downloadProcessedData(fileId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/data-files/${fileId}/download/processed`);
    if (!response.ok) {
      throw new Error('下載處理後數據失敗');
    }
    return await response.blob();
  },

  /**
   * 輔助方法：觸發文件下載
   */
  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * 添加數據文件到專案
   */
  async addDataFilesToProject(projectId: string, fileIds: string[]): Promise<{ projectId: string; addedFiles: string[]; totalFiles: number }> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/data-files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileIds }),
    });
    if (!response.ok) {
      throw new Error('添加數據文件到專案失敗');
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * 保存分析配置到專案
   */
  async saveAnalysisConfig(projectId: string, config: {
    name: string;
    selectedMetrics?: string[];
    selectedCategoricalMetrics?: string[];
    selectedGroups?: string[];
    primarySort?: string | null;
    secondarySort?: string | null;
    columnTypeOverrides?: Record<string, 'numeric' | 'string'>;
    chartConfig?: any;
    cleaningRules?: any[];
    metadata?: any;
  }): Promise<{ configId: string; projectId: string; name: string }> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analysis-configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error('保存分析配置失敗');
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * 獲取專案的分析配置列表
   */
  async getAnalysisConfigs(projectId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analysis-configs`);
    if (!response.ok) {
      throw new Error('獲取分析配置列表失敗');
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * 更新分析配置
   */
  async updateAnalysisConfig(configId: string, updates: {
    name?: string;
    selectedMetrics?: string[];
    selectedCategoricalMetrics?: string[];
    selectedGroups?: string[];
    primarySort?: string | null;
    secondarySort?: string | null;
    columnTypeOverrides?: Record<string, 'numeric' | 'string'>;
    chartConfig?: any;
    cleaningRules?: any[];
    metadata?: any;
  }): Promise<{ configId: string }> {
    const response = await fetch(`${API_BASE_URL}/projects/analysis-configs/${configId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('更新分析配置失敗');
    }
    const data = await response.json();
    return data.data;
  },
};

export default projectService;
