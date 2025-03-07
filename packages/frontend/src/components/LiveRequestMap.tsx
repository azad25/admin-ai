import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, useTheme, alpha, CircularProgress } from '@mui/material';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import { Feature, Geometry } from 'geojson';

interface RequestLocation {
  latitude: number;
  longitude: number;
  count: number;
  status?: 'success' | 'error' | 'warning';
  city?: string;
  country?: string;
}

interface LiveRequestMapProps {
  locations: RequestLocation[];
  isLoading?: boolean;
  width?: number;
  height?: number;
}

export const LiveRequestMap: React.FC<LiveRequestMapProps> = ({
  locations = [],
  isLoading = false,
  width = 800,
  height = 400,
}) => {
  const theme = useTheme();
  const mapRef = useRef<SVGSVGElement>(null);
  const [worldData, setWorldData] = useState<Feature<Geometry>[]>([]);
  const [animatingPoints, setAnimatingPoints] = useState<RequestLocation[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorldMap = async () => {
      try {
        setMapLoading(true);
        const response = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
        if (!response.ok) throw new Error('Failed to load map data');
        
        const topology = await response.json();
        const world = feature(topology, topology.objects.countries);
        setWorldData((world as any).features);
        setMapLoading(false);
      } catch (err) {
        console.error('Error loading world map:', err);
        setError('Failed to load world map');
        setMapLoading(false);
      }
    };

    loadWorldMap();
  }, []);

  // Add a new point every few seconds to simulate real-time activity
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * locations.length);
      const baseLocation = locations[randomIndex];
      
      if (!baseLocation) return;
      
      const newPoint = {
        ...baseLocation,
        latitude: baseLocation.latitude + (Math.random() * 0.2 - 0.1),
        longitude: baseLocation.longitude + (Math.random() * 0.2 - 0.1),
        count: Math.max(1, Math.floor(Math.random() * 5)),
        status: Math.random() > 0.8 
          ? (Math.random() > 0.5 ? 'warning' : 'error') 
          : 'success' as 'success' | 'error' | 'warning'
      };
      
      setAnimatingPoints(prev => [...prev, newPoint]);
      
      setTimeout(() => {
        setAnimatingPoints(prev => prev.filter(p => p !== newPoint));
      }, 3000);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [locations]);

  const projection = geoMercator()
    .scale((width * 0.9) / (2 * Math.PI))
    .translate([width / 2, height / 1.5]);

  const path = geoPath().projection(projection);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
    }
  };

  if (mapLoading || isLoading) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          borderRadius: theme.shape.borderRadius,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.error.main, 0.1),
          borderRadius: theme.shape.borderRadius,
          p: 2,
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const safeLocations = Array.isArray(locations) ? locations : [];

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[3],
        bgcolor: alpha(theme.palette.background.paper, 0.8),
      }}
    >
      <svg
        ref={mapRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Map background */}
        <g>
          {worldData.map((d, i) => (
            <motion.path
              key={i}
              d={path(d) || ''}
              fill={alpha(theme.palette.primary.main, 0.1)}
              stroke={alpha(theme.palette.primary.main, 0.3)}
              strokeWidth={0.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.01 }}
            />
          ))}
        </g>

        {/* Static request points */}
        <g>
          {safeLocations.map((point, i) => {
            const [x, y] = projection([point.longitude, point.latitude]) || [0, 0];
            const statusColor = getStatusColor(point.status);

            return (
              <g key={`static-${i}`} transform={`translate(${x},${y})`}>
                {/* Pulse effect */}
                <motion.circle
                  r={Math.min(20, Math.max(5, point.count))}
                  fill={alpha(statusColor, 0.1)}
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{
                    scale: 1.5,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />

                {/* Main point */}
                <motion.circle
                  r={Math.min(10, Math.max(3, point.count / 2))}
                  fill={statusColor}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: i * 0.1,
                  }}
                />
                
                {/* City label */}
                {point.city && (
                  <text
                    x={0}
                    y={-12}
                    textAnchor="middle"
                    fill={theme.palette.text.primary}
                    fontSize={10}
                    fontWeight="bold"
                  >
                    {point.city}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        
        {/* Animating points */}
        <AnimatePresence>
          {animatingPoints.map((point, i) => {
            const [x, y] = projection([point.longitude, point.latitude]) || [0, 0];
            const statusColor = getStatusColor(point.status);

            return (
              <g key={`anim-${i}-${Date.now()}`} transform={`translate(${x},${y})`}>
                {/* Ripple effect */}
                <motion.circle
                  r={Math.min(30, Math.max(10, point.count * 2))}
                  fill="none"
                  stroke={statusColor}
                  strokeWidth={2}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
                
                {/* Flash point */}
                <motion.circle
                  r={Math.min(8, Math.max(4, point.count))}
                  fill={statusColor}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.7] }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
              </g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: alpha(theme.palette.background.paper, 0.9),
          borderRadius: 1,
          p: 1,
          display: 'flex',
          gap: 2,
        }}
      >
        {['success', 'warning', 'error'].map((status) => (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getStatusColor(status),
              }}
            />
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {status}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}; 