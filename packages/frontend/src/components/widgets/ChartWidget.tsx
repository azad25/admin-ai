import { Box, Typography, CircularProgress } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface ChartWidgetProps {
  config: {
    title?: string;
    endpoint: string;
    dataKey: string;
    xAxisKey: string;
    color?: string;
  };
}

export default function ChartWidget({ config }: ChartWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['chart-data', config.endpoint],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/${config.endpoint}`
      );
      return data;
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography color="error">Failed to load chart data</Typography>
      </Box>
    );
  }

  return (
    <Box height={300}>
      {config.title && (
        <Typography variant="h6" gutterBottom>
          {config.title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xAxisKey} />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={config.dataKey}
            stroke={config.color || '#1976d2'}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
} 