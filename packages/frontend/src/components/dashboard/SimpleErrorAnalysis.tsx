import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

// Simple error distribution item type
export interface SimpleErrorItem {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

// Props interface
export interface SimpleErrorAnalysisProps {
  title: string;
  data: SimpleErrorItem[] | null;
  icon: React.ReactNode;
}

/**
 * SimpleErrorAnalysis Component
 * A simplified version to avoid complex union type errors
 */
export const SimpleErrorAnalysis = (props: SimpleErrorAnalysisProps) => {
  const { title, data, icon } = props;
  
  // Calculate total errors
  let totalErrors = 0;
  if (data) {
    data.forEach(error => {
      totalErrors += error.count;
    });
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
