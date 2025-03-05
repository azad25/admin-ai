import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { RequestWithUser } from '../types/express';

// Create IP-based rate limiter
const ipLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests from this IP, please try again later' } },
  handler: (req: Request, res: Response) => {
    logger.warn('IP Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests from this IP, please try again later' } });
  }
});

// Create user-based rate limiter
const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour per user
  keyGenerator: (req: Request) => {
    const userReq = req as RequestWithUser;
    return userReq.user?.id || req.ip || 'anonymous';
  },
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' } },
  handler: (req: Request, res: Response) => {
    logger.warn('User Rate limit exceeded', {
      userId: (req as RequestWithUser).user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' } });
  }
});

// Middleware to apply rate limiting
export const rateLimiterMiddleware = {
  ipLimiter,
  userLimiter,
  // Combined middleware that applies both IP and user-based rate limiting
  combined: (req: Request, res: Response, next: NextFunction) => {
    ipLimiter(req, res, (err: any) => {
      if (err) return next(err);
      userLimiter(req, res, next);
    });
  }
};