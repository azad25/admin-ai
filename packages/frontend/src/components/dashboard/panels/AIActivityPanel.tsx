import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { Timeline as TimelineIcon } from '@mui/icons-material';
import { AIActivityTimeline, ActivityData } from '../../AIActivityTimeline';

interface AIActivityPanelProps {
  activityData: ActivityData[];
}

const AIActivityPanel: React.FC<AIActivityPanelProps> = ({ activityData }) => {
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
      transition: { duration: 1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <motion.div
            initial="initial"
            animate="animate"
            variants={iconVariants}
            whileHover="pulse"
          >
            <TimelineIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: 28 }} />
          </motion.div>
          <Typography variant="h6">AI Activity Timeline</Typography>
        </Box>
        <AIActivityTimeline data={activityData} />
      </Paper>
    </motion.div>
  );
};

export default AIActivityPanel;