import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Alert,
  Divider,
} from '@mui/material';
import {
  History as HistoryIcon,
  Restore as RestoreIcon,
  Compare as CompareIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ProjectVersion, VersionChange } from '../../types';

interface VersionHistoryViewerProps {
  projectId: string;
  currentUserId: string;
  onVersionRestore?: (versionId: string) => Promise<void>;
  onVersionSwitch?: (versionId: string) => Promise<void>;
}

const VersionHistoryViewer: React.FC<VersionHistoryViewerProps> = ({
  projectId,
  currentUserId,
  onVersionRestore,
  onVersionSwitch,
}) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [versionChanges, setVersionChanges] = useState<VersionChange[]>([]);
  const [compareDialog, setCompareDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedVersionForMenu, setSelectedVersionForMenu] = useState<ProjectVersion | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    try {
      // 這裡應該調用API獲取版本列表
      // const response = await fetch(`/api/projects/${projectId}/versions`);
      // const data = await response.json();
      // setVersions(data);

      // 臨時模擬數據
      const mockVersions: ProjectVersion[] = [
        {
          id: 'v1',
          projectId,
          versionNumber: 'v1.0',
          description: '初始版本',
          snapshotData: '{}',
          createdBy: 'user1',
          createdAt: new Date().toISOString(),
          isCurrent: true,
          tags: ['release'],
        },
        {
          id: 'v2',
          projectId,
          versionNumber: 'v1.1',
          description: '添加圖表功能',
          snapshotData: '{}',
          createdBy: 'user2',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          isCurrent: false,
          tags: ['feature'],
        },
      ];
      setVersions(mockVersions);
    } catch (error) {
      console.error('獲取版本歷史失敗:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const fetchVersionChanges = async (versionId: string) => {
    try {
      // 這裡應該調用API獲取版本變更
      // const response = await fetch(`/api/versions/${versionId}/changes`);
      // const data = await response.json();
      // setVersionChanges(data);

      // 臨時模擬數據
      const mockChanges: VersionChange[] = [
        {
          id: 'c1',
          versionId,
          changeType: 'create',
          fieldPath: 'charts.chart1',
          oldValue: null,
          newValue: { type: 'line', data: [] },
          userId: 'user1',
          timestamp: new Date().toISOString(),
          description: '創建線性圖表',
        },
        {
          id: 'c2',
          versionId,
          changeType: 'update',
          fieldPath: 'data.columns',
          oldValue: ['A', 'B'],
          newValue: ['A', 'B', 'C'],
          userId: 'user2',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          description: '添加新列',
        },
      ];
      setVersionChanges(mockChanges);
    } catch (error) {
      console.error('獲取版本變更失敗:', error);
    }
  };

  const handleVersionClick = async (version: ProjectVersion) => {
    setSelectedVersion(version);
    await fetchVersionChanges(version.id);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, version: ProjectVersion) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedVersionForMenu(version);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVersionForMenu(null);
  };

  const handleRestore = async (version: ProjectVersion) => {
    if (!onVersionRestore) return;

    setLoading(true);
    try {
      await onVersionRestore(version.id);
      await fetchVersions(); // 重新獲取版本列表
    } catch (error) {
      console.error('恢復版本失敗:', error);
    } finally {
      setLoading(false);
    }
    handleMenuClose();
  };

  const handleSwitch = async (version: ProjectVersion) => {
    if (!onVersionSwitch) return;

    setLoading(true);
    try {
      await onVersionSwitch(version.id);
      await fetchVersions(); // 重新獲取版本列表
    } catch (error) {
      console.error('切換版本失敗:', error);
    } finally {
      setLoading(false);
    }
    handleMenuClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
    case 'create': return <AddIcon color="success" />;
    case 'update': return <EditIcon color="primary" />;
    case 'delete': return <DeleteIcon color="error" />;
    default: return <EditIcon />;
    }
  };

  const renderVersionTags = (tags: string[]) => {
    return tags.map((tag) => (
      <Chip
        key={tag}
        label={tag}
        size="small"
        color={tag === 'release' ? 'success' : 'default'}
        sx={{ mr: 0.5 }}
      />
    ));
  };

  const renderValue = (value: any) => {
    if (value === null || value === undefined) {
      return <Typography variant="caption" color="text.secondary">無</Typography>;
    }

    if (typeof value === 'object') {
      return (
        <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
          {JSON.stringify(value, null, 2)}
        </Typography>
      );
    }

    return <Typography variant="caption">{String(value)}</Typography>;
  };

  return (
    <Box sx={{ display: 'flex', height: '600px' }}>
      {/* 版本列表 */}
      <Paper sx={{ width: '400px', mr: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            版本歷史
          </Typography>
        </Box>

        <List sx={{ maxHeight: '520px', overflow: 'auto' }}>
          {versions.map((version) => (
            <ListItem
              key={version.id}
              button
              selected={selectedVersion?.id === version.id}
              onClick={() => handleVersionClick(version)}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">{version.versionNumber}</Typography>
                    {version.isCurrent && (
                      <Chip label="當前" size="small" color="primary" />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2">{version.description}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <ScheduleIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(version.createdAt)}
                      </Typography>
                    </Box>
                    {version.tags && version.tags.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {renderVersionTags(version.tags)}
                      </Box>
                    )}
                  </Box>
                }
              />

              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, version)}
                  disabled={loading}
                >
                  <MoreVertIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* 版本詳情 */}
      <Paper sx={{ flex: 1 }}>
        {selectedVersion ? (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                {selectedVersion.versionNumber} - {selectedVersion.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                創建於 {formatDate(selectedVersion.createdAt)}
              </Typography>
            </Box>

            <Box sx={{ p: 2, maxHeight: '480px', overflow: 'auto' }}>
              <Typography variant="subtitle1" gutterBottom>
                變更歷史 ({versionChanges.length})
              </Typography>

              {versionChanges.length === 0 ? (
                <Alert severity="info">此版本沒有記錄的變更</Alert>
              ) : (
                <Box>
                  {versionChanges.map((change, index) => (
                    <Card key={change.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {getChangeIcon(change.changeType)}
                          <Typography variant="subtitle2" sx={{ ml: 1 }}>
                            {change.description || `${change.changeType} ${change.fieldPath}`}
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          字段: <code>{change.fieldPath}</code>
                        </Typography>

                        <Box sx={{ mt: 1 }}>
                          {change.changeType !== 'create' && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="error">
                                舊值:
                              </Typography>
                              {renderValue(change.oldValue)}
                            </Box>
                          )}

                          {change.changeType !== 'delete' && (
                            <Box>
                              <Typography variant="caption" color="success.main">
                                新值:
                              </Typography>
                              {renderValue(change.newValue)}
                            </Box>
                          )}
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(change.timestamp)}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              選擇一個版本查看詳情
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 操作菜單 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedVersionForMenu && !selectedVersionForMenu.isCurrent && (
          <MenuItem onClick={() => handleSwitch(selectedVersionForMenu)}>
            <RestoreIcon sx={{ mr: 1 }} />
            切換到此版本
          </MenuItem>
        )}

        <MenuItem onClick={() => handleRestore(selectedVersionForMenu!)}>
          <RestoreIcon sx={{ mr: 1 }} />
          恢復此版本
        </MenuItem>

        <MenuItem onClick={() => {
          setCompareDialog(true);
          handleMenuClose();
        }}>
          <CompareIcon sx={{ mr: 1 }} />
          與當前版本比較
        </MenuItem>
      </Menu>

      {/* 比較對話框 */}
      <Dialog
        open={compareDialog}
        onClose={() => setCompareDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>版本比較</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            版本比較功能正在開發中...
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VersionHistoryViewer;