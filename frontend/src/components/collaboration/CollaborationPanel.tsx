import React, { useState, useEffect } from 'react';
import {
  Paper,
  Tabs,
  Tab,
  Box,
  Badge,
  Fab,
  IconButton,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  People as PeopleIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useCollaboration } from '../../contexts/CollaborationContext';
import ActiveUsersList from './ActiveUsersList';
import VersionHistoryViewer from './VersionHistoryViewer';
import ConflictResolutionDialog from './ConflictResolutionDialog';
import DataFilesTab from './DataFilesTab';
import { User } from '../../types';

interface CollaborationPanelProps {
  projectId: string;
  currentUserId: string;
  users: Record<string, User>;
  collapsed?: boolean;
  onToggle?: () => void;
  onPreviewFile?: (fileId: string) => void;
  onDownloadFile?: (fileId: string, fileName: string) => void;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  projectId,
  currentUserId,
  users,
  collapsed = false,
  onToggle,
  onPreviewFile,
  onDownloadFile,
}) => {
  const { state } = useCollaboration();
  const [activeTab, setActiveTab] = useState(0);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { pendingConflicts, connectionError } = state;

  useEffect(() => {
    // 監聽新衝突
    if (pendingConflicts.length > 0) {
      const latestConflict = pendingConflicts[pendingConflicts.length - 1];
      setSnackbarMessage(`檢測到數據衝突: ${latestConflict.fieldPath}`);
      setSnackbarOpen(true);
    }
  }, [pendingConflicts]);

  useEffect(() => {
    // 監聽連接錯誤
    if (connectionError) {
      setSnackbarMessage(`連接錯誤: ${connectionError}`);
      setSnackbarOpen(true);
    }
  }, [connectionError]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleConflictClick = (conflict: any) => {
    setSelectedConflict(conflict);
    setConflictDialogOpen(true);
  };

  const handleConflictResolve = async (
    conflictId: string,
    strategy: 'accept-mine' | 'accept-theirs' | 'merge' | 'custom',
    customValue?: any
  ) => {
    try {
      // 這裡應該調用API解決衝突
      console.log('解決衝突:', { conflictId, strategy, customValue });

      setSnackbarMessage('衝突已解決');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('解決衝突失敗:', error);
      setSnackbarMessage('解決衝突失敗');
      setSnackbarOpen(true);
    }
  };

  const handleVersionRestore = async (versionId: string) => {
    try {
      // 這裡應該調用API恢復版本
      console.log('恢復版本:', versionId);

      setSnackbarMessage('版本已恢復');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('恢復版本失敗:', error);
      setSnackbarMessage('恢復版本失敗');
      setSnackbarOpen(true);
    }
  };

  const handleVersionSwitch = async (versionId: string) => {
    try {
      // 這裡應該調用API切換版本
      console.log('切換版本:', versionId);

      setSnackbarMessage('版本已切換');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('切換版本失敗:', error);
      setSnackbarMessage('切換版本失敗');
      setSnackbarOpen(true);
    }
  };

  if (collapsed) {
    return (
      <Box
        sx={{
          position: 'fixed',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1200,
        }}
      >
        <Fab
          color="primary"
          size="medium"
          onClick={onToggle}
          sx={{ mb: 1 }}
        >
          <Badge badgeContent={state.activeUsers.length} color="secondary">
            <PeopleIcon />
          </Badge>
        </Fab>

        {pendingConflicts.length > 0 && (
          <Fab
            color="warning"
            size="small"
            onClick={() => {
              setActiveTab(2);
              onToggle?.();
            }}
          >
            <Badge badgeContent={pendingConflicts.length} color="error">
              <WarningIcon />
            </Badge>
          </Fab>
        )}
      </Box>
    );
  }

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          right: 16,
          top: 16,
          bottom: 16,
          width: 400,
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}>
          <Typography variant="h6">協作控制台</Typography>
          <IconButton onClick={onToggle} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {connectionError && (
          <Alert severity="error" sx={{ m: 1 }}>
            {connectionError}
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={
              <Badge badgeContent={state.activeUsers.length} color="secondary">
                <PeopleIcon />
              </Badge>
            }
            label="在線用戶"
          />
          <Tab
            icon={<DescriptionIcon />}
            label="數據文件"
          />
          <Tab
            icon={<HistoryIcon />}
            label="版本歷史"
          />
          {pendingConflicts.length > 0 && (
            <Tab
              icon={
                <Badge badgeContent={pendingConflicts.length} color="error">
                  <WarningIcon />
                </Badge>
              }
              label="衝突"
              sx={{ color: 'warning.main' }}
            />
          )}
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 0 && (
            <Box sx={{ p: 1, height: '100%' }}>
              <ActiveUsersList collapsed={false} />
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ height: '100%', overflow: 'hidden' }}>
              <DataFilesTab
                projectId={projectId}
                onPreview={(fileId) => onPreviewFile?.(fileId)}
                onDownload={(fileId, fileName) => onDownloadFile?.(fileId, fileName)}
              />
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
              <VersionHistoryViewer
                projectId={projectId}
                currentUserId={currentUserId}
                onVersionRestore={handleVersionRestore}
                onVersionSwitch={handleVersionSwitch}
              />
            </Box>
          )}

          {activeTab === 3 && pendingConflicts.length > 0 && (
            <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                待解決衝突 ({pendingConflicts.length})
              </Typography>

              {pendingConflicts.map((conflict) => (
                <Paper
                  key={conflict.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleConflictClick(conflict)}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    字段衝突: {conflict.fieldPath}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {conflict.conflictingValues?.length || 0} 個衝突值
                  </Typography>
                  <Typography variant="caption" color="warning.main">
                    點擊解決
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      <ConflictResolutionDialog
        open={conflictDialogOpen}
        conflict={selectedConflict}
        users={users}
        currentUserId={currentUserId}
        onResolve={handleConflictResolve}
        onClose={() => {
          setConflictDialogOpen(false);
          setSelectedConflict(null);
        }}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSnackbarOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
};

export default CollaborationPanel;