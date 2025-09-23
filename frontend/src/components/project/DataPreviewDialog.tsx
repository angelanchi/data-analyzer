import React, { useEffect, useState } from 'react';

interface DataPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  onFetchPreview: (fileId: string) => Promise<PreviewData>;
}

interface PreviewData {
  preview: any[];
  statistics: Record<string, any>;
  totalRows: number;
  columns: string[];
}

export const DataPreviewDialog: React.FC<DataPreviewDialogProps> = ({
  isOpen,
  onClose,
  fileId,
  fileName,
  onFetchPreview
}) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'statistics'>('data');

  useEffect(() => {
    if (isOpen && fileId) {
      loadPreview();
    }
  }, [isOpen, fileId]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await onFetchPreview(fileId);
      setPreviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加載預覽失敗');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 對話框 */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* 標題欄 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">數據預覽</h2>
              <p className="text-sm text-gray-500 mt-1">{fileName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 標籤頁導航 */}
          <div className="flex border-b border-gray-200 px-6">
            <button
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('data')}
            >
              數據表格
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statistics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('statistics')}
            >
              統計信息
            </button>
          </div>

          {/* 內容區域 */}
          <div className="flex-1 overflow-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <p className="font-medium">加載失敗</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={loadPreview}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  重試
                </button>
              </div>
            )}

            {!isLoading && !error && previewData && (
              <>
                {activeTab === 'data' && (
                  <div>
                    <div className="mb-4 text-sm text-gray-600">
                      顯示前 {previewData.preview.length} 行（共 {previewData.totalRows.toLocaleString()} 行）
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            {previewData.columns.map((col) => (
                              <th
                                key={col}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.preview.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                {rowIndex + 1}
                              </td>
                              {previewData.columns.map((col) => (
                                <td
                                  key={col}
                                  className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                                >
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'statistics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">總行數</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {previewData.totalRows.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">總列數</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {previewData.columns.length}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">列統計</h3>
                      <div className="space-y-4">
                        {previewData.columns.map((col) => {
                          const stats = previewData.statistics[col];
                          if (!stats) return null;

                          return (
                            <div
                              key={col}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                              <h4 className="font-medium text-gray-900 mb-3">{col}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">類型:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {stats.type === 'numeric' ? '數值' : '文字'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">數據量:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {stats.count?.toLocaleString() || 0}
                                  </span>
                                </div>
                                {stats.type === 'numeric' && (
                                  <>
                                    <div>
                                      <span className="text-gray-500">最小值:</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {stats.min}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">最大值:</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {stats.max}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">平均值:</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {stats.avg}
                                      </span>
                                    </div>
                                  </>
                                )}
                                {stats.type === 'string' && (
                                  <div>
                                    <span className="text-gray-500">唯一值:</span>
                                    <span className="ml-2 font-medium text-gray-900">
                                      {stats.uniqueCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部操作欄 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
