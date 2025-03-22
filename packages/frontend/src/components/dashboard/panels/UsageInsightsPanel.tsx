import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { Insights as InsightsIcon } from '@mui/icons-material';
import { UsageInsight } from '../../../types/metrics';
import { ErrorAnalysis } from '../../ErrorAnalysis';

interface UsageInsightsPanelProps {
  usageInsights: UsageInsight | null;
}

const UsageInsightsPanel: React.FC<UsageInsightsPanelProps> = ({ usageInsights }) => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <ErrorAnalysis 
        title="Usage Insights" 
        data={usageInsights} 
        icon={<InsightsIcon />} 
      />
    </motion.div>
  );
};

export default UsageInsightsPanel;