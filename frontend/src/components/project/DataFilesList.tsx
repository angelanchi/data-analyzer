import React, { useState } from 'react';

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

interface DataFilesListProps {
  dataFiles: DataFile[];
  onPreview: (fileId: string) => void;
  onDownload: (fileId: string, fileName: string) => void;
  isLoading?: boolean;
}

export const DataFilesList: React.FC<DataFilesListProps> = ({
  dataFiles,
  onPreview,
  onDownload,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 過濾數據文件
  const filteredFiles = dataFiles.filter(file =>
    file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (dataFiles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-4 text-lg font-medium">沒有數據文件</p>
        <p className="mt-2 text-sm">此專案尚未添加任何數據文件</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索欄 */}
      <div className="relative">
        <input
          type="text"
          placeholder="搜索數據文件..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 文件統計 */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>共 {filteredFiles.length} 個文件</span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 hover:text-blue-800"
          >
            清除搜索
          </button>
        )}
      </div>

      {/* 文件列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
          >
            {/* 文件圖標和名稱 */}
            <div className="flex items-start mb-3">
              <div className="flex-shrink-0 mr-3">
                <svg
                  className="h-10 w-10 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate" title={file.original_name}>
                  {file.original_name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            {/* 文件統計信息 */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs text-gray-600">
                <span>數據行數:</span>
                <span className="font-medium">{file.row_count?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>列數:</span>
                <span className="font-medium">{file.column_count || 0}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>上傳時間:</span>
                <span className="font-medium">{formatDate(file.uploaded_at)}</span>
              </div>
            </div>

            {/* 狀態標籤 */}
            <div className="mb-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  file.status === 'processed'
                    ? 'bg-green-100 text-green-800'
                    : file.status === 'uploaded'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {file.status === 'processed' ? '已處理' : file.status === 'uploaded' ? '已上傳' : '錯誤'}
              </span>
            </div>

            {/* 操作按鈕 */}
            <div className="flex space-x-2">
              <button
                onClick={() => onPreview(file.id)}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-150"
              >
                預覽
              </button>
              <button
                onClick={() => onDownload(file.id, file.original_name)}
                className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors duration-150"
              >
                下載
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 無搜索結果 */}
      {filteredFiles.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          <p>未找到匹配的文件</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            清除搜索
          </button>
        </div>
      )}
    </div>
  );
};
