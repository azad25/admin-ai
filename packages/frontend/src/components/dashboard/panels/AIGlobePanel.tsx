import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { AIGlobe } from '../../3d/aiglobe/AIGlobe';

interface AIGlobePanelProps {
  globeData: Array<{
    latitude: number;
    longitude: number;
    intensity: number;
    city?: string;
    country?: string;
  }>;
}

const AIGlobePanel: React.FC<AIGlobePanelProps> = ({ globeData }) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Generate sample data if none is provided
  const sampleGlobeData = React.useMemo(() => {
    if (globeData && globeData.length > 0) return globeData;
    
    // Default sample data if no real data is available
    return [
      { latitude: 40.7128, longitude: -74.0060, intensity: 0.8, city: 'New York', country: 'USA' },
      { latitude: 51.5074, longitude: -0.1278, intensity: 0.7, city: 'London', country: 'UK' },
      { latitude: 35.6762, longitude: 139.6503, intensity: 0.6, city: 'Tokyo', country: 'Japan' },
      { latitude: 22.3193, longitude: 114.1694, intensity: 0.7, city: 'Hong Kong', country: 'China' },
      { latitude: -33.8688, longitude: 151.2093, intensity: 0.5, city: 'Sydney', country: 'Australia' },
      { latitude: 48.8566, longitude: 2.3522, intensity: 0.6, city: 'Paris', country: 'France' },
      { latitude: 19.4326, longitude: -99.1332, intensity: 0.4, city: 'Mexico City', country: 'Mexico' },
      { latitude: -23.5505, longitude: -46.6333, intensity: 0.5, city: 'São Paulo', country: 'Brazil' },
      { latitude: 55.7558, longitude: 37.6173, intensity: 0.4, city: 'Moscow', country: 'Russia' },
      { latitude: 37.7749, longitude: -122.4194, intensity: 0.9, city: 'San Francisco', country: 'USA' },
      { latitude: 1.3521, longitude: 103.8198, intensity: 0.6, city: 'Singapore', country: 'Singapore' },
      { latitude: 25.2048, longitude: 55.2708, intensity: 0.7, city: 'Dubai', country: 'UAE' },
    ];
  }, [globeData]);

  // Use IntersectionObserver to detect if component is visible in viewport
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1, // 10% visibility is enough to trigger
      }
    );
    
    observer.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Globe visualization - only render when visible in viewport */}
      <Box 
        sx={{ 
          width: '100%', 
          height: '100%',
          position: 'relative',
          background: 'linear-gradient(135deg, #040c1e 0%, #0a1c3f 50%, #091632 100%)',
        }}
      >
        {isVisible && (
          <AIGlobe 
            data={sampleGlobeData} 
            size={400}
          />
        )}
      </Box>
      
      {/* Optional overlay with hotspot information */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          maxWidth: '200px',
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(8px)',
          padding: 1.5,
          borderRadius: 1,
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.2)}`,
        }}
      >
        <Typography variant="caption" color="text.secondary" component="div">
          Active users by location
        </Typography>
        <Typography variant="h5" fontWeight="600">
          {sampleGlobeData.length}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Across {new Set(sampleGlobeData.map(item => item.country)).size} countries
        </Typography>
      </Box>
    </Box>
  );
};

export default AIGlobePanel;