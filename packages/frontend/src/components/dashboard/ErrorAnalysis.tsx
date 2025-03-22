import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

export interface ErrorDistributionItem {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ErrorAnalysisProps {
  title: string;
  data: ErrorDistributionItem[] | null;
  icon: React.ReactNode;
}

export const ErrorAnalysis = (props: ErrorAnalysisProps) => {
  const { title, data, icon } = props;
  let totalErrors = 0;
  if (data) {
    for (const error of data) {
      totalErrors += error.count;
    }
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {data ? `Total errors: ${totalErrors}` : 'No errors found'}
        </Typography>
      </Box>
    </Paper>
  );
}; 