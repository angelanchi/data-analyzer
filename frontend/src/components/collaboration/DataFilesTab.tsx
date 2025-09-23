import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface DataFile {
  id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  row_count: number;
  column_count: number;
  status: string;
  uploaded_at: string;
}

interface DataFilesTabProps {
  projectId: string;
  onPreview: (fileId: string) => void;
  onDownload: (fileId: string, fileName: string) => void;
}

const DataFilesTab: React.FC<DataFilesTabProps> = ({
  projectId,
  onPreview,
  onDownload,
}) => {
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataFiles();
  }, [projectId]);

  const loadDataFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/data-files`);
      if (!response.ok) throw new Error('加載數據文件失敗');
      const data = await response.json();
      setDataFiles(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加載失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <IconButton onClick={loadDataFiles} size="small">
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  if (dataFiles.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography color="text.secondary">沒有數據文件</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary">
          共 {dataFiles.length} 個文件
        </Typography>
        <IconButton onClick={loadDataFiles} size="small">
          <RefreshIcon />
        </IconButton>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {dataFiles.map((file) => (
          <ListItem
            key={file.id}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon>
              <DescriptionIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {file.original_name}
                </Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={formatFileSize(file.size)}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                  />
                  <Chip
                    label={`${file.row_count?.toLocaleString() || 0} 行`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                  />
                  <Chip
                    label={`${file.column_count || 0} 列`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                  />
                </Box>
              }
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="預覽">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => onPreview(file.id)}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="下載">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => onDownload(file.id, file.original_name)}
                >
                  <GetAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default DataFilesTab;
