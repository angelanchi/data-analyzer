import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  AnalysisJobRequest,
  AnalysisSummary,
  AnalysisJobStatusResponse,
  AnalysisJobStatus
} from '../../types';
import { createAnalysisJob, getAnalysisJobStatus } from '../../services/api';

const pollIntervalMs = 2000;

const defaultPayload: AnalysisJobRequest = {
  files: {
    Batch1: '../test_data.csv',
    Batch2: '../test_data_batch2.csv'
  },
  params: ['Voltage', 'Current'],
  targetParam: 'Voltage',
  pointIds: ['P001', 'P002'],
  groupBy: ['Operator'],
  flattenParams: ['Equipment_ID', 'Batch_No']
};

const formatSummary = (summary: AnalysisSummary) => ({
  commonColumns: summary.commonColumns.join(', ') || 'N/A',
  artifacts: [
    { label: 'Excel', value: summary.excelPath },
    { label: 'PDF', value: summary.pdfPath },
    { label: 'Lineplot', value: summary.linePlotPath }
  ].filter((artifact) => artifact.value)
});

const statusLabel: Record<AnalysisJobStatus, string> = {
  pending: '排程中，請稍候…',
  running: '分析進行中…',
  succeeded: '分析完成',
  failed: '分析流程失敗'
};

const AnalysisPipelineRunner: React.FC = () => {
  const [payloadText, setPayloadText] = useState(() => JSON.stringify(defaultPayload, null, 2));
  const [isRunning, setIsRunning] = useState(false);
  const [jobStatus, setJobStatus] = useState<AnalysisJobStatusResponse | null>(null);
  const [resultSummary, setResultSummary] = useState<AnalysisSummary | null>(null);
  const [標準輸出, setStdout] = useState('');
  const [標準錯誤, setStderr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => clearPolling(), []);

  const formattedSummary = useMemo(() => {
    if (!resultSummary) {
      return null;
    }
    return formatSummary(resultSummary);
  }, [resultSummary]);

  const startPolling = (jobId: string) => {
    clearPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await getAnalysisJobStatus(jobId);
        setJobStatus(status);
        if (status.status === 'succeeded') {
          setResultSummary(status.result?.summary ?? null);
          setStdout(status.result?.stdout ?? '');
          setStderr(status.result?.stderr ?? '');
          clearPolling();
          setIsRunning(false);
        } else if (status.status === 'failed') {
          setError(status.error ?? '分析流程失敗');
          setStdout(status.result?.stdout ?? '');
          setStderr(status.result?.stderr ?? '');
          clearPolling();
          setIsRunning(false);
        }
      } catch (pollError) {
        clearPolling();
        setIsRunning(false);
        setError(pollError instanceof Error ? pollError.message : '輪詢分析狀態時發生錯誤');
      }
    }, pollIntervalMs);
  };

  const handleRun = async () => {
    setError(null);
    setResultSummary(null);
    setStdout('');
    setStderr('');
    setJobStatus(null);
    clearPolling();
    setIsRunning(true);

    try {
      const parsed = JSON.parse(payloadText) as AnalysisJobRequest;
      const created = await createAnalysisJob(parsed);
      setJobStatus(created);
      startPolling(created.jobId);
    } catch (err) {
      clearPolling();
      if (err instanceof SyntaxError) {
        setError('JSON payload 格式不正確，請確認後再試。');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('執行分析時發生未知錯誤。');
      }
      setIsRunning(false);
    }
  };

  const currentStatus = jobStatus?.status ?? null;
  const severity = currentStatus === 'failed' ? 'error' : currentStatus === 'succeeded' ? 'success' : 'info';

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant='h6'>Python 流程</Typography>
        <Typography variant='body2' color='text.secondary'>
          編輯 JSON 工作定義並直接呼叫後端 /api/analysis/run 觸發 Python 批次分析。
        </Typography>
        {error && <Alert severity='error'>{error}</Alert>}
        <TextField
          multiline
          minRows={12}
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
          label='分析工作設定'
          placeholder='在此貼上分析工作 JSON 設定'
          fullWidth
        />
        <Box>
          <Button variant='contained' onClick={handleRun} disabled={isRunning}>
            {isRunning ? '執行中…' : '開始分析'}
          </Button>
        </Box>
        {jobStatus && (
          <Stack spacing={2}>
            <Alert severity={severity}>{statusLabel[jobStatus.status]}</Alert>
            {isRunning && <CircularProgress size={24} />}
            {formattedSummary && (
              <Box>
                <Typography variant='subtitle1'>產出項目</Typography>
                <List dense>
                  {formattedSummary.artifacts.map((artifact) => (
                    <ListItem key={artifact.label}>
                      <ListItemText primary={artifact.label} secondary={artifact.value} />
                    </ListItem>
                  ))}
                </List>
                <Typography variant='subtitle1'>共用欄位</Typography>
                <Typography variant='body2'>{formattedSummary.commonColumns}</Typography>
              </Box>
            )}
            {(標準輸出 || 標準錯誤) && <Divider />}
            {(標準輸出 || 標準錯誤) && (
              <>
                <Typography variant='subtitle1'>標準輸出</Typography>
                <Box component='pre' sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                  {標準輸出 || '（無輸出）'}
                </Box>
                {標準錯誤 && (
                  <>
                    <Typography variant='subtitle1'>標準錯誤</Typography>
                    <Box component='pre' sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      {標準錯誤}
                    </Box>
                  </>
                )}
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default AnalysisPipelineRunner;
