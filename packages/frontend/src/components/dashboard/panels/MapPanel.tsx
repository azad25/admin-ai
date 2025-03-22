import React from 'react';
import {
  Typography,
  Box,
  Paper,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';

export interface MapLocation {
  latitude: number;
  longitude: number;
  count: number;
  city: string;
  country: string;
  lastSeen: string;
  uniqueIps: number;
  status: 'success' | 'warning' | 'error';
}

export interface MapPanelProps {
  locations: MapLocation[];
  loading?: boolean;
}

const MapPanel: React.FC<MapPanelProps> = ({ locations, loading = false }) => {
  // This would be replaced with a real map implementation
  return (
    <Paper sx={{ p: 2, height: '100%', position: 'relative' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1,
          }}
        >
          <Typography>Loading map data...</Typography>
        </Box>
      )}
      <Typography variant="h6" gutterBottom>
        Request Locations
      </Typography>
      <Box sx={{ height: 300, backgroundColor: '#f5f5f5', borderRadius: 1, overflow: 'hidden' }}>
        {/* Placeholder for map - would integrate with a mapping library */}
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <LocationOn color="primary" sx={{ fontSize: 40, mb: 2 }} />
          <Typography align="center">
            {locations.length > 0 
              ? `Showing ${locations.length} locations across ${new Set(locations.map(l => l.country)).size} countries`
              : 'No location data available'}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Top locations: {locations.slice(0, 3).map(l => `${l.city}, ${l.country}`).join(' • ')}
        </Typography>
      </Box>
    </Paper>
  );
};

export default MapPanel;