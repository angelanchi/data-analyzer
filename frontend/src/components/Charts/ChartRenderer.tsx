import React, { useEffect } from 'react';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import { ChartConfig } from '../../types';
import BasicCharts from './BasicCharts';
import AdvancedCharts from './AdvancedCharts';
import { checkPlotlyConflicts, cleanupChartMemory } from '../../utils/chartSafetyCheck';

/**
 * ChartRenderer Component
 * 圖表渲染調度器
 *
 * ## 功能說明 (Features)
 * ChartRenderer 是圖表渲染的中央調度組件，根據圖表類型將渲染任務分發給相應的圖表引擎。
 * - 支援雙圖表引擎：Chart.js (基礎圖表) 和 Plotly.js (進階圖表)
 * - 自動檢測並處理圖表引擎衝突
 * - 提供完整的錯誤處理和驗證
 * - 內存管理和自動清理機制
 *
 * ## 圖表引擎分配 (Chart Engine Assignment)
 *
 * ### BasicCharts (Chart.js)
 * - **bar**: 柱狀圖
 * - 特性：輕量、快速、適合簡單的統計圖表
 * - 使用場景：分組統計、數據對比
 *
 * ### AdvancedCharts (Plotly.js)
 * - **scatter**: 散點圖
 * - 特性：強大的交互功能、3D 支持、適合復雜數據可視化
 * - 使用場景：相關性分析、數據分佈探索
 *
 * ## 驗證流程 (Validation Flow)
 * 1. **Loading State** - 顯示加載動畫
 * 2. **Error State** - 顯示錯誤訊息
 * 3. **Empty Data** - 檢查數據是否為空
 * 4. **Field Validation** - 驗證配置中引用的欄位是否存在
 *    - 檢查 xAxis, yAxis, groupBy 欄位
 *    - 如果缺少欄位，顯示具體的缺失欄位名稱
 * 5. **Chart Dispatch** - 根據圖表類型分發到對應的渲染組件
 * 6. **Unsupported Type** - 顯示不支援的圖表類型警告
 *
 * ## 內存管理 (Memory Management)
 * - **衝突檢測**: 組件掛載時檢測 Plotly 與瀏覽器擴展的衝突
 * - **定期清理**: 配置變更後 30 秒自動清理圖表內存
 * - **卸載清理**: 組件卸載時清理所有圖表資源
 *
 * ## 使用注意事項 (Important Notes)
 * - 使用 React.forwardRef 支持 ref 轉發，用於圖表導出功能
 * - 數據必須是 Record<string, unknown>[] 格式
 * - config.xAxis 和 config.yAxis 必須對應數據中的實際欄位名稱
 * - 如遇到 Plotly 渲染問題，檢查瀏覽器擴展衝突（參見 chartSafetyCheck）
 *
 * @component
 * @example
 * ```tsx
 * // 基本使用 - 柱狀圖
 * <ChartRenderer
 *   data={flattenedData}
 *   config={{
 *     type: 'bar',
 *     xAxis: 'Batch_No',
 *     yAxis: ['Voltage_stat_mean', 'Current_stat_mean'],
 *     title: '各批次平均電壓和電流'
 *   }}
 *   width={800}
 *   height={400}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // 進階使用 - 散點圖
 * <ChartRenderer
 *   data={flattenedData}
 *   config={{
 *     type: 'scatter',
 *     xAxis: 'Voltage',
 *     yAxis: 'Current',
 *     groupBy: 'Batch_No',
 *     title: '電壓-電流關係散點圖'
 *   }}
 *   width={1000}
 *   height={600}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // 使用 ref 導出圖表
 * const chartRef = useRef();
 *
 * <ChartRenderer
 *   ref={chartRef}
 *   data={data}
 *   config={chartConfig}
 * />
 *
 * // 導出為 PNG
 * const exportChart = () => {
 *   if (chartRef.current) {
 *     exportChartAsPNG(chartRef.current, 'my-chart.png');
 *   }
 * };
 * ```
 */

/**
 * ChartRenderer 組件的 Props
 */
interface ChartRendererProps {
  /**
   * 圖表數據數組
   * 每個元素是一個包含所有欄位的對象，欄位名稱作為 key，值作為 value
   * @example [{ Batch_No: 'A1', Voltage: 3.7, Current: 2.1 }, ...]
   */
  data: Array<Record<string, unknown>>;

  /**
   * 圖表配置對象
   * 包含圖表類型、軸配置、分組、標題等信息
   * @see ChartConfig type definition in types/index.ts
   */
  config: ChartConfig;

  /**
   * 加載狀態
   * 當為 true 時顯示加載動畫和提示訊息
   * @default false
   */
  loading?: boolean;

  /**
   * 錯誤訊息
   * 如果提供，將顯示錯誤警告代替圖表
   */
  error?: string;

  /**
   * 圖表寬度（像素）
   * @default 800
   */
  width?: number;

  /**
   * 圖表高度（像素）
   * @default 400
   */
  height?: number;
}

type ChartKind = ChartConfig['type'];

const basicTypes: ChartKind[] = ['bar'];
const advancedTypes: ChartKind[] = ['scatter'];

const ChartRenderer = React.forwardRef<any, ChartRendererProps>(({
  data,
  config,
  loading = false,
  error,
  width = 800,
  height = 400,
}, ref) => {
  useEffect(() => {
    const warnings = checkPlotlyConflicts();
    if (warnings.length > 0) {
      console.warn('圖表衝突警告:', warnings);
    }

    return () => {
      cleanupChartMemory();
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cleanupChartMemory();
    }, 30000);

    return () => clearTimeout(timeoutId);
  }, [config]);


  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Rendering chart...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Chart failed to render: {error}
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No data available for chart rendering.
      </Alert>
    );
  }

  const availableColumns = Object.keys(data[0]);
  const missingFields: string[] = [];

  if (!availableColumns.includes(config.xAxis)) {
    missingFields.push(config.xAxis);
  }

  if (Array.isArray(config.yAxis)) {
    config.yAxis.forEach((field) => {
      if (!availableColumns.includes(field)) {
        missingFields.push(field);
      }
    });
  } else if (!availableColumns.includes(config.yAxis)) {
    missingFields.push(config.yAxis);
  }

  if (config.groupBy && !availableColumns.includes(config.groupBy)) {
    missingFields.push(config.groupBy);
  }

  if (missingFields.length > 0) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Chart configuration references missing fields: {missingFields.join(', ')}
      </Alert>
    );
  }

  if (basicTypes.includes(config.type as ChartKind)) {
    return <BasicCharts ref={ref} data={data} config={config} width={width} height={height} />;
  }

  if (advancedTypes.includes(config.type as ChartKind)) {
    return <AdvancedCharts ref={ref} data={data} config={config} width={width} height={height} />;
  }

  return (
    <Alert severity="warning" sx={{ m: 2 }}>
      Unsupported chart type: {config.type}
    </Alert>
  );
});

ChartRenderer.displayName = 'ChartRenderer';

export default ChartRenderer;
