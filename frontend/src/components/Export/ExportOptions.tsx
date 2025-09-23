import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Snackbar,
} from '@mui/material';
import {
  GetApp,
  TableChart,
  Description,
  Image,
  CloudUpload,
} from '@mui/icons-material';
import { ChartConfig, ExportOptions as ExportOptionsState, BatchViewMetadata } from '../../types';
import { exportData, API_ORIGIN } from 'services/api';
import { exportChart } from 'utils/chartExport';
import SaveToProjectDialog from '../project/SaveToProjectDialog';

type GenericRecord = Record<string, unknown>;

interface ExportOptionsProps {
  rawData: GenericRecord[];
  cleanedData?: GenericRecord[];
  flattenedData?: GenericRecord[];
  groupedData?: GenericRecord[];
  chartConfig?: ChartConfig;
  chartRef?: React.RefObject<any>;
  metadata?: BatchViewMetadata | null;
  selectedGroups?: string[];
  primarySort?: string | null;
  secondarySort?: string | null;
  // 用於保存到專案的額外數據
  fileIds?: string[];
  selectedMetrics?: string[];
  selectedCategoricalMetrics?: string[];
  columnTypeOverrides?: Record<string, 'numeric' | 'string'>;
  cleaningRules?: any[];
  currentUserId?: string;
}

type ExportDialogState = {
  open: boolean;
  type: 'data' | 'chart';
  format: string;
};

type ExportOptionCard = {
  format: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const ExportOptions: React.FC<ExportOptionsProps> = ({
  rawData,
  cleanedData,
  flattenedData,
  groupedData,
  chartConfig,
  chartRef,
  metadata,
  selectedGroups = [],
  primarySort = null,
  secondarySort = null,
  fileIds = [],
  selectedMetrics = [],
  selectedCategoricalMetrics = [],
  columnTypeOverrides = {},
  cleaningRules = [],
  currentUserId = 'user1', // Default user ID
}) => {
  const navigate = useNavigate();

  const [exportDialog, setExportDialog] = useState<ExportDialogState>({
    open: false,
    type: 'data',
    format: '',
  });

  const [saveToProjectOpen, setSaveToProjectOpen] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<{open: boolean; message: string; projectId?: string}>({
    open: false,
    message: '',
    projectId: undefined
  });

  const [exportOptionsState, setExportOptionsState] = useState<ExportOptionsState>({
    format: 'csv',
    filename: '',
    includeFilters: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');

  const dataExportOptions: ExportOptionCard[] = [
    {
      format: 'xlsx',
      title: 'Excel 活頁簿',
      description: '多工作表結構，包含資料總覽、逐筆數據與分組彙總。',
      icon: <Description sx={{ fontSize: 40 }} />,
      color: '#2E7D32',
    },
    {
      format: 'csv',
      title: 'CSV 檔案',
      description: '相容於 Excel、Minitab、MATLAB 與多數商業智慧工具。',
      icon: <TableChart sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
    },
  ];

  const chartExportOptions: ExportOptionCard[] = [
    {
      format: 'png',
      title: 'PNG 圖檔',
      description: '高解析度點陣圖，適合簡報與文件。',
      icon: <Image sx={{ fontSize: 40 }} />,
      color: '#FF9800',
    },
    {
      format: 'svg',
      title: 'SVG 向量圖',
      description: '可縮放的向量圖（僅支援 Plotly 圖表）。',
      icon: <Image sx={{ fontSize: 40 }} />,
      color: '#FF5722',
    },
  ];

  const hasAnyData = (flattenedData && flattenedData.length > 0) ||
                     (cleanedData && cleanedData.length > 0) ||
                     (rawData && rawData.length > 0);
  const hasChart = Boolean(chartConfig);

  const buildDefaultFilename = (type: 'data' | 'chart', format: string): string => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 12);
    if (type === 'data') {
      return `analysis_data_${timestamp}`;
    }
    return `chart_${format}_${timestamp}`;
  };

  const openDialog = (type: 'data' | 'chart', format: string) => {
    setExportDialog({ open: true, type, format });
    setExportOptionsState((prev) => ({
      ...prev,
      format,
      filename: buildDefaultFilename(type, format),
    }));
    setExportError('');
  };

  const closeDialog = () => {
    setExportDialog({ open: false, type: 'data', format: '' });
  };

  const handleExportConfirm = async () => {
    setIsExporting(true);
    setExportError('');

    try {
      if (exportDialog.type === 'data') {
        // 總是匯出完整的數據結構（Data Overview + 逐筆數據 + 分組數據）
        if (!flattenedData || flattenedData.length === 0) {
          throw new Error('沒有可匯出的數據。');
        }

        const response = await exportData(
          flattenedData as any[],  // 主要數據（逐筆數據）
          exportOptionsState.format as 'csv' | 'xlsx',
          {
            filename: exportOptionsState.filename,
            metadata: metadata || undefined,
            flattenedData: flattenedData || undefined,
            groupedData: (selectedGroups.length > 0 && groupedData) ? groupedData : undefined,
            primarySort: primarySort || undefined,
            secondarySort: secondarySort || undefined,
          }
        );
        if (!response.success || !response.data) {
          throw new Error(response.error || '資料匯出失敗');
        }
        {
          const downloadUrl = response.data.downloadUrl;
          const absoluteUrl = downloadUrl.startsWith('http') ? downloadUrl : `${API_ORIGIN}${downloadUrl}`;
          window.open(absoluteUrl, '_blank');
        }
      } else {
        // Chart export - handle directly in frontend
        console.log('[Chart Export] Starting chart export process...');

        if (!chartConfig) {
          console.error('[Chart Export] No chart config available');
          throw new Error('沒有可匯出的圖表配置。');
        }

        console.log('[Chart Export] Chart config:', {
          type: chartConfig.type,
          hasConfig: !!chartConfig,
        });

        if (!chartRef?.current) {
          console.error('[Chart Export] Chart ref is null');
          throw new Error('圖表尚未完全載入，請稍後再試。');
        }

        console.log('[Chart Export] Chart ref details:', {
          refExists: !!chartRef.current,
          tagName: chartRef.current.tagName,
          childElementCount: chartRef.current.childElementCount,
          hasCanvas: !!chartRef.current.querySelector('canvas'),
          hasPlotly: !!chartRef.current.querySelector('.js-plotly-plot'),
        });

        // 等待 500ms 確保圖表完全渲染
        console.log('[Chart Export] Waiting 500ms for chart to render...');
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('[Chart Export] Calling exportChart utility...');
        // Use frontend chart export utility
        await exportChart(chartRef.current, {
          filename: exportOptionsState.filename || 'chart',
          format: exportDialog.format as 'png' | 'svg',
          scale: 2,
          backgroundColor: '#ffffff',
        });

        console.log('[Chart Export] Chart export completed successfully');
      }

      closeDialog();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '匯出失敗，發生未知錯誤。');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToProject = async (projectId: string, configName: string) => {
    setSaveSuccess({
      open: true,
      message: `成功保存到專案！配置名稱：${configName}`,
      projectId: projectId
    });
  };

  const handleViewProject = () => {
    if (saveSuccess.projectId) {
      navigate(`/projects/${saveSuccess.projectId}`);
      setSaveSuccess({ open: false, message: '', projectId: undefined });
    }
  };

  const renderCards = (options: ExportOptionCard[], type: 'data' | 'chart', enabled: boolean) => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {options.map((option) => (
        <Grid item xs={12} md={4} key={option.format}>
          <Card
            sx={{
              height: '100%',
              opacity: enabled ? 1 : 0.5,
              borderTop: `4px solid ${option.color}`,
            }}
          >
            <CardActionArea disabled={!enabled} onClick={() => openDialog(type, option.format)} sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  {option.icon}
                  <Typography variant="h6">{option.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {option.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        匯出選項
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        將目前的資料集或圖表匯出，以便在 Excel、Minitab、MATLAB 等分析工具中重複使用。
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <TableChart sx={{ mr: 1, verticalAlign: 'middle' }} /> 資料匯出
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          匯出內容包含：資料總覽、逐筆數據（依選定參數），以及分組彙總數據（若有設定分組欄位）。
        </Typography>

        {renderCards(dataExportOptions, 'data', hasAnyData)}

        {!hasAnyData && (
          <Alert severity="info" sx={{ mt: 2 }}>
            目前沒有可用資料集，請先上傳並整理資料。
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <Image sx={{ mr: 1, verticalAlign: 'middle' }} /> 圖表匯出
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          將目前的圖表存成 PNG、SVG 或 PDF。
        </Typography>

        {renderCards(chartExportOptions, 'chart', hasChart)}

        {!hasChart && (
          <Alert severity="info" sx={{ mt: 2 }}>
            尚未建立圖表，請先生成圖表。
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} /> 保存到協作專案
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          將當前的分析內容（包含數據文件、分析配置、圖表配置、清理規則）保存到協作專案中，方便團隊成員查看和重現分析結果。
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudUpload />}
          onClick={() => setSaveToProjectOpen(true)}
          disabled={!fileIds || fileIds.length === 0}
          sx={{ mt: 1 }}
        >
          保存到專案
        </Button>

        {(!fileIds || fileIds.length === 0) && (
          <Alert severity="info" sx={{ mt: 2 }}>
            沒有可保存的數據文件。請先上傳數據文件。
          </Alert>
        )}
      </Paper>

      <SaveToProjectDialog
        open={saveToProjectOpen}
        onClose={() => setSaveToProjectOpen(false)}
        onSave={handleSaveToProject}
        analysisData={{
          fileIds,
          selectedMetrics,
          selectedCategoricalMetrics,
          selectedGroups,
          primarySort,
          secondarySort,
          columnTypeOverrides,
          chartConfig: chartConfig || null,
          cleaningRules,
          metadata: metadata || null
        }}
        currentUserId={currentUserId}
      />

      <Snackbar
        open={saveSuccess.open}
        autoHideDuration={6000}
        onClose={() => setSaveSuccess({ open: false, message: '', projectId: undefined })}
        message={saveSuccess.message}
        action={
          saveSuccess.projectId && (
            <Button color="secondary" size="small" onClick={handleViewProject}>
              查看專案
            </Button>
          )
        }
      />

      <Dialog open={exportDialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{`匯出設定 - ${exportDialog.format.toUpperCase()}`}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="檔案名稱"
              value={exportOptionsState.filename}
              onChange={(event) =>
                setExportOptionsState((prev) => ({ ...prev, filename: event.target.value }))
              }
              sx={{ mb: 3 }}
              helperText={`輸出檔案：${exportOptionsState.filename}.${exportDialog.format}`}
            />

            {exportError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {exportError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>取消</Button>
          <Button
            onClick={handleExportConfirm}
            variant="contained"
            disabled={isExporting || !exportOptionsState.filename.trim()}
            startIcon={isExporting ? <CircularProgress size={16} /> : <GetApp />}
          >
            {isExporting ? '匯出中…' : '開始匯出'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExportOptions;
