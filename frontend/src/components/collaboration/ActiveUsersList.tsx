import React from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Badge,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useCollaboration } from '../../contexts/CollaborationContext';

interface ActiveUsersListProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  collapsed = false,
  onToggle
}) => {
  const { state } = useCollaboration();
  const { activeUsers, isConnected } = state;

  const getUserInitials = (displayName: string): string => {
    return displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (user: any): 'success' | 'warning' | 'error' => {
    if (!user.lastActive) return 'error';

    const lastActive = new Date(user.lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);

    if (diffMinutes < 2) return 'success'; // 活躍中
    if (diffMinutes < 10) return 'warning'; // 暫時離線
    return 'error'; // 離線
  };

  const formatLastActive = (lastActive: string): string => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffMinutes < 1) return '剛剛';
    if (diffMinutes < 60) return `${Math.floor(diffMinutes)}分鐘前`;
    if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}小時前`;
    return `${Math.floor(diffMinutes / (24 * 60))}天前`;
  };

  const renderUserCursor = (user: any) => {
    if (!user.cursorPosition) return null;

    return (
      <Tooltip title={`在 ${user.cursorPosition.component} 中`}>
        <CircleIcon
          sx={{
            fontSize: 8,
            color: user.user?.color || '#1976d2',
            ml: 0.5
          }}
        />
      </Tooltip>
    );
  };

  const renderTypingIndicator = (user: any) => {
    if (!user.isTyping?.isTyping) return null;

    return (
      <Chip
        size="small"
        label="正在輸入..."
        color="primary"
        variant="outlined"
        sx={{
          fontSize: '0.7rem',
          height: 18,
          ml: 1,
          animation: 'pulse 1.5s infinite'
        }}
      />
    );
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: collapsed ? 48 : 280,
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        {!collapsed && (
          <Typography variant="subtitle2" fontWeight="bold">
            在線用戶 ({activeUsers.length})
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Badge
            color={isConnected ? 'success' : 'error'}
            variant="dot"
            sx={{ mr: collapsed ? 0 : 1 }}
          >
            <PersonIcon fontSize="small" />
          </Badge>

          {onToggle && (
            <IconButton
              size="small"
              onClick={onToggle}
              sx={{ color: 'inherit', ml: 0.5 }}
            >
              {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      <Collapse in={!collapsed}>
        <List dense sx={{ p: 0 }}>
          {!isConnected && (
            <ListItem>
              <ListItemText
                primary="未連接"
                secondary="嘗試重新連接..."
                primaryTypographyProps={{ color: 'error' }}
              />
            </ListItem>
          )}

          {isConnected && activeUsers.length === 0 && (
            <ListItem>
              <ListItemText
                primary="無其他用戶"
                secondary="你是第一個加入的用戶"
                primaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
          )}

          {activeUsers.map((userSession) => {
            const { user } = userSession;
            const statusColor = getStatusColor(userSession);

            return (
              <ListItem key={userSession.userId} sx={{ py: 0.5 }}>
                <ListItemAvatar>
                  <Badge
                    color={statusColor}
                    variant="dot"
                    overlap="circular"
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: '0.8rem',
                        bgcolor: user.color || '#1976d2',
                      }}
                    >
                      {getUserInitials(user.displayName)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {user.displayName}
                      </Typography>
                      {renderUserCursor(userSession)}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatLastActive(userSession.lastActive)}
                      </Typography>
                      {renderTypingIndicator(userSession)}
                    </Box>
                  }
                />

                {userSession.cursorPosition && (
                  <Tooltip title={`游標位置: ${userSession.cursorPosition.component}`}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: user.color || '#1976d2',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  </Tooltip>
                )}
              </ListItem>
            );
          })}
        </List>
      </Collapse>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Paper>
  );
};

export default ActiveUsersList;