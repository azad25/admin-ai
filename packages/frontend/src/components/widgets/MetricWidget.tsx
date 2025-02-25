import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';

interface MetricWidgetProps {
  config: {
    title: string;
    endpoint: string;
    format: 'number' | 'currency' | 'percentage';
    prefix?: string;
    suffix?: string;
    decimals?: number;
  };
}

export default function MetricWidget({ config }: MetricWidgetProps) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/${config.endpoint}`
        );
        setValue(Number(data.value));
        setError(null);
      } catch (err) {
        setError('Failed to load metric');
        console.error('Error fetching metric:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.endpoint]);

  const formatValue = (value: number): string => {
    let formattedValue = '';

    switch (config.format) {
      case 'currency':
        formattedValue = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: config.decimals ?? 2,
          maximumFractionDigits: config.decimals ?? 2,
        }).format(value);
        break;

      case 'percentage':
        formattedValue = new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: config.decimals ?? 1,
          maximumFractionDigits: config.decimals ?? 1,
        }).format(value / 100);
        break;

      default: // number
        formattedValue = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: config.decimals ?? 0,
          maximumFractionDigits: config.decimals ?? 0,
        }).format(value);
    }

    return `${config.prefix || ''}${formattedValue}${config.suffix || ''}`;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {config.title}
        </Typography>
        {loading ? (
          <CircularProgress size={24} />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Typography variant="h4">
            {value !== null ? formatValue(value) : 'N/A'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
} 