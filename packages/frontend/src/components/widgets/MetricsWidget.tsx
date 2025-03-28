import React from 'react';
import { Card, CardContent, Box, Typography, useTheme, alpha, Grid } from '@mui/material';
import CircularProgressChart from '../charts/CircularProgressChart';
import AreaChart from '../charts/AreaChart';
import BarChart from '../charts/BarChart';

export type MetricWidgetType = 'circular' | 'area' | 'bar';

export interface MetricDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface MetricsWidgetProps {
  title: string;
  subtitle?: string;
  type: MetricWidgetType;
  value?: number; // For circular progress
  data?: MetricDataPoint[] | BarDataPoint[]; // For area/bar charts
  icon?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  color?: string;
  bgColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

const MetricsWidget: React.FC<MetricsWidgetProps> = ({
  title,
  subtitle,
  type,
  value = 0,
  data = [],
  icon,
  width = '100%',
  height = 300,
  color,
  bgColor,
  xAxisLabel,
  yAxisLabel,
}) => {
  const theme = useTheme();
  
  // Use theme color if not provided
  const chartColor = color || theme.palette.primary.main;
  const backgroundColor = bgColor || theme.palette.background.paper;

  // Render appropriate chart based on type
  const renderChart = () => {
    switch (type) {
      case 'circular':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgressChart
              value={value}
              size={200}
              thickness={10}
              color={chartColor}
              backgroundColor={alpha(chartColor, 0.1)}
              label={subtitle}
            />
          </Box>
        );
        
      case 'area':
        return (
          <Box sx={{ height: 250, width: '100%' }}>
            <AreaChart
              // Type assertion to handle the different data types
              data={data as MetricDataPoint[]}
              width={typeof width === 'string' ? parseInt(width) || 600 : width as number}
              height={typeof height === 'string' ? parseInt(height) || 250 : height as number}
              color={chartColor}
              xAxisLabel={xAxisLabel}
              yAxisLabel={yAxisLabel}
              showGrid={true}
              animated={true}
              smooth={true}
            />
          </Box>
        );
        
      case 'bar':
        return (
          <Box sx={{ height: 250, width: '100%' }}>
            <BarChart
              // Type assertion to handle the different data types
              data={data as BarDataPoint[]}
              width={typeof width === 'string' ? parseInt(width) || 600 : width as number}
              height={typeof height === 'string' ? parseInt(height) || 250 : height as number}
              title=""
              barWidth={40}
              barGap={20}
              showValues={true}
              showLabels={true}
            />
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card 
      elevation={0}
      sx={{ 
        width, 
        height,
        backgroundColor,
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 4px 20px rgba(0,0,0,0.5)' 
          : '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 6px 24px rgba(0,0,0,0.6)' 
            : '0 4px 15px rgba(0,0,0,0.15)',
        }
      }}
    >
      <CardContent sx={{ p: 2, height: '100%' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2 
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon && (
              <Box 
                sx={{ 
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  color: chartColor
                }}
              >
                {icon}
              </Box>
            )}
            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
              {title}
            </Typography>
          </Box>
        </Box>
        
        {/* Chart component */}
        <Box sx={{ height: 'calc(100% - 60px)' }}>
          {renderChart()}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricsWidget; 