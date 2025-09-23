import React from 'react';
import {
  Paper,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Divider,
  Alert,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';

interface DataParameterSelectorProps {
  numericColumns: string[];
  categoricalColumns: string[];
  selectedMetrics: string[];
  onMetricsChange: (params: string[]) => void;
  selectedCategoricalMetrics: string[];
  onCategoricalMetricsChange: (params: string[]) => void;
  selectedGroups: string[];
  onGroupsChange: (params: string[]) => void;
  groupedRowCount: number;
  primarySort: string | null;
  secondarySort: string | null;
  onPrimarySortChange: (sort: string | null) => void;
  onSecondarySortChange: (sort: string | null) => void;
}

const renderValue = (selected: string[]) => (selected.length > 0 ? selected.join(', ') : '無');

const DataParameterSelector: React.FC<DataParameterSelectorProps> = ({
  numericColumns,
  categoricalColumns,
  selectedMetrics,
  onMetricsChange,
  selectedCategoricalMetrics,
  onCategoricalMetricsChange,
  selectedGroups,
  onGroupsChange,
  groupedRowCount,
  primarySort,
  secondarySort,
  onPrimarySortChange,
  onSecondarySortChange,
}) => {
  // 直接使用 categoricalColumns（已經在 dataViews.ts 中正確過濾）
  const handleMetricChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const next = typeof value === 'string' ? value.split(',') : value;
    onMetricsChange(next.filter((metric) => numericColumns.includes(metric)));
  };

  const handleCategoricalMetricChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const next = typeof value === 'string' ? value.split(',') : value;
    onCategoricalMetricsChange(next.filter((catMetric) => categoricalColumns.includes(catMetric)));
  };

  const handleGroupChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const next = typeof value === 'string' ? value.split(',') : value;
    onGroupsChange(next.filter((group) => categoricalColumns.includes(group)));
  };

  const handlePrimarySortChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onPrimarySortChange(value || null);
  };

  const handleSecondarySortChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onSecondarySortChange(value || null);
  };

  // 計算可用於排序的欄位：合併數值指標和字串指標
  const sortableColumns = React.useMemo(() => {
    const combined = [...selectedMetrics, ...selectedCategoricalMetrics];
    return Array.from(new Set(combined)).sort();
  }, [selectedMetrics, selectedCategoricalMetrics]);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        資料參數設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        選擇要分析的數值指標、字串指標與分組欄位，這些設定會影響資料輸出格式與圖表配置選項。
      </Typography>

      <Stack spacing={3}>
        {/* 數值指標選擇 */}
        <FormControl fullWidth disabled={numericColumns.length === 0}>
          <InputLabel id="metrics-select-label">數值指標 (可複選)</InputLabel>
          <Select
            labelId="metrics-select-label"
            multiple
            value={selectedMetrics}
            label="數值指標 (可複選)"
            onChange={handleMetricChange}
            renderValue={renderValue}
          >
            {numericColumns.length === 0 && <MenuItem disabled>未偵測到數值欄位</MenuItem>}
            {numericColumns.map((column) => (
              <MenuItem key={column} value={column}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">{column}</Typography>
                  <Chip size="small" label="數值" color="primary" variant="outlined" />
                </Stack>
              </MenuItem>
            ))}
          </Select>
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              選擇要分析的數值欄位，這些欄位會出現在資料輸出中，並可在圖表中作為 Y 軸選項。
            </Typography>
          </Box>
        </FormControl>

        {/* 字串指標選擇 */}
        <FormControl fullWidth disabled={categoricalColumns.length === 0}>
          <InputLabel id="categorical-metrics-select-label">字串指標 (可複選)</InputLabel>
          <Select
            labelId="categorical-metrics-select-label"
            multiple
            value={selectedCategoricalMetrics}
            label="字串指標 (可複選)"
            onChange={handleCategoricalMetricChange}
            renderValue={renderValue}
          >
            {categoricalColumns.length === 0 && <MenuItem disabled>未偵測到類別欄位</MenuItem>}
            {categoricalColumns.map((column) => (
              <MenuItem key={column} value={column}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">{column}</Typography>
                  <Chip size="small" label="字串" color="warning" variant="outlined" />
                </Stack>
              </MenuItem>
            ))}
          </Select>
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              選擇要輸出的類別欄位（如 Operator、Equipment_ID、Batch_No），這些欄位可用於圖表的 X 軸與圖例分組。
            </Typography>
          </Box>
        </FormControl>

        {/* 分組欄位選擇 */}
        <FormControl fullWidth disabled={categoricalColumns.length === 0}>
          <InputLabel id="groups-select-label">分組欄位（選填）</InputLabel>
          <Select
            labelId="groups-select-label"
            multiple
            value={selectedGroups}
            label="分組欄位（選填）"
            onChange={handleGroupChange}
            renderValue={renderValue}
          >
            {categoricalColumns.length === 0 && <MenuItem disabled>未偵測到類別欄位</MenuItem>}
            {categoricalColumns.map((column) => (
              <MenuItem key={column} value={column}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">{column}</Typography>
                  <Chip size="small" label="類別" color="secondary" variant="outlined" />
                </Stack>
              </MenuItem>
            ))}
          </Select>
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              選擇分組欄位後，系統將依此欄位計算數值指標的平均值、最大值、最小值等彙總統計數據
            </Typography>
          </Box>
        </FormControl>

        {selectedGroups.length === 0 ? (
          <Alert severity="info" icon={false}>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              未選擇分組欄位
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              資料將以逐筆方式輸出，保留所有原始數值細節。
            </Typography>
          </Alert>
        ) : (
          <Alert severity="info" icon={false}>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              目前分組設定：{selectedGroups.join(' × ')}
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              將產生 {groupedRowCount} 個分組，每組包含數值指標的統計數據（平均值、最大值、最小值等）。
            </Typography>
            {selectedGroups.includes('Point_ID') && (
              <Typography variant="caption" component="div" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                （包含 Point_ID：每筆資料視為獨立分組，相當於逐筆資料）
              </Typography>
            )}
          </Alert>
        )}

        <Divider />

        {/* 排序設定 */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            排序設定
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            設定資料的排序順序，用於預覽顯示與匯出檔案。排序適用於逐筆資料與分組彙總資料。
          </Typography>

          <Stack spacing={2}>
            <FormControl fullWidth disabled={sortableColumns.length === 0}>
              <InputLabel id="primary-sort-label">主要排序欄位（選填）</InputLabel>
              <Select
                labelId="primary-sort-label"
                value={primarySort || ''}
                label="主要排序欄位（選填）"
                onChange={handlePrimarySortChange}
              >
                <MenuItem value="">
                  <em>無</em>
                </MenuItem>
                {sortableColumns.map((column) => {
                  const isNumeric = selectedMetrics.includes(column);
                  return (
                    <MenuItem key={column} value={column}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{column}</Typography>
                        <Chip
                          size="small"
                          label={isNumeric ? '數值' : '字串'}
                          color={isNumeric ? 'primary' : 'warning'}
                          variant="outlined"
                        />
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  設定主要排序依據（從已選擇的數值指標與字串指標中選擇）
                </Typography>
              </Box>
            </FormControl>

            <FormControl fullWidth disabled={!primarySort || sortableColumns.length <= 1}>
              <InputLabel id="secondary-sort-label">次要排序欄位（選填）</InputLabel>
              <Select
                labelId="secondary-sort-label"
                value={secondarySort || ''}
                label="次要排序欄位（選填）"
                onChange={handleSecondarySortChange}
              >
                <MenuItem value="">
                  <em>無</em>
                </MenuItem>
                {sortableColumns
                  .filter((column) => column !== primarySort)
                  .map((column) => {
                    const isNumeric = selectedMetrics.includes(column);
                    return (
                      <MenuItem key={column} value={column}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">{column}</Typography>
                          <Chip
                            size="small"
                            label={isNumeric ? '數值' : '字串'}
                            color={isNumeric ? 'primary' : 'warning'}
                            variant="outlined"
                          />
                        </Stack>
                      </MenuItem>
                    );
                  })}
              </Select>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  在每個主要分組內的次要排序
                </Typography>
              </Box>
            </FormControl>

            {primarySort && (
              <Alert severity="success" icon={false}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  排序順序：{primarySort}
                  {secondarySort && ` → ${secondarySort}`}
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                  資料會依此順序排列，方便匯出至 Excel 或其他工具。
                </Typography>
              </Alert>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default DataParameterSelector;
