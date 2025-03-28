import React, { useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import * as d3 from 'd3-shape';

interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

interface AreaChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
  color?: string;
  animated?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  smooth?: boolean;
}

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  width = 600,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  title,
  color,
  animated = true,
  showGrid = true,
  showLabels = true,
  smooth = true,
}) => {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isHovering, setIsHovering] = useState<number | null>(null);
  
  // Use theme color if not provided
  const chartColor = color || theme.palette.primary.main;
  
  // Chart dimensions
  const margin = { top: 20, right: 30, bottom: 30, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Calculate x and y scales
  const xScale = useMemo(() => {
    const xValues = data.map((d, i) => typeof d.x === 'number' ? d.x : i);
    const min = Math.min(...xValues.map(x => typeof x === 'number' ? x : 0));
    const max = Math.max(...xValues.map(x => typeof x === 'number' ? x : 0));
    return (x: number | string, i: number) => {
      const xValue = typeof x === 'number' ? x : i;
      return margin.left + (xValue - min) * innerWidth / (max - min);
    };
  }, [data, innerWidth, margin.left]);
  
  const yScale = useMemo(() => {
    const min = Math.min(0, ...data.map(d => d.y)); // Start from 0 or min value
    const max = Math.max(...data.map(d => d.y));
    const range = max - min;
    return (y: number) => height - margin.bottom - (y - min) * innerHeight / range;
  }, [data, height, innerHeight, margin.bottom]);
  
  // Generate path
  const linePath = useMemo(() => {
    const lineGenerator = smooth 
      ? d3.line<DataPoint>()
          .x((d, i) => xScale(d.x, i))
          .y(d => yScale(d.y))
          .curve(d3.curveCatmullRom.alpha(0.5))
      : d3.line<DataPoint>()
          .x((d, i) => xScale(d.x, i))
          .y(d => yScale(d.y));
    
    return lineGenerator(data) || '';
  }, [data, xScale, yScale, smooth]);
  
  const areaPath = useMemo(() => {
    const areaGenerator = smooth 
      ? d3.area<DataPoint>()
          .x((d, i) => xScale(d.x, i))
          .y0(height - margin.bottom)
          .y1(d => yScale(d.y))
          .curve(d3.curveCatmullRom.alpha(0.5))
      : d3.area<DataPoint>()
          .x((d, i) => xScale(d.x, i))
          .y0(height - margin.bottom)
          .y1(d => yScale(d.y));
    
    return areaGenerator(data) || '';
  }, [data, xScale, yScale, height, margin.bottom, smooth]);
  
  // Create unique IDs for SVG filters
  const glowFilterId = useMemo(() => `glow-${Math.random().toString(36).substring(2, 9)}`, []);
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substring(2, 9)}`, []);
  
  return (
    <Box sx={{ width, height, position: 'relative' }}>
      {title && (
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 1, 
            fontWeight: 'medium',
            textAlign: 'center'
          }}
        >
          {title}
        </Typography>
      )}
      
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
        style={{ overflow: 'visible' }}
      >
        {/* Definitions for gradients and filters */}
        <defs>
          {/* Area gradient */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0.05" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="1.5" intercept="0" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="blur" mode="screen" />
          </filter>
        </defs>
        
        {/* Grid lines */}
        {showGrid && (
          <g className="grid">
            {/* Horizontal grid lines */}
            {Array.from({ length: 5 }).map((_, i) => {
              const y = margin.top + (innerHeight / 4) * i;
              return (
                <line 
                  key={`h-grid-${i}`}
                  x1={margin.left} 
                  y1={y} 
                  x2={width - margin.right} 
                  y2={y}
                  stroke={alpha(theme.palette.text.secondary, 0.1)}
                  strokeDasharray="3,3"
                />
              );
            })}
            
            {/* Vertical grid lines */}
            {data.map((d, i) => {
              if (i % Math.ceil(data.length / 6) !== 0) return null;
              const x = xScale(d.x, i);
              return (
                <line 
                  key={`v-grid-${i}`}
                  x1={x} 
                  y1={margin.top} 
                  x2={x} 
                  y2={height - margin.bottom}
                  stroke={alpha(theme.palette.text.secondary, 0.1)}
                  strokeDasharray="3,3"
                />
              );
            })}
          </g>
        )}
        
        {/* X and Y axes */}
        <line 
          x1={margin.left} 
          y1={height - margin.bottom} 
          x2={width - margin.right} 
          y2={height - margin.bottom}
          stroke={alpha(theme.palette.text.secondary, 0.4)}
          strokeWidth={1}
        />
        
        <line 
          x1={margin.left} 
          y1={margin.top} 
          x2={margin.left} 
          y2={height - margin.bottom}
          stroke={alpha(theme.palette.text.secondary, 0.4)}
          strokeWidth={1}
        />
        
        {/* X-axis labels */}
        {showLabels && data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          const x = xScale(d.x, i);
          const label = d.label || d.x.toString();
          return (
            <text 
              key={`x-label-${i}`}
              x={x} 
              y={height - margin.bottom + 20}
              textAnchor="middle"
              fontSize={12}
              fill={theme.palette.text.secondary}
            >
              {typeof label === 'string' && label.length > 8 
                ? `${label.substring(0, 8)}...` 
                : label}
            </text>
          );
        })}
        
        {/* Y-axis labels */}
        {showLabels && Array.from({ length: 5 }).map((_, i) => {
          const y = margin.top + (innerHeight / 4) * i;
          const yValue = data.length ? 
            Math.max(...data.map(d => d.y)) * (1 - i / 4) : 
            0;
          return (
            <text 
              key={`y-label-${i}`}
              x={margin.left - 10} 
              y={y + 5}
              textAnchor="end"
              fontSize={12}
              fill={theme.palette.text.secondary}
            >
              {yValue.toFixed(0)}
            </text>
          );
        })}
        
        {/* Area chart */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={animated ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        
        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={chartColor}
          strokeWidth={2.5}
          style={{ filter: `url(#${glowFilterId})` }}
          initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Data points */}
        {data.map((d, i) => (
          <motion.circle
            key={`point-${i}`}
            cx={xScale(d.x, i)}
            cy={yScale(d.y)}
            r={isHovering === i ? 7 : 5}
            fill={theme.palette.background.paper}
            stroke={chartColor}
            strokeWidth={2.5}
            style={{ 
              filter: isHovering === i ? `url(#${glowFilterId})` : 'none',
              cursor: 'pointer'
            }}
            initial={animated ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: animated ? 1 + (i * 0.05) : 0 }}
            onMouseEnter={() => setIsHovering(i)}
            onMouseLeave={() => setIsHovering(null)}
          />
        ))}
        
        {/* Tooltip for hover */}
        {isHovering !== null && (
          <g>
            <rect
              x={xScale(data[isHovering].x, isHovering) - 45}
              y={yScale(data[isHovering].y) - 45}
              width={90}
              height={35}
              rx={5}
              fill={alpha(theme.palette.background.paper, 0.9)}
              stroke={theme.palette.divider}
              style={{ filter: `drop-shadow(0px 2px 5px rgba(0,0,0,0.2))` }}
            />
            <text
              x={xScale(data[isHovering].x, isHovering)}
              y={yScale(data[isHovering].y) - 24}
              textAnchor="middle"
              fontSize={14}
              fontWeight="bold"
              fill={theme.palette.text.primary}
            >
              {data[isHovering].y.toFixed(2)}
            </text>
          </g>
        )}
        
        {/* Axis labels */}
        {xAxisLabel && (
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize={12}
            fill={theme.palette.text.secondary}
          >
            {xAxisLabel}
          </text>
        )}
        
        {yAxisLabel && (
          <text
            x={-height / 2}
            y={15}
            textAnchor="middle"
            fontSize={12}
            fill={theme.palette.text.secondary}
            transform={`rotate(-90)`}
          >
            {yAxisLabel}
          </text>
        )}
      </svg>
    </Box>
  );
};

export default AreaChart; 