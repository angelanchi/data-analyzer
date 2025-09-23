import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  Divider,
  TextField,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { DataConflict } from '../../types';

interface ConflictResolutionDialogProps {
  open: boolean;
  conflict: DataConflict | null;
  users: Record<string, { displayName: string; color?: string }>;
  onResolve: (
    conflictId: string,
    strategy: 'accept-mine' | 'accept-theirs' | 'merge' | 'custom',
    customValue?: any
  ) => Promise<void>;
  onClose: () => void;
  currentUserId: string;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  conflict,
  users,
  onResolve,
  onClose,
  currentUserId,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<'accept-mine' | 'accept-theirs' | 'merge' | 'custom'>('accept-mine');
  const [customValue, setCustomValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleResolve = async () => {
    if (!conflict) return;

    setLoading(true);
    try {
      let finalValue = undefined;

      if (selectedStrategy === 'custom') {
        try {
          finalValue = JSON.parse(customValue);
        } catch {
          finalValue = customValue; // 如果不是JSON，就作為字符串處理
        }
      }

      await onResolve(conflict.id, selectedStrategy, finalValue);
      onClose();
    } catch (error) {
      console.error('解決衝突失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (value: any) => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="text.secondary">無值</Typography>;
    }

    if (typeof value === 'object') {
      return (
        <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <Typography variant="body2">{String(value)}</Typography>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-TW');
  };

  const getConflictTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'concurrent-edit': '同時編輯',
      'version-mismatch': '版本不匹配',
      'permission-denied': '權限拒絕',
    };
    return labels[type] || type;
  };

  const getStrategyDescription = (strategy: string) => {
    const descriptions: Record<string, string> = {
      'accept-mine': '保留你的變更，丟棄其他人的變更',
      'accept-theirs': '採用其他人的變更，丟棄你的變更',
      'merge': '嘗試自動合併所有變更',
      'custom': '輸入自定義值',
    };
    return descriptions[strategy] || strategy;
  };

  const myChanges = conflict?.conflictingValues?.filter(cv => cv.userId === currentUserId) || [];
  const otherChanges = conflict?.conflictingValues?.filter(cv => cv.userId !== currentUserId) || [];

  if (!conflict) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        <Typography variant="h6">解決數據衝突</Typography>
        <Chip
          label={getConflictTypeLabel(conflict.conflictType)}
          color="warning"
          size="small"
        />
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          檢測到多個用戶同時修改了相同的數據字段。請選擇如何解決這個衝突。
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            衝突詳情
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            字段路徑: <code>{conflict.fieldPath}</code>
          </Typography>
        </Box>

        {conflict.originalValue !== null && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                原始值
              </Typography>
              {renderValue(conflict.originalValue)}
            </CardContent>
          </Card>
        )}

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          衝突的變更
        </Typography>

        <List>
          {conflict.conflictingValues.map((change, index) => {
            const user = users[change.userId] || { displayName: change.userId };
            const isCurrentUser = change.userId === currentUserId;

            return (
              <ListItem key={index} sx={{ px: 0 }}>
                <Card sx={{ width: '100%', bgcolor: isCurrentUser ? 'primary.50' : 'grey.50' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ListItemAvatar sx={{ minWidth: 0, mr: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: user.color || '#1976d2' }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <Typography variant="subtitle2">
                        {isCurrentUser ? '你' : user.displayName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                        <ScheduleIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(change.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 1 }} />
                    {renderValue(change.value)}
                  </CardContent>
                </Card>
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ mt: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="h6">選擇解決策略</Typography>
            </FormLabel>
            <RadioGroup
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as any)}
            >
              {myChanges.length > 0 && (
                <FormControlLabel
                  value="accept-mine"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">保留我的變更</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getStrategyDescription('accept-mine')}
                      </Typography>
                    </Box>
                  }
                />
              )}

              {otherChanges.length > 0 && (
                <FormControlLabel
                  value="accept-theirs"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">採用其他人的變更</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getStrategyDescription('accept-theirs')}
                      </Typography>
                    </Box>
                  }
                />
              )}

              <FormControlLabel
                value="merge"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">自動合併</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getStrategyDescription('merge')}
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                value="custom"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">自定義值</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getStrategyDescription('custom')}
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {selectedStrategy === 'custom' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="自定義值"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="輸入自定義值（支持JSON格式）"
              sx={{ mt: 2 }}
              helperText="可以輸入JSON格式的數據或純文本"
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleResolve}
          variant="contained"
          color="primary"
          disabled={loading || (selectedStrategy === 'custom' && !customValue.trim())}
        >
          {loading ? '解決中...' : '解決衝突'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionDialog;