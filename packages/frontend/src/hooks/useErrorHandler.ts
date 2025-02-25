import { useCallback } from 'react';
import { AxiosError } from 'axios';
import { useSnackbar } from '../contexts/SnackbarContext';

interface ApiError {
  status: string;
  message: string;
  errors?: string[];
}

export const useErrorHandler = () => {
  const { showError } = useSnackbar();

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof AxiosError) {
        const apiError = error.response?.data as ApiError;
        if (apiError?.errors) {
          showError(apiError.errors.join('\n'));
        } else if (apiError?.message) {
          showError(apiError.message);
        } else {
          showError('An error occurred while processing your request');
        }
      } else if (error instanceof Error) {
        showError(error.message);
      } else {
        showError('An unexpected error occurred');
      }
    },
    [showError]
  );

  return { handleError };
}; 