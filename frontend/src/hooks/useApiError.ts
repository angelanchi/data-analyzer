import { useCallback, useState } from 'react';

interface ApiErrorState {
  error: string | null;
  isLoading: boolean;
}

export const useApiError = () => {
  const [state, setState] = useState<ApiErrorState>({
    error: null,
    isLoading: false,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const withErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T | undefined> => {
    try {
      setLoading(true);
      clearError();

      const result = await apiCall();
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      setError(errorMessage);

      console.error('API call failed:', err);

      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      return undefined;
    }
  }, [clearError, setError, setLoading]);

  return {
    error: state.error,
    isLoading: state.isLoading,
    clearError,
    setError,
    setLoading,
    withErrorHandling,
  };
};

export default useApiError;