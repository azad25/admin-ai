import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { Speed as SpeedIcon } from '@mui/icons-material';
import { PerformanceInsight } from '../../../types/metrics';
import { ErrorAnalysis } from '../../ErrorAnalysis';

interface PerformanceInsightsPanelProps {
  performanceInsights: PerformanceInsight | null;
}

const PerformanceInsightsPanel: React.FC<PerformanceInsightsPanelProps> = ({ performanceInsights }) => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <ErrorAnalysis 
        title="Performance Insights" 
        data={performanceInsights} 
        icon={<SpeedIcon />} 
      />
    </motion.div>
  );
};

export default PerformanceInsightsPanel;