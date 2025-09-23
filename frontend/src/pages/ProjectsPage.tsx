import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Share,
  Folder,
} from '@mui/icons-material';
import { Project } from '../types';
import projectService from '../services/projectService';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // 載入專案列表
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入專案列表失敗');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, projectId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(projectId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleNewProject = () => {
    // TODO: 實作新增專案功能
    console.log('新增專案');
  };

  const handleEditProject = () => {
    // TODO: 實作編輯專案功能
    console.log('編輯專案:', selectedProject);
    handleMenuClose();
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      await projectService.deleteProject(selectedProject);
      await loadProjects(); // 重新載入列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除專案失敗');
      console.error('Failed to delete project:', err);
    }
    handleMenuClose();
  };

  const handleShareProject = () => {
    // TODO: 實作分享專案功能
    console.log('分享專案:', selectedProject);
    handleMenuClose();
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          專案管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleNewProject}
        >
          新增專案
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Alert severity="info">
          暫無專案，請點擊「新增專案」按鈕創建您的第一個專案。
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Folder sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="h2">
                        {project.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, project.id)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {project.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                    數據文件: {project.dataFiles.length}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                    圖表: {project.charts.length}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={`${project.collaborators.length} 位協作者`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                  更新時間: {new Date(project.updatedAt).toLocaleDateString('zh-TW')}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => handleViewProject(project.id)}
                  >
                  開啟專案
                  </Button>
                  <Button
                    size="small"
                    color="secondary"
                    onClick={() => handleViewProject(project.id)}
                  >
                  查看詳情
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditProject}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          編輯
        </MenuItem>
        <MenuItem onClick={handleShareProject}>
          <Share sx={{ mr: 1 }} fontSize="small" />
          分享
        </MenuItem>
        <MenuItem onClick={handleDeleteProject} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          刪除
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ProjectsPage;