import React from 'react';
import { Box, useTheme } from '@mui/material';
import { LiveRequestMap } from '../../LiveRequestMap';

// Define the correct type for status
type LocationStatus = 'success' | 'error' | 'warning';

// Sample data for the map with properly typed status
const sampleLocations = [
  { latitude: 40.7128, longitude: -74.0060, count: 15, status: 'success' as LocationStatus, city: 'New York', country: 'USA' },
  { latitude: 34.0522, longitude: -118.2437, count: 12, status: 'success' as LocationStatus, city: 'Los Angeles', country: 'USA' },
  { latitude: 51.5074, longitude: -0.1278, count: 10, status: 'warning' as LocationStatus, city: 'London', country: 'UK' },
  { latitude: 48.8566, longitude: 2.3522, count: 8, status: 'success' as LocationStatus, city: 'Paris', country: 'France' },
  { latitude: 35.6762, longitude: 139.6503, count: 14, status: 'success' as LocationStatus, city: 'Tokyo', country: 'Japan' },
  { latitude: 22.3193, longitude: 114.1694, count: 7, status: 'error' as LocationStatus, city: 'Hong Kong', country: 'China' },
  { latitude: 1.3521, longitude: 103.8198, count: 9, status: 'success' as LocationStatus, city: 'Singapore', country: 'Singapore' },
  { latitude: -33.8688, longitude: 151.2093, count: 6, status: 'warning' as LocationStatus, city: 'Sydney', country: 'Australia' },
  { latitude: 55.7558, longitude: 37.6173, count: 8, status: 'success' as LocationStatus, city: 'Moscow', country: 'Russia' },
  { latitude: 19.4326, longitude: -99.1332, count: 5, status: 'success' as LocationStatus, city: 'Mexico City', country: 'Mexico' },
  { latitude: -23.5505, longitude: -46.6333, count: 7, status: 'success' as LocationStatus, city: 'São Paulo', country: 'Brazil' },
  { latitude: 28.6139, longitude: 77.2090, count: 11, status: 'success' as LocationStatus, city: 'New Delhi', country: 'India' },
  { latitude: 30.0444, longitude: 31.2357, count: 6, status: 'warning' as LocationStatus, city: 'Cairo', country: 'Egypt' },
  { latitude: 41.0082, longitude: 28.9784, count: 9, status: 'success' as LocationStatus, city: 'Istanbul', country: 'Turkey' },
  { latitude: 37.7749, longitude: -122.4194, count: 13, status: 'success' as LocationStatus, city: 'San Francisco', country: 'USA' },
];

interface MapPanelProps {
  title?: string; // Not used directly but kept for API compatibility
}

export const MapPanel: React.FC<MapPanelProps> = () => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%',
        overflow: 'hidden',
        borderRadius: 0 
      }}
    >
      <Box sx={{ height: '100%', width: '100%' }}>
        <LiveRequestMap 
          locations={sampleLocations}
          width="100%"
          height="100%"
        />
      </Box>
    </Box>
  );
};

// Helper function for alpha
const alpha = (color: string, value: number): string => {
  // Simple implementation of alpha for string colors
  return color;
};