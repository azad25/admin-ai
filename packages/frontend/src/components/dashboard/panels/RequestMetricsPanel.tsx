import React from 'react';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Paper,
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
  AreaChart,
  Area,
} from 'recharts';
import { RequestMetric } from '../../../types/metrics';

interface RequestMetricsPanelProps {
  requestMetrics: RequestMetric[];
  loading: boolean;
  chartType: 'line' | 'bar' | 'area';
  onChartTypeChange: (type: 'line' | 'bar' | 'area') => void;
}

const RequestMetricsPanel: React.FC<RequestMetricsPanelProps> = ({
  requestMetrics,
  loading,
  chartType,
  onChartTypeChange,
}) => {
  // Helper function for formatting chart values
  const formatChartValue = (name: string | number, value: any) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return value.toString();

    switch (name.toString()) {
      case 'averageResponseTime':
        return `${numValue.toFixed(2)}ms`;
      case 'uniqueIPs':
      case 'requestCount':
      case 'successCount':
      case 'errorCount':
        return numValue.toLocaleString();
      default:
        return value.toString();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Request Metrics</Typography>
        <Box>
          <Button
            size="small"
            variant={chartType === 'line' ? 'contained' : 'outlined'}
            onClick={() => onChartTypeChange('line')}
            sx={{ mr: 1 }}
          >
            Line
          </Button>
          <Button
            size="small"
            variant={chartType === 'bar' ? 'contained' : 'outlined'}
            onClick={() => onChartTypeChange('bar')}
            sx={{ mr: 1 }}
          >
            Bar
          </Button>
          <Button
            size="small"
            variant={chartType === 'area' ? 'contained' : 'outlined'}
            onClick={() => onChartTypeChange('area')}
          >
            Area
          </Button>
        </Box>
      </Box>
      <Box sx={{ height: 300 }}>
        {requestMetrics && requestMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart
                data={requestMetrics}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleTimeString()
                  }
                />
                <YAxis />
                <ChartTooltip
                  formatter={(value, name) => formatChartValue(name, value)}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="duration"
                  name="Response Time (ms)"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="statusCode"
                  name="Status Code"
                  stroke="#82ca9d"
                />
              </LineChart>
            ) : chartType === 'bar' ? (
              <BarChart
                data={requestMetrics}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleTimeString()
                  }
                />
                <YAxis />
                <ChartTooltip
                  formatter={(value, name) => formatChartValue(name, value)}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Bar
                  dataKey="duration"
                  name="Response Time (ms)"
                  fill="#8884d8"
                />
                <Bar
                  dataKey="statusCode"
                  name="Status Code"
                  fill="#82ca9d"
                />
              </BarChart>
            ) : (
              <AreaChart
                data={requestMetrics}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleTimeString()
                  }
                />
                <YAxis />
                <ChartTooltip
                  formatter={(value, name) => formatChartValue(name, value)}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="duration"
                  name="Response Time (ms)"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="statusCode"
                  name="Status Code"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <CircularProgress />
            ) : (
              <Typography color="text.secondary">
                No request metrics available
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default RequestMetricsPanel;