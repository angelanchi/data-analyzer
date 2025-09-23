import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from '@mui/material';
import { BatchViewMetadata } from '../../types';

interface DataViewSelectorProps {
  flattenedData: Array<Record<string, unknown>>;
  metadata: BatchViewMetadata | null;
}

const MAX_PREVIEW_ROWS = 5;

const DataViewSelector: React.FC<DataViewSelectorProps> = ({ flattenedData, metadata }) => {
  const previewColumns = flattenedData.length > 0 ? Object.keys(flattenedData[0]) : [];
  const previewRows = flattenedData.slice(0, MAX_PREVIEW_ROWS);

  const metrics = metadata?.flattenParams ?? metadata?.defaultMetrics ?? metadata?.columnTypes.numeric ?? [];
  const overall = metadata?.aggregations?.overall ?? {};
  const bySource = metadata?.aggregations?.bySource ?? [];

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        資料總覽
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        逐筆資料會保留每筆紀錄與 Source_File 以及選取的分組欄位，並針對各指標計算摘要統計以利快速比較。
      </Typography>

      {metadata && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              摘要
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`批次：${metadata.batchCount}`} size="small" />
              <Chip label={`資料列數：${metadata.flattenedRowCount}`} size="small" />
              <Chip label={`數值欄位：${metadata.columnTypes.numeric.length}`} size="small" />
              <Chip label={`類別欄位：${metadata.columnTypes.categorical.length}`} size="small" />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              來源
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {metadata.sources.length === 0 && (
                <Typography variant="body2">未偵測到來源。</Typography>
              )}
              {metadata.sources.map((source) => (
                <Chip
                  key={source.sourceName}
                  label={`${source.sourceName}：${source.rowCount} 列`}
                  size="small"
                />
              ))}
            </Stack>
          </Paper>
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />

      {flattenedData.length === 0 ? (
        <Alert severity="info">目前沒有可用資料，請先上傳並完成清理。</Alert>
      ) : (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            逐筆資料預覽
          </Typography>
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {previewColumns.map((column) => (
                    <TableCell key={column}>{column}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {previewColumns.map((column) => (
                      <TableCell key={column}>
                        {row[column] !== null && row[column] !== undefined ? String(row[column]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          {flattenedData.length > MAX_PREVIEW_ROWS && (
            <Typography variant="caption" color="text.secondary">
              僅顯示前 {MAX_PREVIEW_ROWS} 列。
            </Typography>
          )}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        整體統計
      </Typography>
      {metrics.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          未偵測到數值指標。
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ mb: 3, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell align="right">Mean</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell align="right">Min</TableCell>
                <TableCell align="right">Max</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics.map((metric) => {
                const stats = overall[metric];
                return (
                  <TableRow key={metric}>
                    <TableCell>{metric}</TableCell>
                    <TableCell align="right">{stats?.mean !== null && stats?.mean !== undefined ? stats.mean.toFixed(3) : '-'}</TableCell>
                    <TableCell align="right">{stats?.count ?? 0}</TableCell>
                    <TableCell align="right">{stats?.min !== null && stats?.min !== undefined ? stats.min.toFixed(3) : '-'}</TableCell>
                    <TableCell align="right">{stats?.max !== null && stats?.max !== undefined ? stats.max.toFixed(3) : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        各來源指標
      </Typography>
      {bySource.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          沒有可用的來源統計。
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell>Metric</TableCell>
                <TableCell align="right">Mean</TableCell>
                <TableCell align="right">Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bySource.flatMap(({ source, metrics: stats }) =>
                metrics.map((metric) => {
                  const entry = stats[metric];
                  return (
                    <TableRow key={`${source}-${metric}`}>
                      <TableCell>{source}</TableCell>
                      <TableCell>{metric}</TableCell>
                      <TableCell align="right">{entry && entry.mean !== null && entry.mean !== undefined ? entry.mean.toFixed(3) : '-'}</TableCell>
                      <TableCell align="right">{entry?.count ?? 0}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Paper>
  );
};

export default DataViewSelector;
