import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import type { PerformanceInsight, SecurityInsight, UsageInsight } from '../types/metrics';

interface ErrorAnalysisProps {
  title: string;
  data: PerformanceInsight | SecurityInsight | UsageInsight | null;
  icon: React.ReactNode;
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
    },
  },
};

export const ErrorAnalysis: React.FC<ErrorAnalysisProps> = ({ title, data, icon }) => {
  const theme = useTheme();

  if (!data) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          height: '100%',
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Typography color="text.secondary">No data available</Typography>
      </Paper>
    );
  }

  const renderContent = () => {
    if (!data) {
      return <Typography color="text.secondary">No data available</Typography>;
    }
    
    if ('cpu' in data) {
      // Performance Insights
      return (
        <>
          <ListItem>
            <ListItemText
              primary="CPU Usage"
              secondary={`${data.cpu.current}% (${data.cpu.trend})`}
            />
            {data.cpu.recommendation && (
              <Chip
                size="small"
                label="Recommendation"
                color="primary"
                sx={{ ml: 1 }}
                title={data.cpu.recommendation}
              />
            )}
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Memory Usage"
              secondary={`${data.memory.current}% (${data.memory.trend})`}
            />
            {data.memory.recommendation && (
              <Chip
                size="small"
                label="Recommendation"
                color="primary"
                sx={{ ml: 1 }}
                title={data.memory.recommendation}
              />
            )}
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Database Connections"
              secondary={`${data.database.connections} (${data.database.trend})`}
            />
            {data.database.recommendation && (
              <Chip
                size="small"
                label="Recommendation"
                color="primary"
                sx={{ ml: 1 }}
                title={data.database.recommendation}
              />
            )}
          </ListItem>
        </>
      );
    } else if ('failedLogins' in data) {
      // Security Insights
      return (
        <>
          <ListItem>
            <ListItemText
              primary="Failed Logins"
              secondary={data.failedLogins}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Suspicious Activities"
              secondary={data.suspiciousActivities}
            />
          </ListItem>
          {data.vulnerabilities && data.vulnerabilities.map((vuln, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={vuln.type}
                secondary={vuln.description}
              />
              <Chip
                size="small"
                label={vuln.severity}
                color={
                  vuln.severity === 'high' ? 'error' :
                  vuln.severity === 'medium' ? 'warning' : 'info'
                }
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </>
      );
    } else if (data.daily && typeof data.daily === 'object') {
      // Usage Insights
      return (
        <>
          <ListItem>
            <ListItemText
              primary="Daily Stats"
              secondary={`${data.daily.requests || 0} requests • ${data.daily.uniqueUsers || 0} users • Peak hour: ${data.daily.peakHour || 'N/A'}`}
            />
          </ListItem>
          {data.weekly && (
            <ListItem>
              <ListItemText
                primary="Weekly Overview"
                secondary={`Trend: ${data.weekly.trend || 'N/A'} • Average Load: ${data.weekly.averageLoad || 0}`}
              />
            </ListItem>
          )}
          {data.monthly && (
            <ListItem>
              <ListItemText
                primary="Monthly Growth"
                secondary={`${data.monthly.growth || 0}% growth • ${data.monthly.forecast || 0}% forecast`}
              />
            </ListItem>
          )}
        </>
      );
    } else {
      return <Typography color="text.secondary">Unknown data format</Typography>;
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          height: '100%',
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6">{title}</Typography>
        </Box>
        <List dense>
          {renderContent()}
        </List>
      </Paper>
    </motion.div>
  );
}; 