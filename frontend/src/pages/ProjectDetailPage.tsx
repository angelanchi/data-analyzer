import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataFilesList, DataFile } from '../components/project/DataFilesList';
import { DataPreviewDialog } from '../components/project/DataPreviewDialog';

interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  collaborators: string[];
  data_files: string[];
  charts: any[];
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'charts' | 'analyzers'>('data');

  // 預覽對話框狀態
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string>('');
  const [previewFileName, setPreviewFileName] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 加載專案信息
      const projectRes = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!projectRes.ok) throw new Error('加載專案失敗');
      const projectData = await projectRes.json();
      setProject(projectData.data);

      // 加載專案的數據文件
      const filesRes = await fetch(`http://localhost:3001/api/projects/${projectId}/data-files`);
      if (!filesRes.ok) throw new Error('加載數據文件失敗');
      const filesData = await filesRes.json();
      setDataFiles(filesData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加載失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (fileId: string) => {
    const file = dataFiles.find(f => f.id === fileId);
    if (file) {
      setPreviewFileId(fileId);
      setPreviewFileName(file.original_name);
      setPreviewDialogOpen(true);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/data-files/${fileId}/download`);
      if (!response.ok) throw new Error('下載失敗');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : '下載失敗');
    }
  };

  const fetchPreviewData = async (fileId: string) => {
    const response = await fetch(`http://localhost:3001/api/data-files/${fileId}/preview`);
    if (!response.ok) throw new Error('獲取預覽失敗');
    const data = await response.json();
    return data.data;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-600 text-xl mb-4">{error || '專案不存在'}</div>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回專案列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁首 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/projects')}
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {project.status === 'active' ? '進行中' : project.status}
              </span>
            </div>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="ml-4">
                  <p className="text-sm text-blue-600 font-medium">數據文件</p>
                  <p className="text-2xl font-bold text-blue-900">{dataFiles.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="ml-4">
                  <p className="text-sm text-green-600 font-medium">圖表</p>
                  <p className="text-2xl font-bold text-green-900">{project.charts.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div className="ml-4">
                  <p className="text-sm text-purple-600 font-medium">協作者</p>
                  <p className="text-2xl font-bold text-purple-900">{project.collaborators.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="ml-4">
                  <p className="text-sm text-orange-600 font-medium">標籤</p>
                  <p className="text-2xl font-bold text-orange-900">{project.tags.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 標籤頁導航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概覽
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              數據文件 ({dataFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'charts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              圖表 ({project.charts.length})
            </button>
            <button
              onClick={() => setActiveTab('analyzers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analyzers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              分析器配置
            </button>
          </nav>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">專案信息</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">專案名稱</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">描述</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.description || '無描述'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">創建時間</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(project.created_at).toLocaleString('zh-TW')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">最後更新</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(project.updated_at).toLocaleString('zh-TW')}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="bg-white rounded-lg shadow p-6">
            <DataFilesList
              dataFiles={dataFiles}
              onPreview={handlePreview}
              onDownload={handleDownload}
              isLoading={false}
            />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">圖表配置功能開發中...</p>
          </div>
        )}

        {activeTab === 'analyzers' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">分析器配置功能開發中...</p>
          </div>
        )}
      </div>

      {/* 數據預覽對話框 */}
      <DataPreviewDialog
        isOpen={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        fileId={previewFileId}
        fileName={previewFileName}
        onFetchPreview={fetchPreviewData}
      />
    </div>
  );
};
