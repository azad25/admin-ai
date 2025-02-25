import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  IconButton,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface AnimatedMetricsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    rotateX: -15,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
      mass: 0.5,
    },
  },
  hover: {
    scale: 1.05,
    y: -5,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -45 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    rotate: 15,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 10,
    },
  },
};

const valueVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
      delay: 0.2,
    },
  },
};

export const AnimatedMetricsCard: React.FC<AnimatedMetricsCardProps> = ({
  title,
  value,
  unit = '',
  icon,
  color,
  trend,
}) => {
  const theme = useTheme();
  const cardColor = color || theme.palette.primary.main;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      style={{ perspective: 1000 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          background: alpha(cardColor, 0.05),
          border: `1px solid ${alpha(cardColor, 0.1)}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            right: -100,
            top: -100,
            width: 200,
            height: 200,
            background: `radial-gradient(circle, ${alpha(cardColor, 0.1)} 0%, transparent 70%)`,
            borderRadius: '50%',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <motion.div variants={valueVariants}>
              <Typography
                variant="h4"
                sx={{
                  color: cardColor,
                  fontWeight: 600,
                  letterSpacing: -0.5,
                }}
              >
                {value}{unit}
              </Typography>
            </motion.div>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                {trend.isPositive ? (
                  <TrendingUp sx={{ color: theme.palette.success.main, fontSize: '1rem' }} />
                ) : (
                  <TrendingDown sx={{ color: theme.palette.error.main, fontSize: '1rem' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: trend.isPositive
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                  }}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <motion.div variants={iconVariants}>
            <IconButton
              sx={{
                bgcolor: alpha(cardColor, 0.1),
                color: cardColor,
                '&:hover': {
                  bgcolor: alpha(cardColor, 0.2),
                },
              }}
            >
              {icon}
            </IconButton>
          </motion.div>
        </Box>
      </Paper>
    </motion.div>
  );
}; 