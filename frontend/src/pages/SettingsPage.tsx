import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Settings,
  Palette,
  Notifications,
  Security,
  Language,
  Storage,
} from '@mui/icons-material';

const SettingsPage: React.FC = () => {
  const settingsSections = [
    {
      title: '外觀設定',
      icon: <Palette sx={{ fontSize: 24 }} />,
      settings: [
        { label: '深色模式', type: 'switch', value: false },
        { label: '主題顏色', type: 'select', value: 'blue', options: ['blue', 'green', 'purple'] },
        { label: '字體大小', type: 'select', value: 'medium', options: ['small', 'medium', 'large'] },
      ]
    },
    {
      title: '通知設定',
      icon: <Notifications sx={{ fontSize: 24 }} />,
      settings: [
        { label: '桌面通知', type: 'switch', value: true },
        { label: '郵件通知', type: 'switch', value: false },
        { label: '協作提醒', type: 'switch', value: true },
      ]
    },
    {
      title: '語言與地區',
      icon: <Language sx={{ fontSize: 24 }} />,
      settings: [
        { label: '介面語言', type: 'select', value: 'zh-TW', options: ['zh-TW', 'en-US', 'ja-JP'] },
        { label: '時區', type: 'select', value: 'Asia/Taipei', options: ['Asia/Taipei', 'UTC', 'America/New_York'] },
        { label: '日期格式', type: 'select', value: 'YYYY-MM-DD', options: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'] },
      ]
    },
    {
      title: '安全設定',
      icon: <Security sx={{ fontSize: 24 }} />,
      settings: [
        { label: '雙重驗證', type: 'switch', value: false },
        { label: '自動登出時間', type: 'select', value: '30', options: ['15', '30', '60', '120'] },
        { label: '密碼複雜度要求', type: 'switch', value: true },
      ]
    },
    {
      title: '數據設定',
      icon: <Storage sx={{ fontSize: 24 }} />,
      settings: [
        { label: '自動儲存', type: 'switch', value: true },
        { label: '儲存間隔（分鐘）', type: 'select', value: '5', options: ['1', '5', '10', '30'] },
        { label: '數據快取', type: 'switch', value: true },
      ]
    },
  ];

  const renderSetting = (setting: any, index: number) => {
    switch (setting.type) {
    case 'switch':
      return (
        <FormControlLabel
          key={index}
          control={<Switch checked={setting.value} />}
          label={setting.label}
          sx={{ mb: 2 }}
        />
      );
    case 'select':
      return (
        <FormControl fullWidth key={index} sx={{ mb: 2 }}>
          <InputLabel>{setting.label}</InputLabel>
          <Select value={setting.value} label={setting.label}>
            {setting.options.map((option: string) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    case 'text':
      return (
        <TextField
          key={index}
          fullWidth
          label={setting.label}
          value={setting.value}
          sx={{ mb: 2 }}
        />
      );
    default:
      return null;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Settings sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          設定
        </Typography>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        自定義您的使用體驗和系統設定
      </Typography>

      <Grid container spacing={3}>
        {settingsSections.map((section, sectionIndex) => (
          <Grid item xs={12} md={6} key={sectionIndex}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: 'primary.main', mr: 1 }}>
                    {section.icon}
                  </Box>
                  <Typography variant="h6" component="h2">
                    {section.title}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {section.settings.map((setting, settingIndex) =>
                  renderSetting(setting, settingIndex)
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" size="large">
          重設為預設值
        </Button>
        <Button variant="contained" size="large">
          儲存設定
        </Button>
      </Box>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'warning.light', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          注意事項
        </Typography>
        <Typography variant="body2">
          • 某些設定變更需要重新整理頁面才會生效
        </Typography>
        <Typography variant="body2">
          • 安全設定變更將會要求重新驗證身份
        </Typography>
        <Typography variant="body2">
          • 所有設定變更都會自動同步到您的其他裝置
        </Typography>
      </Box>
    </Box>
  );
};

export default SettingsPage;