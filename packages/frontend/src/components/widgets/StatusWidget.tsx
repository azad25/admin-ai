import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface StatusWidgetProps {
  config: {
    endpoint: string;
    refreshInterval: number;
  };
}

interface StatusData {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: string;
  metrics?: {
    name: string;
    value: string;
    status: 'healthy' | 'warning' | 'error';
  }[];
}

const statusConfig = {
  healthy: {
    icon: HealthyIcon,
    color: 'success',
    label: 'Healthy',
  },
  warning: {
    icon: WarningIcon,
    color: 'warning',
    label: 'Warning',
  },
  error: {
    icon: ErrorIcon,
    color: 'error',
    label: 'Error',
  },
} as const;

export default function StatusWidget({ config }: StatusWidgetProps) {
  const { data, isLoading, error } = useQuery<StatusData>({
    queryKey: ['status', config.endpoint],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/${config.endpoint}`
      );
      return data;
    },
    refetchInterval: config.refreshInterval,
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={200}
        bgcolor="background.paper"
        borderRadius={1}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={200}
        bgcolor="background.paper"
        borderRadius={1}
      >
        <Typography color="error">Failed to load status</Typography>
      </Box>
    );
  }

  const StatusIcon = statusConfig[data.status].icon;

  return (
    <Box
      p={3}
      height={200}
      bgcolor="background.paper"
      borderRadius={1}
      display="flex"
      flexDirection="column"
    >
      <Box display="flex" alignItems="center" mb={2}>
        <StatusIcon
          sx={{ fontSize: 24, mr: 1, color: `${statusConfig[data.status].color}.main` }}
        />
        <Typography variant="h6">{statusConfig[data.status].label}</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>
        {data.message}
      </Typography>

      {data.metrics && (
        <Box display="flex" gap={1} flexWrap="wrap">
          {data.metrics.map((metric) => (
            <Chip
              key={metric.name}
              label={`${metric.name}: ${metric.value}`}
              color={statusConfig[metric.status].color}
              size="small"
            />
          ))}
        </Box>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 'auto' }}
      >
        Last checked: {new Date(data.lastChecked).toLocaleString()}
      </Typography>
    </Box>
  );
} 