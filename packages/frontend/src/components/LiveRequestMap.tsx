import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, useTheme, alpha, CircularProgress } from '@mui/material';
import { geoPath, geoMercator, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
import { Feature, Geometry } from 'geojson';

// Simplify the status type to accept any string
interface RequestLocation {
  latitude: number;
  longitude: number;
  count: number;
  status?: string;
  city?: string;
  country?: string;
}

interface LiveRequestMapProps {
  locations: RequestLocation[];
  isLoading?: boolean;
  width?: number | string;
  height?: number | string;
}

// Add specific color constants to avoid theme-based complex types
const STATUS_COLORS = {
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  default: '#2196f3'
};

export const LiveRequestMap: React.FC<LiveRequestMapProps> = ({
  locations = [],
  isLoading = false,
  width = 800,
  height = 400,
}) => {
  const theme = useTheme();
  const mapRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<Feature<Geometry>[]>([]);
  const [animatingPoints, setAnimatingPoints] = useState<RequestLocation[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ 
    width: typeof width === 'number' ? width : 800, 
    height: typeof height === 'number' ? height : 400 
  });

  // Calculate container dimensions for responsive sizing
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

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
    if (!locations || locations.length === 0 || mapLoading) return;

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
  }, [locations, mapLoading]);

  const projection = geoMercator()
    .scale((dimensions.width * 0.9) / (2 * Math.PI))
    .translate([dimensions.width / 2, dimensions.height / 1.5]);

  const path = geoPath().projection(projection);
  const graticule = geoGraticule();

  const getStatusColor = (status?: string) => {
    // Use simple lookup in static object instead of theme-based conditional logic
    if (!status) return STATUS_COLORS.default;
    
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
  };

  // Simple glow filter function
  const getGlowFilter = (color: string, id: string) => (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feFlood floodColor={color} result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );

  if (mapLoading || isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'transparent',
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
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'transparent',
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
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '15px',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, rgba(13,25,42,1) 0%, rgba(18,36,65,1) 100%)' 
          : alpha(theme.palette.background.paper, 0.8),
      }}
    >
      <svg
        ref={mapRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* Glow filters for different statuses */}
          {getGlowFilter(theme.palette.primary.main, 'glow-primary')}
          {getGlowFilter(theme.palette.success.main, 'glow-success')}
          {getGlowFilter(theme.palette.warning.main, 'glow-warning')}
          {getGlowFilter(theme.palette.error.main, 'glow-error')}
          
          {/* Gradient for map background */}
          <linearGradient id="map-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={alpha(theme.palette.primary.dark, 0.2)} />
            <stop offset="100%" stopColor={alpha(theme.palette.primary.main, 0.05)} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <g>
          <path
            d={path(graticule()) || ''}
            fill="none"
            stroke={alpha(theme.palette.primary.main, 0.15)}
            strokeWidth={0.3}
            strokeDasharray="2,2"
          />
        </g>

        {/* Map background */}
        <g>
          {worldData.map((d, i) => (
            <motion.path
              key={i}
              d={path(d) || ''}
              fill={alpha(theme.palette.primary.main, 0.08)}
              stroke={alpha(theme.palette.primary.main, 0.25)}
              strokeWidth={0.3}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.01 }}
            />
          ))}
        </g>

        {/* Heat areas */}
        <g>
          {safeLocations.filter(loc => loc.count > 5).map((point, i) => {
            const [x, y] = projection([point.longitude, point.latitude]) || [0, 0];
            const statusColor = getStatusColor(point.status);
            const radius = Math.min(40, Math.max(20, point.count * 3));
            
            return (
              <motion.circle
                key={`heat-${i}`}
                cx={x}
                cy={y}
                r={radius}
                fill={`url(#radial-${i})`}
                opacity={0.2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1, delay: i * 0.05 }}
              >
                <defs>
                  <radialGradient id={`radial-${i}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor={statusColor} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
                  </radialGradient>
                </defs>
              </motion.circle>
            );
          })}
        </g>

        {/* Static request points */}
        <g>
          {safeLocations.map((point, i) => {
            const [x, y] = projection([point.longitude, point.latitude]) || [0, 0];
            const statusColor = getStatusColor(point.status);
            
            // Simplify filter determination - always fall back to primary if not a known status
            let filterName = 'glow-primary';
            if (point.status === 'success') filterName = 'glow-success';
            if (point.status === 'warning') filterName = 'glow-warning';
            if (point.status === 'error') filterName = 'glow-error';

            return (
              <g key={`static-${i}`} transform={`translate(${x},${y})`}>
                {/* Pulse effect */}
                <motion.circle
                  r={Math.min(20, Math.max(5, point.count))}
                  fill={alpha(statusColor, 0.15)}
                  filter={`url(#${filterName})`}
                  initial={{ scale: 0.5, opacity: 0.6 }}
                  animate={{
                    scale: 1.8,
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
                  r={Math.min(5, Math.max(2, point.count / 2))}
                  fill={statusColor}
                  filter={`url(#${filterName})`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: i * 0.1,
                  }}
                />
              </g>
            );
          })}
        </g>
        
        {/* Animating points */}
        <AnimatePresence>
          {animatingPoints.map((point, i) => {
            const [x, y] = projection([point.longitude, point.latitude]) || [0, 0];
            const statusColor = getStatusColor(point.status);
            
            // Simplify filter determination - always fall back to primary if not a known status
            let filterName = 'glow-primary';
            if (point.status === 'success') filterName = 'glow-success';
            if (point.status === 'warning') filterName = 'glow-warning';
            if (point.status === 'error') filterName = 'glow-error';

            return (
              <g key={`anim-${i}-${Date.now()}`} transform={`translate(${x},${y})`}>
                {/* Ripple effect */}
                <motion.circle
                  r={Math.min(25, Math.max(10, point.count * 2))}
                  fill="none"
                  stroke={statusColor}
                  strokeWidth={1.5}
                  filter={`url(#${filterName})`}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
                
                {/* Flash point */}
                <motion.circle
                  r={Math.min(6, Math.max(3, point.count))}
                  fill={statusColor}
                  filter={`url(#${filterName})`}
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
    </Box>
  );
}; 