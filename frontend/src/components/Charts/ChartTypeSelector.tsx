import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  ScatterPlot,
  BarChart,
  ShowChart,
} from '@mui/icons-material';
import { ChartType, ChartConfig } from '../../types';
import { getChartRecommendations, getDataViewSpecificDescription, DataAnalysis } from '../../utils/chartRecommendations';

interface ChartTypeSelectorProps {
  data: Array<Record<string, unknown>>;
  onSelectChart: (config: ChartConfig) => void;
  dataViewMode?: 'flattened' | 'grouped';
  selectedCategoricalMetrics?: string[];
  metadata?: {
    sources?: Array<{ sourceName: string; rowCount: number }>;
    groupParams?: string[] | null;
    flattenParams?: string[] | null;
    defaultMetrics?: string[] | null;
    defaultGroups?: string[] | null;
    columnTypes?: {
      numeric: string[];
      categorical: string[];
      // 新增：只包含原始上傳資料的欄位（排除系統生成的無用欄位）
      originalNumeric?: string[];
      originalCategorical?: string[];
    } | null;
  } | null;
}

interface ChartTypeInfo {
  type: ChartType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  suitableFor: string[];
  requirements: {
    minColumns: number;
    numericColumns?: number;
    categoricalColumns?: number;
  };
}

const chartTypes: ChartTypeInfo[] = [
  {
    type: 'bar',
    name: '點狀圖',
    description: '以點狀呈現不同類別的數值，便於比較。',
    icon: <BarChart />,
    color: '#f57c00',
    suitableFor: [],
    requirements: { minColumns: 2, categoricalColumns: 1, numericColumns: 1 },
  },
  {
    type: 'scatter',
    name: '散佈圖',
    description: '探索兩個變數之間的相關性。',
    icon: <ScatterPlot />,
    color: '#1976d2',
    suitableFor: [],
    requirements: { minColumns: 2, numericColumns: 2 },
  },
];

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  data,
  onSelectChart,
  dataViewMode = 'flattened',
  selectedCategoricalMetrics = [],
  metadata
}) => {
  const [selectedType, setSelectedType] = useState<ChartType | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [chartConfig, setChartConfig] = useState<Partial<ChartConfig>>({});

  const columns = React.useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);

  // 分析列類型，特別考慮 grouped 數據的 Source_Param 格式
  const {
    numericColumns,
    categoricalColumns,
    metrics,
    groupFields,
    valueColumns,
  } = React.useMemo(() => {
    const available = new Set(columns);
    const sampleRows = data.slice(0, Math.min(data.length, 100));

    const numericSet = new Set<string>();
    const categoricalSet = new Set<string>();
    const metricSet = new Set<string>();
    const groupSet = new Set<string>();
    const valueSet = new Set<string>();

    const addIfPresent = (items: Iterable<string>, target: Set<string>) => {
      for (const item of items) {
        if (available.has(item)) {
          target.add(item);
        }
      }
    };

    if (dataViewMode === 'grouped') {
      const grouping = metadata?.groupParams ?? metadata?.defaultGroups ?? [];
      addIfPresent(grouping, categoricalSet);
      grouping.forEach((group) => groupSet.add(group));

      if (available.has('Group')) {
        categoricalSet.add('Group');
        groupSet.add('Group');
      }

      const metricsList = metadata?.flattenParams ?? metadata?.defaultMetrics ?? [];
      metricsList.forEach((metric) => {
        metricSet.add(metric);

        // In grouped data, metrics use their original names (containing mean values)
        // Statistics are suffixed with _stat (e.g., Temperature_stat_count, Temperature_stat_min)
        // Only display metrics without _stat suffix for chart axis options
        if (available.has(metric)) {
          numericSet.add(metric);
          valueSet.add(metric);
        }
      });

      // Filter out _stat columns from chart axis options
      columns.forEach((col) => {
        if (col.includes('_stat_')) {
          // Skip statistical columns - they're for export only
          return;
        }
        if (col === 'totalCount' && available.has(col)) {
          numericSet.add(col);
        }
      });

      // 添加用戶選擇的字串指標到grouped模式的圖表配置選項中
      selectedCategoricalMetrics.forEach((catMetric) => {
        if (available.has(catMetric)) {
          categoricalSet.add(catMetric);
        }
      });
    } else {
      const metricsList = metadata?.flattenParams ?? metadata?.defaultMetrics ?? metadata?.columnTypes?.originalNumeric ?? metadata?.columnTypes?.numeric ?? [];
      metricsList.forEach((metric) => {
        if (available.has(metric)) {
          numericSet.add(metric);
          metricSet.add(metric);
        }
      });

      const additionalNumeric = metadata?.columnTypes?.originalNumeric ?? metadata?.columnTypes?.numeric ?? metadata?.defaultMetrics ?? [];
      addIfPresent(additionalNumeric, numericSet);

      // 只添加用戶在第三步選擇的字串指標到圖表配置選項中
      // 不再自動添加所有categorical欄位，確保只有選擇的欄位會出現
      selectedCategoricalMetrics.forEach((catMetric) => {
        if (available.has(catMetric)) {
          categoricalSet.add(catMetric);
        }
      });
    }

    columns.forEach((column) => {
      if (numericSet.has(column) || categoricalSet.has(column)) {
        return;
      }

      const sampleValues = sampleRows.map((row) => row[column]);
      const numericHits = sampleValues.filter((value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'number') return Number.isFinite(value);
        if (typeof value === 'string') {
          const parsed = Number(value.trim());
          return Number.isFinite(parsed);
        }
        return false;
      }).length;

      if (numericHits > 0 && numericHits >= sampleValues.length * 0.5) {
        numericSet.add(column);
      } else {
        categoricalSet.add(column);
      }
    });

    // Enhanced sorting for semantic grouping - prioritize cross-batch/cross-point fields
    const priorityGroupingFields = ['Batch_No', 'Point_ID', 'Source_File', 'Equipment_ID'];
    const semanticGroupingFields = ['Test_Result', 'Operator'];

    const sortCategoricalFields = (fields: string[]): string[] => {
      const priority = fields.filter(field => priorityGroupingFields.includes(field));
      const semantic = fields.filter(field => semanticGroupingFields.includes(field) && !priority.includes(field));
      const others = fields.filter(field => !priority.includes(field) && !semantic.includes(field));

      return [
        ...priority.sort(),
        ...semantic.sort(),
        ...others.sort()
      ];
    };

    const sortedNumeric = Array.from(numericSet).sort();
    const sortedCategorical = sortCategoricalFields(Array.from(categoricalSet));
    const sortedMetrics = Array.from(metricSet).sort();
    const sortedGroups = sortCategoricalFields(Array.from(groupSet));
    const sortedValues = Array.from(valueSet).sort();

    return {
      numericColumns: sortedNumeric,
      categoricalColumns: sortedCategorical,
      metrics: sortedMetrics,
      groupFields: sortedGroups,
      valueColumns: sortedValues,
    };
  }, [columns, data, dataViewMode, metadata, selectedCategoricalMetrics]);

  // 獲取智能推薦
  const isGroupedView = dataViewMode === 'grouped';
  const groupedNumeric = valueColumns.length > 0 ? valueColumns : numericColumns;
  const groupedCategorical = groupFields.length > 0 ? groupFields : categoricalColumns;

  // Point_ID只有在原始資料中存在時才包含
  const originalCategorical = metadata?.columnTypes?.originalCategorical ?? [];
  const pointIdPresent = originalCategorical.includes('Point_ID');
  const flattenedCategorical = Array.from(new Set([
    ...categoricalColumns,
    ...(pointIdPresent ? ['Point_ID'] : [])
  ]));

  // 圖例分組選項與字串指標連動
  // 圖表總是使用 flattened data，圖例分組僅用於視覺化分組顯示
  const categoricalOptions = React.useMemo(() => {
    // 使用 selectedCategoricalMetrics 作為圖例分組選項
    return selectedCategoricalMetrics;
  }, [selectedCategoricalMetrics]);

  const resolveAxisOptions = (chartType: ChartType | null, axis: 'x' | 'y'): string[] => {
    if (!chartType) return columns;

    // 圖表總是使用flattened data，不使用grouped data
    const numericPool = numericColumns;
    const categoricalPool = categoricalColumns;

    // Y軸限制為數值欄位
    if (axis === 'y') {
      return numericPool;
    }

    // X軸根據圖表類型決定
    switch (chartType) {
    case 'scatter':
      return numericPool;  // 散佈圖 X 軸使用數值
    case 'bar':
      return categoricalPool;  // 點狀圖 X 軸使用類別
    default:
      return columns;
    }
  };

  const getAxisOptions = (axis: 'x' | 'y'): string[] => resolveAxisOptions(selectedType, axis);

  const recommendations = React.useMemo(() => {
    const analysis: DataAnalysis = {
      dataViewMode,
      columns,
      numericColumns: isGroupedView ? groupedNumeric : numericColumns,
      categoricalColumns: isGroupedView ? groupedCategorical : flattenedCategorical,
      metrics,
      groupFields,
      valueColumns: isGroupedView ? groupedNumeric : numericColumns,
    };
    return getChartRecommendations(analysis);
  }, [dataViewMode, columns, numericColumns, metrics, groupFields, groupedNumeric, groupedCategorical, flattenedCategorical, isGroupedView]);

  const isChartSuitable = (chartType: ChartTypeInfo): boolean => {
    if (columns.length < chartType.requirements.minColumns) {
      return false;
    }
    const numericPool = isGroupedView ? groupedNumeric : numericColumns;
    const categoricalPool = isGroupedView ? groupedCategorical : flattenedCategorical;
    if (chartType.requirements.numericColumns && numericPool.length < chartType.requirements.numericColumns) {
      return false;
    }
    if (chartType.requirements.categoricalColumns && categoricalPool.length < chartType.requirements.categoricalColumns) {
      return false;
    }
    return true;
  };

  const getChartPriority = (chartType: ChartType): number => {
    const recommendation = recommendations.find((item) => item.type === chartType);
    return recommendation ? recommendation.priority : 0;
  };

  const getChartRecommendationReason = (chartType: ChartType): string | undefined => {
    const recommendation = recommendations.find((item) => item.type === chartType);
    return recommendation?.reason;
  };

  // 根據 X 軸欄位類型自動決定圖表類型
  const determineChartType = (xAxisField: string): ChartType => {
    if (!xAxisField) return 'scatter'; // 預設為散佈圖

    // 檢查是否為數值欄位
    const isNumeric = numericColumns.includes(xAxisField);

    // X軸為數值 → 散佈圖；X軸為類別 → 點狀圖
    return isNumeric ? 'scatter' : 'bar';
  };

  const handleOpenChartConfig = () => {
    // 預設選擇第一個可用的欄位
    const defaultXAxis = numericColumns.length > 0 ? numericColumns[0] : categoricalColumns[0] || '';
    const defaultYAxis = numericColumns.length > 0 ? numericColumns[0] : '';
    const autoType = determineChartType(defaultXAxis);

    // 預設圖例分組：優先使用 Source_File，否則使用第一個字串指標
    const defaultGroupBy = selectedCategoricalMetrics.includes('Source_File')
      ? 'Source_File'
      : (selectedCategoricalMetrics.length > 0 ? selectedCategoricalMetrics[0] : '');

    setSelectedType(autoType);
    setChartConfig({
      type: autoType,
      title: `${chartTypes.find((ct) => ct.type === autoType)?.name || autoType} 圖表`,
      xAxis: defaultXAxis,
      yAxis: defaultYAxis,
      groupBy: defaultGroupBy,
    });

    setIsConfigDialogOpen(true);
  };

  const handleXAxisChange = (newXAxis: string) => {
    const newType = determineChartType(newXAxis);
    setSelectedType(newType);
    setChartConfig((prev) => ({
      ...prev,
      xAxis: newXAxis,
      type: newType,
      title: `${chartTypes.find((ct) => ct.type === newType)?.name || newType} 圖表`,
    }));
  };

  const handleConfigSubmit = () => {
    if (!selectedType || !chartConfig.title || !chartConfig.xAxis || !chartConfig.yAxis) {
      return;
    }

    const finalConfig: ChartConfig = {
      type: selectedType,
      title: chartConfig.title,
      xAxis: chartConfig.xAxis,
      yAxis: chartConfig.yAxis,
      groupBy: chartConfig.groupBy && chartConfig.groupBy !== '' ? chartConfig.groupBy : undefined,
      filters: chartConfig.filters || [],
    };

    onSelectChart(finalConfig);
    setIsConfigDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        圖表配置
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        圖表類型會根據您選擇的 X 軸欄位自動決定：數值欄位使用散佈圖，類別欄位使用點狀圖。
      </Typography>

      <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>自動圖表類型規則：</strong>
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • X 軸為<strong>數值欄位</strong> → 散佈圖（探索兩變數相關性）
        </Typography>
        <Typography variant="body2">
          • X 軸為<strong>類別欄位</strong> → 點狀圖（比較不同類別的數值）
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={handleOpenChartConfig}
        disabled={columns.length === 0 || numericColumns.length === 0}
        sx={{ mb: 3 }}
      >
        建立圖表
      </Button>

      {(columns.length === 0 || numericColumns.length === 0) && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          需要至少一個數值欄位才能建立圖表。
        </Typography>
      )}

      <Dialog open={isConfigDialogOpen} onClose={() => setIsConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          圖表配置
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                當前圖表類型：{selectedType && chartTypes.find((ct) => ct.type === selectedType)?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                （根據 X 軸欄位類型自動決定）
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="圖表標題"
              value={chartConfig.title || ''}
              onChange={(event) => setChartConfig((prev) => ({ ...prev, title: event.target.value }))}
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>X 軸</InputLabel>
              <Select
                value={chartConfig.xAxis || ''}
                label="X 軸"
                onChange={(event) => handleXAxisChange(event.target.value as string)}
              >
                {/* 顯示所有欄位（數值 + 類別），圖表類型會自動調整 */}
                {[...numericColumns, ...categoricalColumns].map((column) => (
                  <MenuItem key={column} value={column}>
                    {column} {numericColumns.includes(column) ? '(數值)' : '(類別)'}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                選擇數值欄位將自動使用散佈圖，選擇類別欄位將自動使用點狀圖
              </Typography>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Y 軸</InputLabel>
              <Select
                value={chartConfig.yAxis || ''}
                label="Y 軸"
                onChange={(event) => setChartConfig((prev) => ({ ...prev, yAxis: event.target.value as string }))}
              >
                {getAxisOptions('y').map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>圖例分組（選填）</InputLabel>
              <Select
                value={chartConfig.groupBy || ''}
                label="圖例分組（選填）"
                onChange={(event) => setChartConfig((prev) => ({ ...prev, groupBy: event.target.value as string }))}
              >
                <MenuItem value="">無</MenuItem>
                {categoricalOptions.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                此欄位與「步驟 3」的字串指標連動，選擇後圖表會依此欄位以不同顏色或標記區分資料點。
              </Typography>
              {categoricalOptions.length === 0 && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                  請先在「步驟 3」中選擇至少一個字串指標
                </Typography>
              )}
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfigDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleConfigSubmit}
            variant="contained"
            disabled={!chartConfig.title || !chartConfig.xAxis || !chartConfig.yAxis}
          >
            確定
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChartTypeSelector;
