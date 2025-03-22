import React from 'react';
import { Box } from '@mui/material';

interface GlobeData {
  latitude: number;
  longitude: number;
  intensity: number;
  city?: string;
  country?: string;
}

interface AIGlobeProps {
  data: GlobeData[];
}

export const AIGlobe: React.FC<AIGlobeProps> = ({ data }) => {
  // This is a placeholder component
  // You would typically use a library like react-globe.gl or similar
  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 2
      }}
    >
      Globe Visualization Placeholder
      {/* Implement actual globe visualization here */}
    </Box>
  );
}; 