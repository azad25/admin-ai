import React from 'react';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  ButtonGroup,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { RequestMetric } from '../../../types/metrics';

interface RequestMetricsPanelProps {
  requestMetrics: RequestMetric[];
  loading: boolean;
  chartType: 'line' | 'bar';
  onChartTypeChange: (type: 'line' | 'bar') => void;
}

// Utility function to format chart values
const formatChartValue = (name: string | number, value: any) => {
  const numValue = Number(value);
  if (isNaN(numValue)) return value.toString();

  switch (name.toString()) {
    case 'duration':
      return `${numValue.toFixed(2)}ms`;
    case 'requestCount':
    case 'successCount':
    case 'errorCount':
      return numValue.toLocaleString();
    case 'statusCode':
      return numValue.toString();
    default:
      return value.toString();
  }
};

const RequestMetricsPanel: React.FC<RequestMetricsPanelProps> = ({
  requestMetrics,
  loading,
  chartType,
  onChartTypeChange,
}) => {
  const theme = useTheme();

  // Generate some sample data if no metrics are available (for development/preview)
  const sampleData = React.useMemo(() => {
    if (requestMetrics && requestMetrics.length > 0) return requestMetrics;
    
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now);
      date.setHours(now.getHours() - 11 + i);
      
      return {
        timestamp: date.toISOString(),
        method: 'GET',
        path: '/api/sample',
        statusCode: Math.random() > 0.9 ? 500 : 200,
        duration: 100 + Math.random() * 150,
        requestCount: 50 + Math.floor(Math.random() * 200),
        successCount: 45 + Math.floor(Math.random() * 180),
        errorCount: Math.floor(Math.random() * 20),
        ip: '127.0.0.1',
      };
    });
  }, [requestMetrics]);

  // Custom tooltip styles
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1.5,
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {new Date(label).toLocaleString()}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                component="span"
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  mr: 1,
                }}
              />
              <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                {entry.name}:
              </Typography>
              <Typography variant="body2" component="span" fontWeight="medium">
                {formatChartValue(entry.dataKey, entry.value)}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Chart controls rendering
  const renderChartControls = () => (
    <ButtonGroup size="small" sx={{ alignSelf: 'flex-end', mb: 2 }}>
      <Button
        variant={chartType === 'line' ? 'contained' : 'outlined'}
        onClick={() => onChartTypeChange('line')}
        startIcon={<ShowChartIcon fontSize="small" />}
        size="small"
      >
        Line
      </Button>
      <Button
        variant={chartType === 'bar' ? 'contained' : 'outlined'}
        onClick={() => onChartTypeChange('bar')}
        startIcon={<BarChartIcon fontSize="small" />}
        size="small"
      >
        Bar
      </Button>
    </ButtonGroup>
  );

  // Chart rendering based on type
  const renderChart = () => {
    const chartProps = {
      data: sampleData,
      margin: { top: 5, right: 20, left: 0, bottom: 5 },
    };

    // Common axis and grid configuration
    const chartComponents = (
      <>
        <defs>
          <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          vertical={false} 
          stroke={alpha(theme.palette.divider, 0.2)} 
        />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={(timestamp) => {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', { month: 'short' });
          }}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
          tickLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
        />
        <YAxis 
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={{ stroke: 'transparent' }}
          tickLine={{ stroke: 'transparent' }}
        />
        <ChartTooltip content={<CustomTooltip />} />
      </>
    );

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            {chartComponents}
            <Line
              type="monotone"
              dataKey="requestCount"
              name="Total"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="successCount"
              name="Success"
              stroke={theme.palette.success.main}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="errorCount"
              name="Errors"
              stroke={theme.palette.error.main}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...chartProps}>
            {chartComponents}
            <Bar
              dataKey="requestCount"
              name="Total"
              fill={theme.palette.primary.main}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="successCount"
              name="Success"
              fill={theme.palette.success.main}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="errorCount"
              name="Errors"
              fill={theme.palette.error.main}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {renderChartControls()}
      <Box sx={{ height: 'calc(100% - 40px)', width: '100%' }}>
        {loading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={40} thickness={4} />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

export default RequestMetricsPanel;