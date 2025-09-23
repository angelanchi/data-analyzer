import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  IconButton,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
interface DataViewPreviewProps {
  data: Array<Record<string, unknown>>;
  selectedMetrics: string[];
  selectedGroups: string[];
  primarySort?: string | null;
  secondarySort?: string | null;
}

const MAX_PREVIEW_ROWS = 5;

const DataViewPreview: React.FC<DataViewPreviewProps> = ({
  data,
  selectedMetrics,
  selectedGroups,
  primarySort,
  secondarySort,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  if (data.length === 0) {
    return null;
  }

  const previewColumns = Object.keys(data[0]);
  const previewRows = data.slice(0, MAX_PREVIEW_ROWS);

  const getViewTitle = () => {
    if (selectedGroups.length > 0) {
      return '分組資料檢視';
    }
    if (primarySort || secondarySort) {
      return '已排序逐筆資料檢視';
    }
    return '逐筆資料檢視';
  };

  const getViewDescription = () => {
    if (selectedGroups.length > 0) {
      return `分組欄位：${selectedGroups.join(', ')}（共 ${data.length} 個群組）`;
    }
    if (primarySort) {
      return `排序依據：${primarySort}${secondarySort ? ` → ${secondarySort}` : ''}（共 ${data.length} 列）`;
    }
    return `資料列數：${data.length}`;
  };

  return (
    <Paper sx={{ mb: 3 }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'info.light',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box>
          <Typography variant="h6" color="info.dark">
            預覽：{getViewTitle()}
          </Typography>
          <Typography variant="caption" color="info.dark">
            {getViewDescription()}
          </Typography>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
              欄位：
            </Typography>
            {previewColumns.map((col) => (
              <Chip key={col} label={col} size="small" variant="outlined" />
            ))}
          </Stack>

          {selectedMetrics.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="caption">
                <strong>選取指標：</strong> {selectedMetrics.join(', ')}
              </Typography>
            </Alert>
          )}

          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  {previewColumns.map((column) => (
                    <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} hover>
                    {previewColumns.map((column) => {
                      const value = row[column];
                      let displayValue = '-';

                      if (value !== null && value !== undefined) {
                        if (typeof value === 'number') {
                          displayValue = Number.isInteger(value)
                            ? String(value)
                            : value.toFixed(3);
                        } else {
                          displayValue = String(value);
                        }
                      }

                      return (
                        <TableCell key={column}>
                          {displayValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {data.length > MAX_PREVIEW_ROWS && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              僅顯示前 {MAX_PREVIEW_ROWS} 列（共 {data.length} 列）。完整資料將用於圖表與匯出。
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default DataViewPreview;
