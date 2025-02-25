import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import { Feature, Geometry } from 'geojson';

interface RequestLocation {
  latitude: number;
  longitude: number;
  count: number;
  status?: 'success' | 'error' | 'warning';
}

interface LiveRequestMapProps {
  locations: RequestLocation[];
  isLoading?: boolean;
  width?: number;
  height?: number;
}

export const LiveRequestMap: React.FC<LiveRequestMapProps> = ({
  locations,
  isLoading,
  width = 800,
  height = 400,
}) => {
  const theme = useTheme();
  const mapRef = useRef<SVGSVGElement>(null);
  const [worldData, setWorldData] = React.useState<Feature<Geometry>[]>([]);

  useEffect(() => {
    fetch('/world-110m.json')
      .then(response => response.json())
      .then(topology => {
        const world = feature(topology, topology.objects.countries);
        setWorldData((world as any).features);
      });
  }, []);

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

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={mapRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          background: alpha(theme.palette.background.paper, 0.5),
          borderRadius: theme.shape.borderRadius,
        }}
      >
        {/* Map background */}
        <g>
          {worldData.map((d, i) => (
            <motion.path
              key={i}
              d={path(d) || ''}
              fill={alpha(theme.palette.primary.main, 0.1)}
              stroke={alpha(theme.palette.primary.main, 0.2)}
              strokeWidth={0.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.01 }}
            />
          ))}
        </g>

        {/* Request points */}
        <g>
          {locations.map((point, i) => {
            const [x, y] = projection([point.longitude, point.latitude]) || [0, 0];
            const statusColor = getStatusColor(point.status);

            return (
              <g key={i} transform={`translate(${x},${y})`}>
                {/* Pulse effect */}
                <motion.circle
                  r={Math.min(20, Math.max(5, point.count / 10))}
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
                  r={Math.min(10, Math.max(3, point.count / 20))}
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
              </g>
            );
          })}
        </g>

        {/* Map overlay gradient */}
        <defs>
          <radialGradient id="mapGradient">
            <stop offset="0%" stopColor={alpha(theme.palette.primary.main, 0.1)} />
            <stop offset="100%" stopColor={alpha(theme.palette.primary.main, 0)} />
          </radialGradient>
        </defs>
        <rect
          width={width}
          height={height}
          fill="url(#mapGradient)"
          style={{ mixBlendMode: 'overlay' }}
        />
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