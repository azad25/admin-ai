import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
} from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';
import { SecurityInsight } from '../../../types/metrics';

// Define additional types for SecurityInsight
interface SecurityAlert {
  severity: 'error' | 'warning' | 'info' | 'success';
  message: string;
}

// Extend the SecurityInsight interface to include expected properties
interface ExtendedSecurityInsight extends SecurityInsight {
  summary: string;
  alerts?: SecurityAlert[];
}

interface SecurityInsightsPanelProps {
  securityInsights: SecurityInsight | null;
}

const SecurityInsightsPanel: React.FC<SecurityInsightsPanelProps> = ({ securityInsights }) => {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.default }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SecurityIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Security Insights</Typography>
      </Box>
      {securityInsights ? (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {(securityInsights as ExtendedSecurityInsight).summary || 'No summary available'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            {(securityInsights as ExtendedSecurityInsight).alerts 
              ? (securityInsights as ExtendedSecurityInsight).alerts!.map((alert, index) => (
                <Alert severity={alert.severity} sx={{ mb: 1 }} key={index}>
                  {alert.message}
                </Alert>
              )) 
              : null}
          </Box>
        </Box>
      ) : (
        <Typography color="text.secondary">No security insights available</Typography>
      )}
    </Paper>
  );
};

export default SecurityInsightsPanel;