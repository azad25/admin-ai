import * as React from 'react';
import { Paper, Box, Typography } from '@mui/material';

// Simple error distribution item type with readonly properties to avoid mutation
export interface FixedErrorItem {
  readonly type: string;
  readonly count: number;
  readonly trend: 'up' | 'down' | 'stable';
}

// Props interface
export interface FixedErrorAnalysisProps {
  readonly title: string;
  readonly data: ReadonlyArray<FixedErrorItem> | null;
  readonly icon: React.ReactNode;
}

/**
 * FixedErrorAnalysis Component
 * A fixed version to avoid complex union type errors
 */
export function FixedErrorAnalysis(props: FixedErrorAnalysisProps): React.ReactElement {
  const { title, data, icon } = props;
  
  // Calculate total errors
  const totalErrors = React.useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  return React.createElement(
    Paper,
    { sx: { p: 2, height: '100%' } },
    React.createElement(
      Box,
      { sx: { display: 'flex', alignItems: 'center', mb: 2 } },
      icon,
      React.createElement(
        Typography,
        { variant: 'h6', sx: { ml: 1 } },
        title
      )
    ),
    React.createElement(
      Box,
      {},
      React.createElement(
        Typography,
        { variant: 'body2', color: 'text.secondary' },
        data ? `Total errors: ${totalErrors}` : 'No errors found'
      )
    )
  );
}
