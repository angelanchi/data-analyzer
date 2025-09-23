import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
  Alert,
  Box,
  Typography
} from '@mui/material';
import projectService from '../../services/projectService';
import { Project } from '../../types';

interface SaveToProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (projectId: string, configName: string) => Promise<void>;
  analysisData: {
    fileIds: string[];
    selectedMetrics: string[];
    selectedCategoricalMetrics: string[];
    selectedGroups: string[];
    primarySort: string | null;
    secondarySort: string | null;
    columnTypeOverrides: Record<string, 'numeric' | 'string'>;
    chartConfig: any;
    cleaningRules: any[];
    metadata: any;
  };
  currentUserId: string;
}

export const SaveToProjectDialog: React.FC<SaveToProjectDialogProps> = ({
  open,
  onClose,
  onSave,
  analysisData,
  currentUserId
}) => {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDescription, setNewProjectDescription] = useState<string>('');
  const [configName, setConfigName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 生成默認配置名稱
  useEffect(() => {
    if (open) {
      const now = new Date();
      const dateStr = now.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      setConfigName(`分析配置 - ${dateStr}`);
    }
  }, [open]);

  // 加載專案列表
  useEffect(() => {
    if (open && mode === 'existing') {
      loadProjects();
    }
  }, [open, mode]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const allProjects = await projectService.getProjects();
      setProjects(allProjects);
      if (allProjects.length > 0) {
        setSelectedProjectId(allProjects[0].id);
      }
    } catch (err) {
      setError('加載專案列表失敗');
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      let targetProjectId: string;

      // 創建新專案或使用現有專案
      if (mode === 'new') {
        if (!newProjectName.trim()) {
          setError('專案名稱不能為空');
          setLoading(false);
          return;
        }

        const newProject = await projectService.createProject(
          newProjectName,
          newProjectDescription,
          currentUserId
        );
        targetProjectId = newProject.id;
      } else {
        if (!selectedProjectId) {
          setError('請選擇一個專案');
          setLoading(false);
          return;
        }
        targetProjectId = selectedProjectId;
      }

      // 添加數據文件到專案
      console.log('[SaveToProjectDialog] Analysis data:', {
        fileIds: analysisData.fileIds,
        fileCount: analysisData.fileIds?.length || 0
      });

      if (analysisData.fileIds && analysisData.fileIds.length > 0) {
        console.log('[SaveToProjectDialog] Adding files to project:', {
          projectId: targetProjectId,
          fileIds: analysisData.fileIds
        });
        await projectService.addDataFilesToProject(targetProjectId, analysisData.fileIds);
      } else {
        console.warn('[SaveToProjectDialog] No fileIds to add');
      }

      // 保存分析配置
      if (configName.trim()) {
        await projectService.saveAnalysisConfig(targetProjectId, {
          name: configName,
          selectedMetrics: analysisData.selectedMetrics,
          selectedCategoricalMetrics: analysisData.selectedCategoricalMetrics,
          selectedGroups: analysisData.selectedGroups,
          primarySort: analysisData.primarySort,
          secondarySort: analysisData.secondarySort,
          columnTypeOverrides: analysisData.columnTypeOverrides,
          chartConfig: analysisData.chartConfig,
          cleaningRules: analysisData.cleaningRules,
          metadata: analysisData.metadata
        });
      }

      // 調用父組件的回調
      await onSave(targetProjectId, configName);

      // 重置表單並關閉
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('new');
    setSelectedProjectId('');
    setNewProjectName('');
    setNewProjectDescription('');
    setConfigName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>保存到專案</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl component="fieldset" sx={{ mb: 3, mt: 1 }}>
          <FormLabel component="legend">選擇操作</FormLabel>
          <RadioGroup
            value={mode}
            onChange={(e) => setMode(e.target.value as 'new' | 'existing')}
          >
            <FormControlLabel value="new" control={<Radio />} label="創建新專案" />
            <FormControlLabel value="existing" control={<Radio />} label="加入現有專案" />
          </RadioGroup>
        </FormControl>

        {mode === 'new' ? (
          <Box>
            <TextField
              fullWidth
              label="專案名稱"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="專案描述"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
          </Box>
        ) : (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇專案</InputLabel>
            <Select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              label="選擇專案"
              disabled={loadingProjects}
            >
              {loadingProjects ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  加載中...
                </MenuItem>
              ) : projects.length === 0 ? (
                <MenuItem disabled>暫無可用專案</MenuItem>
              ) : (
                projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        )}

        <TextField
          fullWidth
          label="分析配置名稱"
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          helperText="為此次分析配置命名，方便日後識別"
          sx={{ mb: 1 }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          將保存的內容包括：
        </Typography>
        <Typography variant="caption" color="text.secondary" component="ul" sx={{ mt: 0.5, pl: 2 }}>
          <li>原始上傳的數據文件 ({analysisData.fileIds?.length || 0} 個)</li>
          <li>分析指標選擇 ({analysisData.selectedMetrics?.length || 0} 個數值指標, {analysisData.selectedCategoricalMetrics?.length || 0} 個分類指標)</li>
          <li>分組配置 ({analysisData.selectedGroups?.length || 0} 個)</li>
          <li>圖表配置</li>
          <li>數據清理規則</li>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || (mode === 'existing' && !selectedProjectId)}
        >
          {loading ? <CircularProgress size={24} /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveToProjectDialog;
