import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

interface CircularProgressChartProps {
  value: number; // Value between 0 and 100
  size?: number;  // Size in pixels
  thickness?: number; // Thickness of the progress arc
  color?: string; // Optional color override
  backgroundColor?: string; // Optional background color
  label?: string; // Optional label text
  duration?: number; // Animation duration in seconds
  delay?: number; // Animation delay in seconds
  glowEffect?: boolean; // Add a glow effect
}

export const CircularProgressChart: React.FC<CircularProgressChartProps> = ({
  value,
  size = 200,
  thickness = 12,
  color,
  backgroundColor,
  label,
  duration = 2,
  delay = 0.3,
  glowEffect = true,
}) => {
  const theme = useTheme();
  
  // Normalize value to be between 0 and 100
  const normalizedValue = Math.min(100, Math.max(0, value));
  
  // Calculate dimensions
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;
  
  // Use theme colors if not provided
  const progressColor = color || theme.palette.primary.main;
  const bgColor = backgroundColor || theme.palette.grey[800];
  
  // Filter for glow effect
  const glowFilterId = `glow-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Filter for glow effect */}
      {glowEffect && (
        <svg width="0" height="0">
          <defs>
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="1.5" intercept="0" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" in2="blur" mode="screen" />
            </filter>
          </defs>
        </svg>
      )}
      
      {/* Background circle */}
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={thickness}
          opacity={0.3}
        />
      </svg>
      
      {/* Animated progress circle */}
      <motion.svg
        width={size}
        height={size}
        style={{ 
          position: 'absolute',
          transform: 'rotate(-90deg)',
        }}
      >
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ 
            duration, 
            delay, 
            ease: "easeInOut" 
          }}
          strokeLinecap="round"
          style={{
            filter: glowEffect ? `url(#${glowFilterId})` : 'none',
          }}
        />
      </motion.svg>
      
      {/* Center content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: duration / 2, delay: delay + duration / 2 }}
        >
          <Typography variant="h4" component="div" sx={{ 
            fontWeight: 'bold',
            color: theme.palette.mode === 'dark' ? 'white' : 'inherit',
          }}>
            {Math.round(normalizedValue)}%
          </Typography>
          
          {label && (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              {label}
            </Typography>
          )}
        </motion.div>
      </Box>
    </Box>
  );
};

export default CircularProgressChart; 