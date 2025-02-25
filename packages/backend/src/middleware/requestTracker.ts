import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestTrackerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    logger.info({
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip
    });
  });

  next();
}; 