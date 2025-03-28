import React, { useState } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  barWidth?: number;
  barGap?: number;
  showValues?: boolean;
  showLabels?: boolean;
  animationDuration?: number;
  containerStyle?: React.CSSProperties;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 600,
  height = 300,
  title,
  subtitle,
  barWidth = 30,
  barGap = 10,
  showValues = true,
  showLabels = true,
  animationDuration = 0.8,
  containerStyle,
}) => {
  const theme = useTheme();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  
  // Calculate chart dimensions
  const margin = { top: 30, right: 30, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Calculate the maximum value to determine the vertical scale
  const maxValue = Math.max(...data.map(d => d.value));
  // Add a buffer of 10% for better visualization
  const scaledMaxValue = maxValue * 1.1;
  
  // Calculate bar positions
  const totalBarWidth = barWidth + barGap;
  const barsWidth = totalBarWidth * data.length;
  const xOffset = (innerWidth - barsWidth) / 2 + margin.left;

  // Calculate value scale (pixels per unit)
  const valueScale = innerHeight / scaledMaxValue;
  
  return (
    <Box 
      sx={{ 
        width, 
        height, 
        position: 'relative',
        ...containerStyle,
      }}
    >
      {/* Title area */}
      {title && (
        <Typography 
          variant="h6" 
          sx={{ 
            textAlign: 'center', 
            mb: subtitle ? 0.5 : 2,
            fontWeight: 'medium'
          }}
        >
          {title}
        </Typography>
      )}
      
      {subtitle && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            textAlign: 'center', 
            mb: 2 
          }}
        >
          {subtitle}
        </Typography>
      )}
      
      {/* SVG Chart */}
      <svg width={width} height={height}>
        {/* Y-axis and grid lines */}
        <line 
          x1={margin.left} 
          y1={margin.top} 
          x2={margin.left} 
          y2={height - margin.bottom}
          stroke={theme.palette.divider}
          strokeWidth={1}
        />
        
        {/* Y-axis ticks and labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const value = (scaledMaxValue / 4) * (4 - i);
          const y = margin.top + (innerHeight / 4) * i;
          return (
            <g key={`y-tick-${i}`}>
              <line 
                x1={margin.left - 5} 
                y1={y} 
                x2={margin.left} 
                y2={y}
                stroke={theme.palette.text.secondary}
                strokeWidth={1}
              />
              <line 
                x1={margin.left} 
                y1={y} 
                x2={width - margin.right} 
                y2={y}
                stroke={alpha(theme.palette.divider, 0.5)}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <text 
                x={margin.left - 10} 
                y={y + 5}
                textAnchor="end"
                fontSize={12}
                fill={theme.palette.text.secondary}
              >
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis */}
        <line 
          x1={margin.left} 
          y1={height - margin.bottom} 
          x2={width - margin.right} 
          y2={height - margin.bottom}
          stroke={theme.palette.divider}
          strokeWidth={1}
        />
        
        {/* Bars */}
        {data.map((item, index) => {
          const barX = xOffset + (barWidth + barGap) * index;
          const barHeight = item.value * valueScale;
          const barY = height - margin.bottom - barHeight;
          
          // Determine bar color - use item color, or theme colors if not provided
          const barColor = item.color || 
            [
              theme.palette.primary.main,
              theme.palette.secondary.main,
              theme.palette.success.main,
              theme.palette.info.main,
            ][index % 4];
          
          return (
            <g key={`bar-${index}`}>
              {/* Bar */}
              <motion.rect
                x={barX}
                width={barWidth}
                // Animate from bottom up
                initial={{ y: height - margin.bottom, height: 0 }}
                animate={{ y: barY, height: barHeight }}
                transition={{ 
                  duration: animationDuration, 
                  delay: 0.1 * index,
                  ease: "easeOut" 
                }}
                fill={barColor}
                rx={2}
                opacity={hoveredBar === null || hoveredBar === index ? 1 : 0.5}
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Bar labels */}
              {showLabels && (
                <text
                  x={barX + barWidth / 2}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                  fontSize={12}
                  fill={theme.palette.text.secondary}
                >
                  {item.label.length > 8 ? `${item.label.substring(0, 8)}...` : item.label}
                </text>
              )}
              
              {/* Bar values */}
              {showValues && (
                <motion.text
                  x={barX + barWidth / 2}
                  y={barY - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight="bold"
                  fill={theme.palette.text.primary}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredBar === index || hoveredBar === null ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {item.value.toFixed(0)}
                </motion.text>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

export default BarChart; 