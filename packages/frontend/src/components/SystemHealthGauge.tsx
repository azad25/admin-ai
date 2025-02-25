import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { arc } from 'd3-shape';

interface SystemHealthGaugeProps {
  value: number; // 0 to 100
  status: 'healthy' | 'warning' | 'critical';
  size?: number;
}

const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'healthy':
      return theme.palette.success.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'critical':
      return theme.palette.error.main;
    default:
      return theme.palette.info.main;
  }
};

export const SystemHealthGauge: React.FC<SystemHealthGaugeProps> = ({
  value,
  status,
  size = 200,
}) => {
  const theme = useTheme();
  const statusColor = getStatusColor(status, theme);

  // Create arc generator
  const createArc = arc()
    .innerRadius((size * 0.6) / 2)
    .outerRadius((size * 0.8) / 2)
    .startAngle(-Math.PI / 2)
    .endAngle((Math.PI * (value / 100)) - (Math.PI / 2));

  const backgroundArc = arc()
    .innerRadius((size * 0.6) / 2)
    .outerRadius((size * 0.8) / 2)
    .startAngle(-Math.PI / 2)
    .endAngle(Math.PI * 1.5);

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
      <svg width={size} height={size}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          {/* Background arc */}
          <motion.path
            d={backgroundArc() || ''}
            fill={alpha(theme.palette.text.secondary, 0.1)}
          />

          {/* Value arc */}
          <motion.path
            d={createArc() || ''}
            fill={statusColor}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 1,
              ease: 'easeInOut',
            }}
          />

          {/* Gradient overlay */}
          <defs>
            <radialGradient id="gaugeGradient">
              <stop offset="0%" stopColor={alpha(statusColor, 0.2)} />
              <stop offset="100%" stopColor={alpha(statusColor, 0)} />
            </radialGradient>
          </defs>
          <circle
            cx="0"
            cy="0"
            r={size * 0.4}
            fill="url(#gaugeGradient)"
            opacity={0.5}
          />
        </g>
      </svg>

      {/* Center text */}
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: 0.5,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: statusColor,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {value}%
          </Typography>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: 0.7,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: theme.palette.text.secondary,
              textTransform: 'capitalize',
            }}
          >
            {status}
          </Typography>
        </motion.div>
      </Box>

      {/* Decorative elements */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {[...Array(12)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: 2,
              height: 8,
              backgroundColor: alpha(theme.palette.text.secondary, 0.2),
              transformOrigin: `50% ${size / 2}px`,
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}; 