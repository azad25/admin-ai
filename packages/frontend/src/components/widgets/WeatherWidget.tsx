import { Box, Typography, CircularProgress } from '@mui/material';
import {
  WbSunny as SunnyIcon,
  Cloud as CloudyIcon,
  Opacity as RainIcon,
  AcUnit as SnowIcon,
  Thunderstorm as StormIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface WeatherWidgetProps {
  config: {
    location: string;
    unit: 'celsius' | 'fahrenheit';
  };
}

interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm';
  humidity: number;
  windSpeed: number;
}

const WeatherIcons = {
  sunny: SunnyIcon,
  cloudy: CloudyIcon,
  rain: RainIcon,
  snow: SnowIcon,
  storm: StormIcon,
};

export default function WeatherWidget({ config }: WeatherWidgetProps) {
  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather', config.location],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/weather?location=${encodeURIComponent(
          config.location
        )}&unit=${config.unit}`
      );
      return data;
    },
    refetchInterval: 1800000, // Refetch every 30 minutes
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
        <Typography color="error">Failed to load weather data</Typography>
      </Box>
    );
  }

  const WeatherIcon = WeatherIcons[data.condition];

  return (
    <Box
      p={3}
      height={200}
      bgcolor="background.paper"
      borderRadius={1}
      display="flex"
      flexDirection="column"
      alignItems="center"
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {config.location}
      </Typography>
      <Box display="flex" alignItems="center" mb={2}>
        <WeatherIcon sx={{ fontSize: 48, mr: 2 }} />
        <Typography variant="h3">
          {data.temperature}°{config.unit === 'celsius' ? 'C' : 'F'}
        </Typography>
      </Box>
      <Box display="flex" gap={2}>
        <Typography variant="body2" color="text.secondary">
          Humidity: {data.humidity}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Wind: {data.windSpeed} km/h
        </Typography>
      </Box>
    </Box>
  );
} 