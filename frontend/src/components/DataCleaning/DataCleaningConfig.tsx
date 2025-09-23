import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormControlLabel,
  FormGroup,
  Switch,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  Chip,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  CleaningServices,
  FilterAlt,
  Analytics,
  KeyboardArrowDown,
  KeyboardArrowUp,
  DeleteOutline,
} from '@mui/icons-material';
import { CleaningRule, DataPoint, RemovedRowInfo, RemovalReason } from '../../types';

/**
 * DataCleaningConfig Component
 * 數據清理配置組件
 *
 * ## 功能說明 (Features)
 * 提供完整的數據清理配置界面，允許用戶針對數值型欄位配置清理規則。
 * - 缺失值處理：提供跳過、刪除、使用默認值三種處理方式
 * - 異常值檢測：支援 IQR（四分位距法）和 Z-Score（標準分數法）兩種檢測方法
 * - 數值範圍過濾：可設定每個欄位的最小值和最大值範圍
 * - 實時預覽：即時查看清理結果和統計信息
 * - 移除追蹤：詳細顯示被移除的資料列及移除原因
 *
 * ## 主要特性 (Key Features)
 * 1. **智能欄位檢測** - 自動識別數值型欄位
 * 2. **規則可視化配置** - 使用 Accordion 展開/收合各欄位的清理選項
 * 3. **統計信息顯示** - 顯示最小值、最大值、平均值、缺失值數量、異常值數量
 * 4. **清理結果預覽** - 展示原始行數、清理後行數、移除行數、保留比例
 * 5. **移除原因追蹤** - 可展開查看每一行被移除的詳細原因和完整數據
 *
 * ## 數據流程 (Data Flow)
 * ```
 * 用戶配置清理規則
 *     ↓
 * 點擊「預覽清理效果」按鈕
 *     ↓
 * 調用 onPreviewCleaning(rules)
 *     ↓
 * 後端處理並返回清理結果
 *     ↓
 * 顯示清理統計和被移除的資料
 *     ↓
 * onRulesChange(rules) 通知父組件
 * ```
 *
 * ## 清理規則類型 (Cleaning Rule Types)
 *
 * ### 缺失值處理 (Missing Value Handling)
 * - **skip**: 跳過，不處理缺失值
 * - **remove**: 刪除包含缺失值的整行數據
 * - **default**: 使用用戶指定的默認值填充
 *
 * ### 異常值檢測方法 (Outlier Detection Methods)
 * - **IQR (Interquartile Range)**: 四分位距法
 *   - 計算 Q1（第25百分位）和 Q3（第75百分位）
 *   - IQR = Q3 - Q1
 *   - 異常值範圍：< Q1 - 1.5×IQR 或 > Q3 + 1.5×IQR
 *   - 適用於數據分佈未知的情況
 *
 * - **Z-Score**: 標準分數法
 *   - 計算每個值距離平均值的標準差數量
 *   - 異常值：|Z-Score| > 2.5（即距離平均值超過 2.5 個標準差）
 *   - 假設數據符合常態分佈
 *
 * @component
 * @example
 * ```tsx
 * // 基本使用
 * <DataCleaningConfig
 *   data={rawData}
 *   onRulesChange={(rules) => setCleaningRules(rules)}
 *   onPreviewCleaning={async (rules) => {
 *     const response = await api.previewDataCleaning(fileId, rules);
 *     return response.data;
 *   }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // 在 AnalysisPage 中使用
 * <DataCleaningConfig
 *   data={rawData}
 *   onRulesChange={(rules) => {
 *     setCleaningRules(rules);
 *     // 清理規則變更後可能需要重新處理數據
 *   }}
 *   onPreviewCleaning={async (rules) => {
 *     const result = await previewDataCleaning(uploadedFileIds, rules);
 *     return {
 *       cleanedData: result.cleanedData,
 *       statistics: result.statistics,
 *       removedRows: result.removedRows
 *     };
 *   }}
 * />
 * ```
 */

/**
 * DataCleaningConfig 組件的 Props
 */
interface DataCleaningConfigProps {
  /**
   * 原始數據數組
   * 用於配置清理規則和計算統計信息
   */
  data: DataPoint[];

  /**
   * 清理規則變更回調函數
   * 當用戶修改任何清理規則時觸發，將更新後的規則數組傳遞給父組件
   * @param rules - 更新後的清理規則數組
   */
  onRulesChange: (rules: CleaningRule[]) => void;

  /**
   * 預覽清理效果的異步函數
   * 接收清理規則數組，調用後端 API 進行數據清理預覽，返回清理結果
   * @param rules - 要應用的清理規則數組
   * @returns Promise，包含清理後的數據、統計信息和被移除的行
   */
  onPreviewCleaning: (rules: CleaningRule[]) => Promise<{
    /** 清理後的數據數組 */
    cleanedData: DataPoint[];
    /** 統計信息（原始/清理後的欄位統計） */
    statistics: any;
    /** 被移除的資料列詳情（包含移除原因） */
    removedRows?: RemovedRowInfo[];
    /** 原始資料行數 */
    originalCount?: number;
    /** 清理後資料行數 */
    cleanedCount?: number;
    /** 移除的資料行數 */
    removedCount?: number;
    /** 保留比例（百分比） */
    retentionRate?: number;
  }>;
}

const DataCleaningConfig: React.FC<DataCleaningConfigProps> = ({
  data,
  onRulesChange,
  onPreviewCleaning
}) => {
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([]);
  const [previewData, setPreviewData] = useState<DataPoint[]>([]);
  const [cleaningStats, setCleaningStats] = useState<any>(null);
  const [removedRows, setRemovedRows] = useState<RemovedRowInfo[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showRemovedRows, setShowRemovedRows] = useState(false);
  const [removedRowsPage, setRemovedRowsPage] = useState(0);
  const [removedRowsPerPage, setRemovedRowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // 獲取數據欄位信息
  const columns = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);
  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      const values = data.slice(0, 100).map((row) => row[col as keyof DataPoint]);
      return values.some((val) => typeof val === 'number' || (typeof val === 'string' && !Number.isNaN(parseFloat(val as string))));
    });
  }, [columns, data]);

  // 初始化清理規則
  useEffect(() => {
    if (columns.length === 0 || numericColumns.length === 0) {
      return;
    }

    if (cleaningRules.length === 0) {
      const initialRules = numericColumns.map<CleaningRule>((field) => ({
        field,
        enabled: false,
        handleMissing: 'remove',
        removeOutliers: false,
        outlierMethod: 'iqr',
      }));
      setCleaningRules(initialRules);
      onRulesChange(initialRules);
      return;
    }

    const missingFields = numericColumns.filter((field) => !cleaningRules.some((rule) => rule.field === field));
    if (missingFields.length > 0) {
      const extendedRules: CleaningRule[] = [
        ...cleaningRules,
        ...missingFields.map<CleaningRule>((field) => ({
          field,
          enabled: false,
          handleMissing: 'remove',
          removeOutliers: false,
          outlierMethod: 'iqr',
        })),
      ];
      setCleaningRules(extendedRules);
      onRulesChange(extendedRules);
    }
  }, [columns.length, numericColumns, cleaningRules, onRulesChange]);

  /**
   * 更新清理規則
   * Update Cleaning Rule
   *
   * 根據欄位名稱更新對應的清理規則，並通知父組件規則已變更。
   * 使用部分更新（Partial）方式，只修改指定的屬性。
   *
   * @param field - 要更新的欄位名稱
   * @param updates - 要更新的規則屬性（部分更新）
   *
   * @example
   * ```tsx
   * // 啟用某個欄位的清理規則
   * updateRule('Voltage', { enabled: true });
   *
   * // 修改缺失值處理方式
   * updateRule('Current', { handleMissing: 'default', defaultValue: 0 });
   *
   * // 啟用異常值檢測
   * updateRule('Temperature', {
   *   removeOutliers: true,
   *   outlierMethod: 'iqr'
   * });
   * ```
   */
  const updateRule = (field: string, updates: Partial<CleaningRule>) => {
    const newRules = cleaningRules.map(rule =>
      rule.field === field ? { ...rule, ...updates } : rule
    );
    setCleaningRules(newRules);
    onRulesChange(newRules);
  };

  /**
   * 預覽清理效果
   * Preview Cleaning Effect
   *
   * 調用父組件提供的 `onPreviewCleaning` 函數，向後端發送清理規則，
   * 獲取清理預覽結果並更新組件狀態。
   *
   * ## 功能流程 (Process Flow)
   * 1. 檢查是否有啟用的清理規則
   * 2. 設置 loading 狀態
   * 3. 調用 onPreviewCleaning(rules) 獲取預覽結果
   * 4. 更新以下狀態：
   *    - previewData: 清理後的數據
   *    - cleaningStats: 統計信息
   *    - removedRows: 被移除的行
   * 5. 重置展開狀態和分頁
   *
   * ## 注意事項 (Notes)
   * - 只有在至少有一個規則啟用時才會執行
   * - 錯誤會被捕獲並記錄到控制台
   * - loading 狀態會在 finally 塊中重置，確保 UI 恢復
   *
   * @async
   */
  const handlePreview = async () => {
    if (cleaningRules.some(rule => rule.enabled)) {
      setIsPreviewLoading(true);
      try {
        const result = await onPreviewCleaning(cleaningRules);
        setPreviewData(result.cleanedData);
        setCleaningStats(result.statistics);
        setRemovedRows(result.removedRows || []);
        setShowRemovedRows(false); // 重置展開狀態
        setRemovedRowsPage(0); // 重置分頁
      } catch (error) {
        console.error('預覽清理失敗:', error);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  /**
   * 計算欄位統計信息
   * Calculate Field Statistics
   *
   * 計算指定欄位的統計信息，包括基本統計量和異常值檢測邊界（IQR 方法）。
   *
   * ## 計算內容 (Calculations)
   * 1. **基本統計量**: min, max, mean（最小值、最大值、平均值）
   * 2. **缺失值統計**: missingCount（原始資料行數 - 有效值數量）
   * 3. **IQR 異常值檢測**:
   *    - Q1 (第25百分位)
   *    - Q3 (第75百分位)
   *    - IQR = Q3 - Q1（四分位距）
   *    - lowerBound = Q1 - 1.5×IQR（下邊界）
   *    - upperBound = Q3 + 1.5×IQR（上邊界）
   *    - outlierCount（落在邊界外的值數量）
   *
   * ## IQR 異常值檢測原理 (IQR Outlier Detection)
   * 四分位距法是一種穩健的異常值檢測方法，不受極端值影響。
   * - 常態分佈下，約 99.3% 的數據會落在 [Q1 - 1.5×IQR, Q3 + 1.5×IQR] 範圍內
   * - 適用於數據分佈未知或偏態分佈的情況
   * - 相比 Z-Score 方法，對非常態分佈數據更穩健
   *
   * @param field - 要計算統計信息的欄位名稱
   * @returns 統計信息對象，包含 min, max, mean, outlierCount, missingCount, q1, q3, iqr, lowerBound, upperBound
   *          如果沒有有效的數值，返回 null
   *
   * @example
   * ```tsx
   * const stats = getFieldStatistics('Voltage');
   * if (stats) {
   *   console.log(`平均值: ${stats.mean}`);
   *   console.log(`異常值數量: ${stats.outlierCount}`);
   *   console.log(`異常值範圍: < ${stats.lowerBound} 或 > ${stats.upperBound}`);
   * }
   * ```
   */
  const getFieldStatistics = (field: string) => {
    const values = data.map(row => row[field as keyof DataPoint]).filter(v => v !== null && v !== undefined && v !== '');
    const numericValues = values.map(v => typeof v === 'string' ? parseFloat(v) : v).filter(v => !isNaN(v as number)) as number[];

    if (numericValues.length === 0) return null;

    const sorted = [...numericValues].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);

    return {
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      outlierCount: outliers.length,
      missingCount: data.length - values.length,
      q1,
      q3,
      iqr,
      lowerBound,
      upperBound
    };
  };

  const activeRulesCount = cleaningRules.filter(rule => rule.enabled).length;

  // 切換行展開狀態
  const toggleRowExpansion = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  // 獲取所有欄位（從原始數據）
  const allColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CleaningServices sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          數據清理設定
        </Typography>
        <Chip
          label={`${activeRulesCount} 個活動規則`}
          size="small"
          color={activeRulesCount > 0 ? 'primary' : 'default'}
          sx={{ ml: 2 }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        設定數據清理規則，處理缺失值、異常值和數據範圍過濾
      </Typography>

      {/* 清理規則設定 */}
      <Paper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <FilterAlt sx={{ mr: 1, verticalAlign: 'middle' }} />
          清理規則配置
        </Typography>

        {numericColumns.map((field) => {
          const rule = cleaningRules.find(r => r.field === field);
          const stats = getFieldStatistics(field);

          if (!rule) return null;

          return (
            <Accordion key={field}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  bgcolor: rule.enabled ? 'action.selected' : 'inherit',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={rule.enabled}
                        onChange={(e) => updateRule(field, { enabled: e.target.checked })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                    label={field}
                    sx={{ flexGrow: 1 }}
                  />
                  {stats && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {stats.missingCount > 0 && (
                        <Chip label={`${stats.missingCount} 缺失值`} size="small" color="warning" />
                      )}
                      {stats.outlierCount > 0 && (
                        <Chip label={`${stats.outlierCount} 異常值`} size="small" color="error" />
                      )}
                    </Box>
                  )}
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* 統計信息 */}
                  {stats && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                            統計信息
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">最小值</Typography>
                              <Typography variant="body2">{stats.min.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">最大值</Typography>
                              <Typography variant="body2">{stats.max.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">平均值</Typography>
                              <Typography variant="body2">{stats.mean.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">缺失值</Typography>
                              <Typography variant="body2" color={stats.missingCount > 0 ? 'warning.main' : 'inherit'}>
                                {stats.missingCount}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* 數值範圍設定 */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="最小值"
                      value={rule.minValue ?? ''}
                      onChange={(e) => updateRule(field, {
                        minValue: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      disabled={!rule.enabled}
                      helperText={stats ? `建議範圍: ${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}` : ''}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="最大值"
                      value={rule.maxValue ?? ''}
                      onChange={(e) => updateRule(field, {
                        maxValue: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      disabled={!rule.enabled}
                    />
                  </Grid>

                  {/* 缺失值處理 */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>缺失值處理</InputLabel>
                      <Select
                        value={rule.handleMissing}
                        label="缺失值處理"
                        onChange={(e) => updateRule(field, {
                          handleMissing: e.target.value as CleaningRule['handleMissing']
                        })}
                        disabled={!rule.enabled}
                      >
                        <MenuItem value="skip">跳過（不處理）</MenuItem>
                        <MenuItem value="remove">刪除包含缺失值的行</MenuItem>
                        <MenuItem value="default">使用默認值</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* 默認值設定 */}
                  {rule.handleMissing === 'default' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="默認值"
                        value={rule.defaultValue ?? ''}
                        onChange={(e) => updateRule(field, {
                          defaultValue: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        disabled={!rule.enabled}
                      />
                    </Grid>
                  )}

                  {/* 異常值處理 */}
                  <Grid item xs={12}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={rule.removeOutliers ?? false}
                            onChange={(e) => updateRule(field, { removeOutliers: e.target.checked })}
                            disabled={!rule.enabled}
                          />
                        }
                        label="移除異常值"
                      />
                    </FormGroup>
                  </Grid>

                  {rule.removeOutliers && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>異常值檢測方法</InputLabel>
                          <Select
                            value={rule.outlierMethod}
                            label="異常值檢測方法"
                            onChange={(e) => updateRule(field, {
                              outlierMethod: e.target.value as CleaningRule['outlierMethod']
                            })}
                            disabled={!rule.enabled}
                          >
                            <MenuItem value="iqr">四分位距法 (IQR)</MenuItem>
                            <MenuItem value="zscore">Z-score 標準分數法</MenuItem>
                          </Select>
                        </FormControl>
                        {stats && rule.outlierMethod === 'iqr' && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            異常值範圍: &lt; {stats.lowerBound.toFixed(2)} 或 &gt; {stats.upperBound.toFixed(2)}
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12}>
                        {rule.outlierMethod === 'iqr' ? (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                              四分位距法 (IQR)
                            </Typography>
                            <Typography variant="body2">
                              偵測超出 Q1-1.5×IQR 至 Q3+1.5×IQR 範圍的值。此方法對極端值較不敏感，適合數據分佈未知的情況。
                            </Typography>
                          </Alert>
                        ) : (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                              Z-Score 標準分數法
                            </Typography>
                            <Typography variant="body2">
                              偵測距離平均值超過 3 個標準差的值。此方法假設數據符合常態分佈，對極端值較敏感。
                            </Typography>
                          </Alert>
                        )}
                      </Grid>
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Paper>

      {/* 預覽按鈕 */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={handlePreview}
          disabled={activeRulesCount === 0 || isPreviewLoading}
          startIcon={<Analytics />}
        >
          {isPreviewLoading ? '預覽中...' : '預覽清理效果'}
        </Button>
      </Box>

      {/* 清理效果預覽 */}
      {cleaningStats && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            清理效果預覽
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {data.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    原始行數
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {previewData.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    清理後行數
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {data.length - previewData.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    移除行數
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {((previewData.length / data.length) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    保留比例
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {previewData.length < data.length * 0.5 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              警告：清理後的數據量少於原始數據的50%，請檢查清理規則設定是否過於嚴格。
            </Alert>
          )}

          {/* 移除的資料列展開區 */}
          {removedRows.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.selected' }
                }}
                onClick={() => setShowRemovedRows(!showRemovedRows)}
              >
                <IconButton size="small">
                  {showRemovedRows ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
                <DeleteOutline sx={{ ml: 1, mr: 1, color: 'error.main' }} />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  移除的資料列
                </Typography>
                <Chip label={`${removedRows.length} 行`} color="error" size="small" />
              </Box>

              <Collapse in={showRemovedRows}>
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="50px"></TableCell>
                        <TableCell>行號</TableCell>
                        <TableCell>移除原因</TableCell>
                        <TableCell>Point_ID</TableCell>
                        <TableCell>關鍵欄位值</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {removedRows
                        .slice(removedRowsPage * removedRowsPerPage, removedRowsPage * removedRowsPerPage + removedRowsPerPage)
                        .map((removedRow) => {
                          const isExpanded = expandedRows.has(removedRow.rowIndex);
                          const affectedFields = new Set(removedRow.reasons.map(r => r.field));

                          return (
                            <React.Fragment key={removedRow.rowIndex}>
                              <TableRow hover>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRowExpansion(removedRow.rowIndex)}
                                  >
                                    {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                  </IconButton>
                                </TableCell>
                                <TableCell>{removedRow.rowIndex + 1}</TableCell>
                                <TableCell>
                                  <Box>
                                    {removedRow.reasons.map((reason: RemovalReason, idx: number) => (
                                      <Box key={idx} sx={{ mb: 0.5 }}>
                                        <Chip
                                          label={reason.field}
                                          size="small"
                                          color={
                                            reason.ruleType === 'range' ? 'warning' :
                                              reason.ruleType === 'outlier' ? 'error' :
                                                'default'
                                          }
                                          sx={{ mr: 1 }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          {reason.detail}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {removedRow.rowData.Point_ID || '-'}
                                </TableCell>
                                <TableCell>
                                  {removedRow.reasons.slice(0, 2).map((reason: RemovalReason, idx: number) => (
                                    <Box key={idx} sx={{ mb: 0.5 }}>
                                      <Typography variant="caption">
                                        <strong>{reason.field}:</strong>{' '}
                                        {String(removedRow.rowData[reason.field as keyof DataPoint] ?? 'N/A')}
                                      </Typography>
                                    </Box>
                                  ))}
                                  {removedRow.reasons.length > 2 && (
                                    <Typography variant="caption" color="text.secondary">
                                      ... +{removedRow.reasons.length - 2} 個欄位
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>

                              {/* 展開後顯示完整數據 */}
                              <TableRow>
                                <TableCell colSpan={5} sx={{ py: 0, borderBottom: isExpanded ? 1 : 0 }}>
                                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ py: 2, px: 2, bgcolor: 'grey.50' }}>
                                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        完整數據
                                      </Typography>
                                      <Grid container spacing={1}>
                                        {allColumns.map((column) => {
                                          const value = removedRow.rowData[column as keyof DataPoint];
                                          const isAffected = affectedFields.has(column);

                                          return (
                                            <Grid item xs={12} sm={6} md={4} key={column}>
                                              <Paper
                                                variant="outlined"
                                                sx={{
                                                  p: 1,
                                                  bgcolor: isAffected ? 'error.light' : 'background.paper',
                                                  border: isAffected ? 2 : 1,
                                                  borderColor: isAffected ? 'error.main' : 'divider'
                                                }}
                                              >
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                  sx={{ fontWeight: isAffected ? 'bold' : 'normal' }}
                                                >
                                                  {column}
                                                  {isAffected && ' ⚠️'}
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  sx={{
                                                    wordBreak: 'break-word',
                                                    fontWeight: isAffected ? 'bold' : 'normal'
                                                  }}
                                                >
                                                  {String(value ?? '-')}
                                                </Typography>
                                              </Paper>
                                            </Grid>
                                          );
                                        })}
                                      </Grid>
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {removedRows.length > removedRowsPerPage && (
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={removedRows.length}
                    rowsPerPage={removedRowsPerPage}
                    page={removedRowsPage}
                    onPageChange={(_, newPage) => setRemovedRowsPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRemovedRowsPerPage(parseInt(e.target.value, 10));
                      setRemovedRowsPage(0);
                    }}
                    labelRowsPerPage="每頁行數"
                    labelDisplayedRows={({ from, to, count }) =>
                      `${from}-${to} / 共 ${count} 行`
                    }
                  />
                )}
              </Collapse>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default DataCleaningConfig;