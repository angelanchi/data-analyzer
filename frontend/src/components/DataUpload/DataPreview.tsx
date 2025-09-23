import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Grid,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { DataPoint, DataStatistics } from '../../types';

type ChartDataType = 'numeric' | 'string' | 'date' | 'boolean';

type ColumnStatistics = DataStatistics & {
  dataType: ChartDataType;
  standardDeviation?: number;
};

interface DataPreviewProps {
  data: DataPoint[];
  title?: string;
  onColumnTypesChange?: (columnTypes: Record<string, 'numeric' | 'string'>) => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({ data, title = '資料預覽', onColumnTypesChange }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [columnTypeOverrides, setColumnTypeOverrides] = useState<Record<string, 'numeric' | 'string'>>({});

  const columns = useMemo<string[]>(() => {
    if (!data || data.length === 0) return [];

    const ordered: string[] = [];
    const seen = new Set<string>();

    data.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!seen.has(key)) {
          seen.add(key);
          ordered.push(key);
        }
      });
    });

    return ordered;
  }, [data]);

  const statistics = useMemo<ColumnStatistics[]>(() => {
    if (!data || data.length === 0 || columns.length === 0) return [];

    return columns.map((column) => {
      const values = data.map((row) => row[column as keyof DataPoint]);
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
      const numericValues = nonNullValues
        .map((v) => (typeof v === 'string' ? parseFloat(v) : v))
        .filter((v) => !Number.isNaN(v as number)) as number[];

      const stat: ColumnStatistics = {
        field: column,
        count: data.length,
        nullCount: data.length - nonNullValues.length,
        uniqueCount: new Set(nonNullValues).size,
        dataType: numericValues.length > 0 ? 'numeric' : 'string',
      };

      if (numericValues.length > 0) {
        stat.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);

        const variance =
          numericValues.reduce((acc, val) => acc + Math.pow(val - stat.mean!, 2), 0) /
          numericValues.length;
        stat.standardDeviation = Math.sqrt(variance);

        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        stat.median =
          sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      }

      return stat;
    });
  }, [data, columns]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTypeChange = (field: string, newType: 'numeric' | 'string') => {
    const newOverrides = { ...columnTypeOverrides, [field]: newType };
    setColumnTypeOverrides(newOverrides);

    // 通知父組件類型變更
    if (onColumnTypesChange) {
      onColumnTypesChange(newOverrides);
    }
  };

  const getEffectiveDataType = (stat: ColumnStatistics): 'numeric' | 'string' => {
    // 優先使用用戶覆寫的類型
    if (columnTypeOverrides[stat.field]) {
      return columnTypeOverrides[stat.field];
    }
    // 否則使用自動檢測的類型（只支持 numeric 和 string）
    return stat.dataType === 'numeric' ? 'numeric' : 'string';
  };

  const getDataTypeColor = (dataType: 'numeric' | 'string') => {
    return dataType === 'numeric' ? 'primary' : 'warning';
  };

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          沒有可用的資料
        </Typography>
      </Paper>
    );
  }

  const paginatedData = data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {data.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                總列數
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {columns.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                總欄位數
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {statistics.filter((s) => s.dataType === 'numeric').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                數值欄位
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {statistics.reduce((sum, s) => sum + (s.nullCount ?? 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                缺失值
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">欄位統計</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Field</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell align="right">Nulls</TableCell>
                <TableCell align="right">Unique</TableCell>
                <TableCell align="right">Mean</TableCell>
                <TableCell align="right">Median</TableCell>
                <TableCell align="right">Min</TableCell>
                <TableCell align="right">Max</TableCell>
                <TableCell align="right">Std dev</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statistics.map((stat) => {
                const effectiveType = getEffectiveDataType(stat);
                return (
                  <TableRow key={stat.field}>
                    <TableCell component="th" scope="row">
                      {stat.field}
                    </TableCell>
                    <TableCell>
                      <ToggleButtonGroup
                        value={effectiveType}
                        exclusive
                        onChange={(e, newType) => {
                          if (newType) handleTypeChange(stat.field, newType);
                        }}
                        size="small"
                      >
                        <ToggleButton value="numeric" color="primary">
                          Numeric
                        </ToggleButton>
                        <ToggleButton value="string" color="warning">
                          String
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell align="right">{stat.count}</TableCell>
                    <TableCell align="right">{stat.nullCount}</TableCell>
                    <TableCell align="right">{stat.uniqueCount}</TableCell>
                    <TableCell align="right">
                      {stat.mean !== undefined ? stat.mean.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {stat.median !== undefined ? stat.median.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {stat.min !== undefined ? stat.min.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {stat.max !== undefined ? stat.max.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {stat.standardDeviation !== undefined
                        ? stat.standardDeviation.toFixed(2)
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column}>{column}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow key={page * rowsPerPage + index}>
                  {columns.map((column) => (
                    <TableCell key={column}>
                      {String(row[column as keyof DataPoint] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="每頁列數"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / 共 ${count !== -1 ? count : `超過 ${to}`} 列`
          }
        />
      </Paper>
    </Box>
  );
};

export default DataPreview;
