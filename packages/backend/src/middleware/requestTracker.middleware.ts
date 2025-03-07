import { Request, Response, NextFunction } from 'express';
import { systemMetricsService } from '../services/systemMetrics.service';
import geoip from 'geoip-lite';
import { logger } from '../utils/logger';

// List of major cities for development/testing
const majorCities = [
  { city: 'New York', country: 'US', latitude: 40.7128, longitude: -74.0060 },
  { city: 'London', country: 'GB', latitude: 51.5074, longitude: -0.1278 },
  { city: 'Tokyo', country: 'JP', latitude: 35.6762, longitude: 139.6503 },
  { city: 'Sydney', country: 'AU', latitude: -33.8688, longitude: 151.2093 },
  { city: 'Berlin', country: 'DE', latitude: 52.5200, longitude: 13.4050 },
  { city: 'Paris', country: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { city: 'Mumbai', country: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { city: 'São Paulo', country: 'BR', latitude: -23.5505, longitude: -46.6333 },
  { city: 'Cairo', country: 'EG', latitude: 30.0444, longitude: 31.2357 },
  { city: 'Singapore', country: 'SG', latitude: 1.3521, longitude: 103.8198 },
  { city: 'Toronto', country: 'CA', latitude: 43.6532, longitude: -79.3832 },
  { city: 'Moscow', country: 'RU', latitude: 55.7558, longitude: 37.6173 },
  { city: 'Dubai', country: 'AE', latitude: 25.2048, longitude: 55.2708 },
  { city: 'Cape Town', country: 'ZA', latitude: -33.9249, longitude: 18.4241 },
  { city: 'Mexico City', country: 'MX', latitude: 19.4326, longitude: -99.1332 },
];

export const requestTrackerMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Get the IP address with better fallback handling
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
             req.headers['x-real-ip'] as string || 
             req.socket.remoteAddress?.replace('::ffff:', '') || 
             '127.0.0.1';

  // Get location data with better error handling
  let location;
  try {
    // For production, use real IP lookup
    if (process.env.NODE_ENV === 'production' && ip !== '::1' && ip !== '127.0.0.1') {
      const geo = geoip.lookup(ip);
      
      if (geo && geo.ll && geo.ll.length === 2) {
        location = {
          country: geo.country || 'Unknown',
          city: geo.city || 'Unknown',
          latitude: geo.ll[0],
          longitude: geo.ll[1]
        };
      } else {
        // Fallback to random major city
        location = majorCities[Math.floor(Math.random() * majorCities.length)];
      }
    } else {
      // For development, use random major cities to create a more interesting heatmap
      // This simulates requests coming from different parts of the world
      location = majorCities[Math.floor(Math.random() * majorCities.length)];
      
      // Slightly randomize the coordinates to create a more natural spread
      location = {
        ...location,
        latitude: location.latitude + (Math.random() * 0.1 - 0.05),
        longitude: location.longitude + (Math.random() * 0.1 - 0.05)
      };
    }
  } catch (error) {
    logger.warn(`Failed to lookup location for IP ${ip}:`, error);
    // Fallback to random major city
    location = majorCities[Math.floor(Math.random() * majorCities.length)];
  }

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Track all requests except static assets
    if (!req.path.startsWith('/static/') && !req.path.includes('.')) {
      systemMetricsService.logRequest({
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        ip,
        location,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        query: Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : undefined
      });
    }
  });

  next();
}; 