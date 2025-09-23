import React, { useState, useCallback } from 'react';
import { useApiError } from '../../hooks/useApiError';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../../services/api';
import { FileUpload as FileUploadState, DataPoint } from '../../types';

interface FileUploadProps {
  onUploadComplete: (fileId: string, data: DataPoint[], originalName: string) => void;
  onError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError }) => {
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const { withErrorHandling } = useApiError();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: FileUploadState[] = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    for (let i = 0; i < newUploads.length; i += 1) {
      const upload = newUploads[i];
      const uploadIndex = uploads.length + i;
      let progressInterval: NodeJS.Timeout | undefined;

      try {
        setUploads((prev) =>
          prev.map((item, index) =>
            index === uploadIndex
              ? {
                ...item,
                status: 'uploading',
                progress: 0,
              }
              : item
          )
        );

        progressInterval = setInterval(() => {
          setUploads((prev) =>
            prev.map((item, index) => {
              if (index === uploadIndex && item.progress < 90) {
                return { ...item, progress: item.progress + 10 };
              }
              return item;
            })
          );
        }, 200);

        const response = await withErrorHandling(() => uploadFile(upload.file));
        clearInterval(progressInterval);

        if (response && response.success && response.data) {
          setUploads((prev) =>
            prev.map((item, index) =>
              index === uploadIndex
                ? {
                  ...item,
                  status: 'completed',
                  progress: 100,
                  result: {
                    rowCount: response.data!.data.length,
                    columnCount: Object.keys(response.data!.data[0] || {}).length,
                  },
                }
                : item
            )
          );

          onUploadComplete(response.data.fileId, response.data.data, upload.file.name);
        } else {
          const errorMessage = response?.error || '上傳失敗或已取消';
          throw new Error(errorMessage);
        }
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        const errorMessage = error instanceof Error ? error.message : '上傳失敗';

        setUploads((prev) =>
          prev.map((item, index) =>
            index === uploadIndex
              ? {
                ...item,
                status: 'error',
                progress: 0,
                error: errorMessage,
              }
              : item
          )
        );

        onError(errorMessage);
      }
    }
  }, [onUploadComplete, onError, uploads.length, withErrorHandling]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const renderStatusIcon = (status: FileUploadState['status']) => {
    switch (status) {
    case 'completed':
      return <CheckCircle color="success" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'uploading':
      return <CloudUpload color="primary" />;
    default:
      return <InsertDriveFile />;
    }
  };

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          mb: 3,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? '放開檔案到此處' : '將檔案拖曳到此處或點擊瀏覽'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          支援大小最多 50 MB 的 CSV 與 Excel 檔案。
        </Typography>
      </Paper>

      {uploads.length > 0 && (
        <Paper sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            上傳清單
          </Typography>
          <List>
            {uploads.map((upload, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>{renderStatusIcon(upload.status)}</ListItemIcon>
                <ListItemText
                  primary={upload.file.name}
                  secondary={
                    <React.Fragment>
                      <Typography variant="caption" color="text.secondary" component="span" display="block">
                        {(upload.file.size / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                      {upload.status === 'uploading' && (
                        <Typography variant="caption" color="primary.main" component="span" display="block" sx={{ mt: 0.5 }}>
                          上傳中… {upload.progress}%
                        </Typography>
                      )}
                      {upload.error && (
                        <Typography variant="caption" color="error.main" component="span" display="block" sx={{ mt: 0.5 }}>
                          錯誤：{upload.error}
                        </Typography>
                      )}
                      {upload.result && (
                        <Typography variant="caption" color="success.main" component="span" display="block">
                          已處理：{upload.result.rowCount} 筆資料，{upload.result.columnCount} 個欄位
                        </Typography>
                      )}
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="刪除"
                    onClick={() => removeUpload(index)}
                    disabled={upload.status === 'uploading'}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default FileUpload;
