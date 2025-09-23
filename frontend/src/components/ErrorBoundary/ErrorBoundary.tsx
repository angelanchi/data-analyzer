import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            p: 3,
          }}
        >
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              出現了一些問題
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              應用程序遇到了意外錯誤，請嘗試重新整理頁面。
            </Typography>

            {this.state.error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  錯誤詳情：
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
                  {this.state.error.message}
                </Typography>
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              sx={{ mr: 2 }}
            >
              重試
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              重新整理頁面
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;