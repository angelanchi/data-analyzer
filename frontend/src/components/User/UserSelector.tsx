import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  Avatar,
  Box,
  Typography,
  FormControl,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Visibility as ViewerIcon,
  Circle as OnlineIcon,
} from '@mui/icons-material';
import { useUser } from '../../contexts/UserContext';
import { UserRole } from '../../types';

const UserSelector: React.FC = () => {
  const { currentUser, allUsers, isLoading, error, switchUser } = useUser();
  const [switching, setSwitching] = useState(false);

  const handleUserChange = async (userId: string) => {
    if (userId === currentUser?.id) return;

    try {
      setSwitching(true);
      await switchUser(userId);
    } catch (error) {
      console.error('切換用戶失敗:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
    case 'admin':
      return <AdminIcon sx={{ fontSize: 16, color: 'error.main' }} />;
    case 'viewer':
      return <ViewerIcon sx={{ fontSize: 16, color: 'info.main' }} />;
    default:
      return <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
    case 'admin':
      return '管理員';
    case 'viewer':
      return '檢視者';
    default:
      return '用戶';
    }
  };

  const getRoleColor = (role: UserRole): 'error' | 'info' | 'primary' => {
    switch (role) {
    case 'admin':
      return 'error';
    case 'viewer':
      return 'info';
    default:
      return 'primary';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          載入用戶...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 300 }}>
        {error}
      </Alert>
    );
  }

  if (!currentUser) {
    return (
      <Alert severity="warning" sx={{ maxWidth: 300 }}>
        沒有可用的用戶
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
      {/* 當前用戶顯示 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          {currentUser.avatar || currentUser.displayName.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {currentUser.displayName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getRoleIcon(currentUser.role)}
            <Typography variant="caption" color="text.secondary">
              {getRoleLabel(currentUser.role)}
            </Typography>
            {currentUser.isOnline && (
              <OnlineIcon sx={{ fontSize: 8, color: 'success.main', ml: 0.5 }} />
            )}
          </Box>
        </Box>
      </Box>

      {/* 用戶選擇器 */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          value={currentUser.id}
          onChange={(e) => handleUserChange(e.target.value)}
          disabled={switching}
          displayEmpty
          renderValue={() => '切換用戶'}
          sx={{
            '& .MuiSelect-select': {
              py: 0.5,
              fontSize: '0.875rem'
            }
          }}
        >
          {allUsers.map((user) => (
            <MenuItem
              key={user.id}
              value={user.id}
              disabled={user.id === currentUser.id}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                  {user.avatar || user.displayName.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <ListItemText>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {user.displayName}
                  </Typography>
                  <Chip
                    size="small"
                    label={getRoleLabel(user.role)}
                    color={getRoleColor(user.role)}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                  {user.isOnline && (
                    <Tooltip title="在線">
                      <OnlineIcon sx={{ fontSize: 12, color: 'success.main' }} />
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  @{user.username}
                </Typography>
              </ListItemText>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {switching && (
        <CircularProgress size={16} />
      )}
    </Box>
  );
};

export default UserSelector;