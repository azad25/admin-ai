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
import { Psychology as PsychologyIcon } from '@mui/icons-material';
import { SystemHealthGauge } from '../../SystemHealthGauge';

interface AIHealthPanelProps {
  aiScore: number;
  aiStatus: 'healthy' | 'warning' | 'critical';
  aiAnalysis: string;
}

const AIHealthPanel: React.FC<AIHealthPanelProps> = ({ aiScore, aiStatus, aiAnalysis }) => {
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
          alignItems: 'center',
          justifyContent: 'center',
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
            <PsychologyIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: 24 }} />
          </motion.div>
          <Typography variant="h6" fontWeight="medium">AI Core Health</Typography>
        </Box>
        <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <SystemHealthGauge
            value={aiScore}
            status={aiStatus}
          />
        </Box>
        <Box mt={2} textAlign="center">
          <Chip 
            label={aiStatus.toUpperCase()} 
            color={aiStatus === 'healthy' ? 'success' : aiStatus === 'warning' ? 'warning' : 'error'} 
            sx={{ fontWeight: 'bold', px: 2 }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {aiAnalysis}
        </Typography>
      </Paper>
    </motion.div>
  );
};

export default AIHealthPanel;