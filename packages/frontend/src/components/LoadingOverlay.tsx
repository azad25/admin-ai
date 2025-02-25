import React from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ open, message }) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
      open={open}
    >
      <CircularProgress color="inherit" />
      {message && (
        <Typography variant="h6" component="div">
          {message}
        </Typography>
      )}
    </Backdrop>
  );
};

interface LoadingContainerProps {
  loading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  message?: string;
}

export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  loading,
  error,
  children,
  message,
}) => {
  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
        p={3}
      >
        <Typography color="error" align="center">
          {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box position="relative">
      <LoadingOverlay open={loading} message={message} />
      {children}
    </Box>
  );
}; 