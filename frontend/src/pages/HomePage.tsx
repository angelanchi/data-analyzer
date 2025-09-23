import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CardActions,
} from '@mui/material';
import {
  Analytics,
  Upload,
  BarChart,
  People,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: '數據上傳',
      description: '支援Excel、CSV格式的數據文件上傳',
      icon: <Upload sx={{ fontSize: 40 }} />,
      action: () => navigate('/analysis'),
    },
    {
      title: '圖表生成',
      description: '多種圖表類型，支援自定義配置',
      icon: <BarChart sx={{ fontSize: 40 }} />,
      action: () => navigate('/analysis'),
    },
    {
      title: '數據分析',
      description: '智能數據清理和分析功能',
      icon: <Analytics sx={{ fontSize: 40 }} />,
      action: () => navigate('/analysis'),
    },
    {
      title: '協作功能',
      description: '即時協作，團隊共享分析結果',
      icon: <People sx={{ fontSize: 40 }} />,
      action: () => navigate('/projects'),
    },
  ];

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom>
        歡迎使用數據分析平台
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        專業的數據分析工具，支援多種圖表類型、數據清理和協作功能
      </Typography>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={feature.action} fullWidth>
                  開始使用
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 6, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          快速開始
        </Typography>
        <Typography variant="body1" paragraph>
          1. 上傳您的數據文件（支援Excel和CSV格式）
        </Typography>
        <Typography variant="body1" paragraph>
          2. 選擇適合的圖表類型
        </Typography>
        <Typography variant="body1" paragraph>
          3. 配置數據清理規則
        </Typography>
        <Typography variant="body1" paragraph>
          4. 生成圖表並匯出結果
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/analysis')}
          sx={{ mt: 2 }}
        >
          立即開始分析
        </Button>
      </Box>
    </Box>
  );
};

export default HomePage;