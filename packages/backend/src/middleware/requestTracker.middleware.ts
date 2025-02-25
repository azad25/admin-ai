import { Request, Response, NextFunction } from 'express';
import { systemMetricsService } from '../services/systemMetrics.service';
import geoip from 'geoip-lite';
import { logger } from '../utils/logger';

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
    const normalizedIp = ip === '::1' || ip === '127.0.0.1' 
      ? '8.8.8.8' // Use Google's DNS IP for local development
      : ip;
    
    const geo = geoip.lookup(normalizedIp);
    
    if (geo && geo.ll && geo.ll.length === 2) {
      location = {
        country: geo.country || 'Unknown',
        city: geo.city || 'Unknown',
        latitude: geo.ll[0],
        longitude: geo.ll[1]
      };
    } else {
      // Fallback location for development (San Francisco)
      location = {
        country: 'US',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194
      };
    }
  } catch (error) {
    logger.warn(`Failed to lookup location for IP ${ip}:`, error);
    // Fallback location
    location = {
      country: 'US',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194
    };
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