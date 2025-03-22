import React from 'react';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  CloudDone as CloudDoneIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { SystemMetrics } from '../../../types/metrics';

interface AIMetricsPanelProps {
  metrics: SystemMetrics | null;
  aiProvider: string;
  aiModel: string;
}

const AIMetricsPanel: React.FC<AIMetricsPanelProps> = ({ metrics, aiProvider, aiModel }) => {
  const theme = useTheme();
  
  // Card animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    },
    hover: {
      scale: 1.03,
      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
      transition: { duration: 0.3 }
    }
  };

  // Icon animation variants
  const iconVariants = {
    initial: { scale: 0, rotate: -45 },
    animate: { 
      scale: 1, 
      rotate: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 }
    },
    pulse: {
      scale: [1, 1.2, 1],
      transition: { duration: 1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }
    }
  };

  return (
    <Grid container spacing={3}>
      {/* AI Provider Card */}
      <Grid item xs={12} md={6}>
        <motion.div
          initial="initial"
          animate="animate"
          whileHover="hover"
          variants={cardVariants}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              background: theme.palette.background.paper
            }}
          >
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                borderBottom: `1px solid ${theme.palette.divider}`
              }}
            >
              <motion.div
                initial="initial"
                animate="animate"
                variants={iconVariants}
                whileHover="pulse"
              >
                <CloudDoneIcon sx={{ mr: 1, color: theme.palette.info.main, fontSize: 24 }} />
              </motion.div>
              <Typography variant="h6" fontWeight="medium">AI Provider</Typography>
            </Box>
            <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {aiProvider}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" mt={1}>
                Model: {aiModel}
              </Typography>
            </Box>
            <Box mt={2} textAlign="center">
              <Chip 
                label="ACTIVE" 
                color="success" 
                sx={{ fontWeight: 'bold', px: 2 }}
              />
            </Box>
          </Paper>
        </motion.div>
      </Grid>

      {/* Response Time Card */}
      <Grid item xs={12} md={6}>
        <motion.div
          initial="initial"
          animate="animate"
          whileHover="hover"
          variants={cardVariants}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                borderBottom: `1px solid ${theme.palette.divider}`
              }}
            >
              <motion.div
                initial="initial"
                animate="animate"
                variants={iconVariants}
                whileHover="pulse"
              >
                <SpeedIcon sx={{ mr: 1, color: theme.palette.warning.main, fontSize: 24 }} />
              </motion.div>
              <Typography variant="h6" fontWeight="medium">Response Time</Typography>
            </Box>
            <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {metrics?.averageResponseTime ? `${metrics.averageResponseTime.toFixed(0)}ms` : '245ms'}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" mt={1}>
                Avg. Response Time
              </Typography>
            </Box>
            <Box mt={2} textAlign="center">
              <Chip 
                label="OPTIMIZED" 
                color="warning" 
                sx={{ fontWeight: 'bold', px: 2 }}
              />
            </Box>
          </Paper>
        </motion.div>
      </Grid>
    </Grid>
  );
};

export default AIMetricsPanel;