/**
 * AnalysisPage Component
 * 數據分析主頁面組件
 *
 * 這是整個應用的核心頁面，實現了完整的 5 步驟數據分析工作流：
 * 1. 上傳資料 (Data Upload)
 * 2. 設定清理 (Data Cleaning Configuration)
 * 3. 數據格式設置 (Data Format Configuration)
 * 4. 圖表配置與預覽 (Chart Configuration & Preview)
 * 5. 匯出結果 (Export Results)
 *
 * Key Features:
 * - Stepper-based UI for guided workflow (步驟式用戶界面)
 * - Real-time collaboration support (實時協作支持)
 * - Data transformation and visualization (數據轉換與可視化)
 * - Export to multiple formats (多格式匯出)
 *
 * State Management:
 * - Local state for data and configuration (本地狀態管理數據和配置)
 * - Context for user and collaboration (Context 管理用戶和協作)
 * - useMemo for performance optimization (useMemo 優化性能)
 *
 * @component
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {

  Box,

  Typography,

  Paper,

  Stepper,

  Step,

  StepLabel,

  Button,

  Alert,

  Stack,

} from '@mui/material';

import {

  ChartConfig,

  CleaningRule,

  DataPoint,

  BatchViewMetadata,

} from '../types';

import FileUpload from '../components/DataUpload/FileUpload';

import DataPreview from '../components/DataUpload/DataPreview';

import DataCleaningConfig from '../components/DataCleaning/DataCleaningConfig';

import ChartTypeSelector from '../components/Charts/ChartTypeSelector';

import ChartRenderer from '../components/Charts/ChartRenderer';

import ExportOptions from '../components/Export/ExportOptions';

import CollaborationPanel from '../components/collaboration/CollaborationPanel';

import DataViewSelector from '../components/DataAnalysis/DataViewSelector';

import DataParameterSelector from '../components/DataAnalysis/DataParameterSelector';

import DataViewPreview from '../components/DataAnalysis/DataViewPreview';

import { previewDataCleaning } from '../services/api';

import { useCollaboration } from '../contexts/CollaborationContext';

import { useUser } from '../contexts/UserContext';

import { createDataViews, applySorting } from '../utils/dataViews';

/** 5-step workflow labels - 5 步驟工作流標籤 */
const steps = ['上傳資料', '設定清理', '數據格式設置', '圖表配置與預覽', '匯出結果'];

/**
 * Extended DataPoint with Source_File field
 * 擴展的數據點類型，包含來源文件欄位
 */
type ExtendedDataPoint = DataPoint & { Source_File?: string };

/**
 * Uploaded file information
 * 上傳文件的資訊
 */
type UploadedFileInfo = {

  fileId: string;        // Backend file ID

  sourceName: string;    // Display name for the source

};

/**
 * Convert DataPoint array to generic Record array for data processing
 * 將 DataPoint 陣列轉換為通用 Record 陣列，用於數據處理
 */
const toRecordArray = (rows: ExtendedDataPoint[]): Array<Record<string, unknown>> =>

  rows.map((row) => ({ ...row }));

const AnalysisPage: React.FC = () => {
  // ===== 步驟控制狀態 (Stepper State) =====
  /** Current active step (0-4) - 當前活動步驟 (0-4) */
  const [activeStep, setActiveStep] = useState(0);

  // ===== 數據狀態 (Data State) =====
  /** Original uploaded data (raw, no cleaning applied) - 原始上傳數據（未清洗） */
  const [rawData, setRawData] = useState<ExtendedDataPoint[]>([]);

  /** Cleaned data (after applying cleaning rules) - 清洗後的數據 */
  const [cleanedData, setCleanedData] = useState<ExtendedDataPoint[]>([]);

  /** Chart configuration (type, axes, legend) - 圖表配置（類型、軸、圖例） */
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  /** Metadata about columns, aggregations, sources - 關於欄位、聚合、來源的元數據 */
  const [metadata, setMetadata] = useState<BatchViewMetadata | null>(null);

  /** Flattened data (all records, used for charts) - 扁平化數據（所有記錄，用於圖表渲染） */
  const [flattenedData, setFlattenedData] = useState<Array<Record<string, unknown>>>([]);

  /** Grouped statistics data (aggregated records, used for export only) - 分組統計數據（聚合記錄，僅用於匯出） */
  const [groupedData, setGroupedData] = useState<Array<Record<string, unknown>>>([]);

  // ===== 數據格式配置狀態 (Data Format Configuration State) =====
  /** Selected numeric metrics - 選定的數值指標 */
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  /** Selected categorical metrics (string columns to output) - 選定的分類指標（要輸出的字串欄位） */
  const [selectedCategoricalMetrics, setSelectedCategoricalMetrics] = useState<string[]>([]);

  /** Selected group fields for aggregation - 選定的分組欄位 */
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  /** Primary sort field - 主要排序欄位 */
  const [primarySort, setPrimarySort] = useState<string | null>(null);

  /** Secondary sort field - 次要排序欄位 */
  const [secondarySort, setSecondarySort] = useState<string | null>(null);

  // ===== 文件與配置狀態 (File & Configuration State) =====
  /** List of uploaded files with their IDs and names - 已上傳文件列表及其 ID 和名稱 */
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);

  /** Error message to display - 要顯示的錯誤消息 */
  const [error, setError] = useState<string>('');

  /** User-specified column type overrides - 用戶指定的欄位類型覆寫 */
  const [columnTypeOverrides, setColumnTypeOverrides] = useState<Record<string, 'numeric' | 'string'>>({});

  /** Data cleaning rules configuration - 數據清洗規則配置 */
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([]);

  /** Reference to chart component for programmatic access - 圖表組件的引用，用於程式化訪問 */
  const chartRef = useRef<any>(null);

  // ===== 協作狀態 (Collaboration State) =====
  const { currentUser, users } = useUser();

  const { connectToProject, sendChartChange, leaveProject } = useCollaboration();

  /** Collaboration panel visibility - 協作面板可見性 */
  const [collaborationPanelOpen, setCollaborationPanelOpen] = useState(false);

  /** Project ID for collaboration - 協作項目 ID */
  const [projectId] = useState('demo-project-1');



  /**
   * Effect: Initialize collaboration connection
   * 效果：初始化協作連接
   *
   * Connects to the collaboration project when user is available.
   * Cleans up connection on component unmount.
   */
  useEffect(() => {

    if (currentUser) {

      connectToProject(projectId, currentUser.id).catch(console.error);

    }

    // 清理函數：組件卸載時斷開連接
    return () => {
      leaveProject();
    };
  }, [currentUser, projectId]); // 移除 connectToProject 和 leaveProject 依賴以避免不必要的重連

  /**
   * Computed: Effective data for analysis
   * 計算屬性：用於分析的有效數據
   *
   * Returns cleaned data if available, otherwise raw data.
   * This is the source of truth for all downstream data processing.
   */
  const effectiveData = useMemo<ExtendedDataPoint[]>(() => {

    return cleanedData.length > 0 ? cleanedData : rawData;

  }, [cleanedData, rawData]);



  useEffect(() => {
    if (effectiveData.length === 0) {
      setFlattenedData([]);
      setGroupedData([]);
      setMetadata(null);
      return;
    }

    const genericRows = toRecordArray(effectiveData);
    const { flattenedData: flat, groupedData: grouped, metadata: meta } = createDataViews(genericRows, {
      flattenParams: selectedMetrics.length ? selectedMetrics : undefined,
      groupParams: selectedGroups.length ? selectedGroups : undefined,
      categoricalMetrics: selectedCategoricalMetrics,
      columnTypeOverrides: columnTypeOverrides, // 傳遞欄位類型覆寫
      primarySort: primarySort,       // 傳遞主要排序欄位
      secondarySort: secondarySort,   // 傳遞次要排序欄位
    });

    setFlattenedData(flat);
    setGroupedData(grouped);
    setMetadata(meta);

    if (chartConfig && flat.length > 0) {
      const columns = Object.keys(flat[0]);
      const isXAxisValid = columns.includes(chartConfig.xAxis);
      const yAxes = Array.isArray(chartConfig.yAxis) ? chartConfig.yAxis : [chartConfig.yAxis];
      const areYAxesValid = yAxes.every((axis) => columns.includes(axis));

      if (!isXAxisValid || !areYAxesValid) {
        setChartConfig(null);
      }
    }
  }, [effectiveData, selectedMetrics, selectedCategoricalMetrics, selectedGroups, chartConfig, columnTypeOverrides]);



  useEffect(() => {

    if (!metadata) return;



    // 使用原始欄位列表（只包含上傳資料中的欄位，排除系統生成的欄位）
    const availableMetrics = metadata.columnTypes?.originalNumeric ?? metadata.columnTypes?.numeric ?? [];

    const availableGroups = metadata.columnTypes?.originalCategorical ?? metadata.columnTypes?.categorical ?? [];



    // 不自動選擇數值指標，僅過濾無效的指標
    if (selectedMetrics.length > 0) {

      const filteredMetrics = selectedMetrics.filter((metric) => availableMetrics.includes(metric));

      if (filteredMetrics.length !== selectedMetrics.length) {

        setSelectedMetrics(filteredMetrics);

      }

    }

    // 自動添加 Source_File 到字串指標（如果存在且尚未選擇）
    const allCategorical = metadata.columnTypes?.categorical ?? [];
    if (allCategorical.includes('Source_File') &&
        !selectedCategoricalMetrics.includes('Source_File')) {
      setSelectedCategoricalMetrics((prev) => [...prev, 'Source_File']);
      return; // 提前返回，避免在同一次渲染中多次更新
    }

    // 過濾無效的字串指標
    if (selectedCategoricalMetrics.length > 0) {

      const filteredCategoricalMetrics = selectedCategoricalMetrics.filter((catMetric) => availableGroups.includes(catMetric));

      if (filteredCategoricalMetrics.length !== selectedCategoricalMetrics.length) {

        setSelectedCategoricalMetrics(filteredCategoricalMetrics);

      }

    }



    // Only filter out invalid groups if any are selected
    // Do NOT auto-initialize groups - let user choose when to group
    if (selectedGroups.length > 0) {

      const filteredGroups = selectedGroups.filter((group) => availableGroups.includes(group));

      if (filteredGroups.length !== selectedGroups.length) {

        setSelectedGroups(filteredGroups);

      }

    }

  }, [metadata, selectedMetrics, selectedCategoricalMetrics, selectedGroups]);





  const activeChartData = useMemo<Array<Record<string, unknown>>>(() => {

    // 圖表總是使用 flattenedData（保留完整資料細節）
    // flattenedData 已在 createDataViews 中應用排序，無需重複排序
    const baseData = flattenedData.length > 0
      ? flattenedData
      : cleanedData.length > 0
        ? toRecordArray(cleanedData)
        : toRecordArray(rawData);

    return baseData;

  }, [flattenedData, cleanedData, rawData]);



  const applySourceToRows = (rows: DataPoint[], sourceName: string): ExtendedDataPoint[] =>

    rows.map((row) => {

      const originalPoint = row.Point_ID || (row as any).PointId || (row as any).point_id;

      // 只有原始資料有 Point_ID 時才添加，否則不生成
      if (originalPoint) {
        return {

          ...row,

          Point_ID: String(originalPoint),

          Source_File: sourceName,

        };
      } else {
        return {

          ...row,

          Source_File: sourceName,

        };
      }

    });

  const handleResetData = useCallback(() => {
    setUploadedFiles([]);
    setRawData([]);
    setCleanedData([]);
    setFlattenedData([]);
    setGroupedData([]);
    setMetadata(null);
    setSelectedMetrics([]);
    setSelectedCategoricalMetrics([]);
    setSelectedGroups([]);
    setPrimarySort(null);
    setSecondarySort(null);
    setChartConfig(null);
    setColumnTypeOverrides({});
    setCleaningRules([]);
    setError('');
    chartRef.current = null;
    setActiveStep(0);
  }, []);

  const handleUploadComplete = (fileId: string, rows: DataPoint[], originalName: string) => {
    console.log('[AnalysisPage] File uploaded:', { fileId, originalName, rowCount: rows.length });

    const sourceName = originalName.replace(/\.[^/.]+$/, '');

    const annotatedRows = applySourceToRows(rows, sourceName);



    setUploadedFiles((prev) => {
      const updated = [...prev, { fileId, sourceName }];
      console.log('[AnalysisPage] Updated uploadedFiles:', updated);
      return updated;
    });

    setRawData((prev) => [...prev, ...annotatedRows]);

    setCleanedData([]);

    setChartConfig(null);

    setError('');

  };



  const handleUploadError = (message: string) => {

    setError(message);

  };



  const handleCleaningRulesChange = useCallback((rules: CleaningRule[]) => {
    setCleaningRules(rules);
  }, []);



  const handlePreviewCleaning = async (rules: CleaningRule[]) => {

    try {

      const response = await previewDataCleaning(toRecordArray(rawData), rules);

      if (response.success && response.data) {

        const cleanedRows = Array.isArray(response.data.cleanedData)

          ? (response.data.cleanedData as DataPoint[])

          : [];



        const annotated = cleanedRows.map((row, index) => {

          const sourceName =

            (row as any).Source_File ||

            (row as any).Batch_No ||

            uploadedFiles[index % Math.max(uploadedFiles.length, 1)]?.sourceName ||

            'Batch';



          const pointId = row.Point_ID || (row as any).PointId || (row as any).point_id;



          // 只有原始資料有 Point_ID 時才添加
          const result: ExtendedDataPoint = {

            ...row,

            Source_File: sourceName,

          } as ExtendedDataPoint;


          if (pointId) {
            result.Point_ID = String(pointId);
          }

          return result;

        });



        setCleanedData(annotated);

        // 返回完整的預覽數據，包括移除的行信息
        return {
          cleanedData: annotated,
          statistics: response.data,
          removedRows: response.data.removedRows || [],
          originalCount: response.data.originalCount,
          cleanedCount: response.data.cleanedCount,
          removedCount: response.data.removedCount,
          retentionRate: response.data.retentionRate
        };

      }



      throw new Error(response.error || 'Preview failed');

    } catch (previewError) {

      console.error('Preview cleaning failed:', previewError);

      throw previewError;

    }

  };



  const handleChartSelect = (config: ChartConfig) => {

    const previousConfig = chartConfig;

    setChartConfig(config);

    setError('');



    if (currentUser) {

      sendChartChange({

        projectId,

        chartId: 'main-chart',

        oldConfig: previousConfig,

        newConfig: config,

      });

    }

  };



  const canProceedToNext = () => {

    switch (activeStep) {

    case 0:

      return rawData.length > 0;

    case 1:

      return true;

    case 2:

      return true; // 數據格式設置是可選的，可以直接進入下一步

    case 3:

      // 圖表配置步驟是可選的，無論是否配置圖表都可以進入下一步
      return true;

    default:

      return true;

    }

  };



  const handleNext = () => setActiveStep((step) => step + 1);

  const handleBack = () => setActiveStep((step) => step - 1);



  const renderStepContent = (step: number) => {

    switch (step) {

    case 0:

      return (

        <Box sx={{ p: 3 }}>

          <Typography variant="h6" gutterBottom>

              批次資料上傳

          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>

              支援上傳 CSV 或 Excel 檔案，系統會自動抽樣以供預覽與清理設定。

          </Typography>

          <FileUpload onUploadComplete={handleUploadComplete} onError={handleUploadError} />

          {(rawData.length > 0 || uploadedFiles.length > 0) && (
            <Box sx={{ mt: 2, display: 'inline-flex' }}>
              <Button variant="outlined" color="secondary" onClick={handleResetData}>
                  清除已上傳資料
              </Button>
            </Box>
          )}

          {error && (


            <Alert severity="error" sx={{ mt: 2 }}>

              {error}

            </Alert>

          )}

          {rawData.length > 0 && (

            <Box sx={{ mt: 3 }}>

              <DataPreview
                data={rawData}
                title="原始資料預覽"
                onColumnTypesChange={setColumnTypeOverrides}
              />

            </Box>

          )}

        </Box>

      );

    case 1:

      return (

        <Box sx={{ p: 3 }}>

          <Typography variant="h6" gutterBottom>

              設定清理規則

          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>

              在建立圖表前預覽清理後的結果，確認符合預期。

          </Typography>

          {rawData.length === 0 ? (

            <Alert severity="info">請先上傳資料再設定清理規則。</Alert>

          ) : (

            <DataCleaningConfig

              data={rawData}

              onRulesChange={handleCleaningRulesChange}

              onPreviewCleaning={handlePreviewCleaning}

            />

          )}

        </Box>

      );

    case 2:

      return (

        <Box sx={{ p: 3 }}>

          <Typography variant="h6" gutterBottom>

              數據格式設置

          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>

              選擇數值指標、字串指標、分組欄位與排序方式，這些設定會影響資料輸出格式與圖表配置選項。

          </Typography>



          <DataParameterSelector

            numericColumns={metadata?.columnTypes.numeric ?? []}

            categoricalColumns={metadata?.columnTypes.categorical ?? []}

            selectedMetrics={selectedMetrics}

            onMetricsChange={setSelectedMetrics}

            selectedCategoricalMetrics={selectedCategoricalMetrics}

            onCategoricalMetricsChange={setSelectedCategoricalMetrics}

            selectedGroups={selectedGroups}

            onGroupsChange={setSelectedGroups}

            groupedRowCount={groupedData.length}

            primarySort={primarySort}

            secondarySort={secondarySort}

            onPrimarySortChange={setPrimarySort}

            onSecondarySortChange={setSecondarySort}

          />

          <DataViewPreview
            data={activeChartData}
            selectedMetrics={selectedMetrics}
            selectedGroups={selectedGroups}
            primarySort={primarySort}
            secondarySort={secondarySort}
          />

          <DataViewSelector
            flattenedData={flattenedData}
            metadata={metadata}
          />

        </Box>

      );

    case 3:

      return (

        <Box sx={{ p: 3 }}>

          <Typography variant="h6" gutterBottom>

              圖表配置與預覽

          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>

              圖表使用逐筆資料繪製，可透過圖例分組（來自字串指標）以不同顏色區分類別。分組欄位僅影響匯出時的彙總統計。

          </Typography>



          {activeChartData.length > 0 ? (

            <>

              <ChartTypeSelector
                data={activeChartData}
                onSelectChart={handleChartSelect}
                metadata={metadata}
                dataViewMode="flattened"
                selectedCategoricalMetrics={selectedCategoricalMetrics}
              />



              {chartConfig && (

                <Box sx={{ mt: 3 }}>

                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>

                      圖表預覽

                  </Typography>

                  <ChartRenderer ref={chartRef} data={activeChartData} config={chartConfig} width={800} height={500} />

                </Box>

              )}

            </>

          ) : (

            <Alert severity="info">目前沒有可用資料，請先完成前面的步驟。</Alert>

          )}

        </Box>

      );

    case 4:

      return (

        <Box sx={{ p: 3 }}>

          <Stack spacing={3}>

            <ExportOptions
              rawData={toRecordArray(rawData)}
              cleanedData={toRecordArray(cleanedData)}
              flattenedData={flattenedData}
              groupedData={groupedData}
              chartConfig={chartConfig || undefined}
              chartRef={chartRef}
              metadata={metadata}
              selectedGroups={selectedGroups}
              primarySort={primarySort}
              secondarySort={secondarySort}
              fileIds={uploadedFiles.map(file => file.fileId)}
              selectedMetrics={selectedMetrics}
              selectedCategoricalMetrics={selectedCategoricalMetrics}
              columnTypeOverrides={columnTypeOverrides}
              cleaningRules={cleaningRules}
              currentUserId={currentUser?.id || 'user1'}
            />

          </Stack>

        </Box>

      );

    default:

      return <Typography>未知步驟</Typography>;

    }

  };



  return (

    <Box>

      <Typography variant="h4" component="h1" gutterBottom>

        批次分析

      </Typography>



      <Paper sx={{ p: 3, mb: 3 }}>

        <Stepper activeStep={activeStep} alternativeLabel>

          {steps.map((label) => (

            <Step key={label}>

              <StepLabel>{label}</StepLabel>

            </Step>

          ))}

        </Stepper>

      </Paper>



      <Paper>

        {renderStepContent(activeStep)}



        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 3 }}>

          <Button disabled={activeStep === 0} onClick={handleBack}>

            上一步

          </Button>

          <Button

            variant="contained"

            onClick={handleNext}

            disabled={activeStep === steps.length - 1 || !canProceedToNext()}

          >

            {activeStep === steps.length - 1 ? '完成' : '下一步'}

          </Button>

        </Box>

      </Paper>



      {currentUser && (

        <CollaborationPanel

          projectId={projectId}

          currentUserId={currentUser.id}

          users={users}

          collapsed={!collaborationPanelOpen}

          onToggle={() => setCollaborationPanelOpen((open) => !open)}

        />

      )}

    </Box>

  );

};



export default AnalysisPage;

