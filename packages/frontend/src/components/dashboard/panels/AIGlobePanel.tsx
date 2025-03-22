import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { Insights as InsightsIcon } from '@mui/icons-material';
import { AIGlobe } from '../../3d/aiglobe/AIGlobe';

interface AIGlobePanelProps {
  globeData: Array<{
    latitude: number;
    longitude: number;
    intensity: number;
    city?: string;
    country?: string;
  }>;
}

const AIGlobePanel: React.FC<AIGlobePanelProps> = ({ globeData }) => {
  const theme = useTheme();
  
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
      transition: { duration: 1, repeat: Infinity, repeatType: "loop" as const }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.5 }}
    >
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <motion.div
            initial="initial"
            animate="animate"
            variants={iconVariants}
            whileHover="pulse"
          >
            <InsightsIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: 28 }} />
          </motion.div>
          <Typography variant="h6">Global AI Activity</Typography>
        </Box>
        <Box sx={{ height: 400 }}>
          <AIGlobe data={globeData} />
        </Box>
        <Box mt={1} px={2}>
          <Typography variant="caption" color="text.secondary">
            Visualizing real-time AI request distribution across the globe. Each point represents user activity.
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default AIGlobePanel;