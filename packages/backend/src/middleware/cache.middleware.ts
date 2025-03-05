import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';
import { RequestWithUser } from '../types/express';

interface CacheOptions {
  ttl?: number;
  key?: string | ((req: Request) => string);
  condition?: (req: Request) => boolean;
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  const cache = CacheService.getInstance();
  const {
    ttl,
    condition = () => true,
    key = (req: Request) => `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!cache.isReady()) {
      logger.warn('Cache service not ready, skipping cache middleware');
      return next();
    }

    if (!condition(req)) {
      return next();
    }

    const cacheKey = typeof key === 'function' ? key(req) : key;

    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Store the original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = ((data: any) => {
        // Restore the original res.json function
        res.json = originalJson;

        // Cache the response data
        cache.set(cacheKey, data, ttl)
          .catch(error => logger.error('Error caching response:', error));

        // Send the response
        return originalJson(data);
      }) as any;

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}; 