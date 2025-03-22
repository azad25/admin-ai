import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

interface AnimatedMetricsCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  score: number;
  trend: 'up' | 'down' | 'stable';
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const AnimatedMetricsCard: React.FC<AnimatedMetricsCardProps> = ({
  icon,
  title,
  value,
  score,
  trend,
  color
}) => {
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
      transition: { duration: 0.3 }
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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box sx={{ mb: 2 }}>
          {icon}
        </Box>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" color={`${color}.main`} fontWeight="bold">
          {score}%
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {value}
        </Typography>
      </Paper>
    </motion.div>
  );
}; 