import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database';
import { User as UserEntity } from '../database/entities/User';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';
import { verifyToken } from '../utils/auth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
    }
  }
}

const userRepository = AppDataSource.getRepository(UserEntity);

// List of paths that should be public
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/health',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png'
];

// Cache for user data
const userCache = new Map<string, { user: UserEntity; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Define the User interface
interface User {
  id: string;
  email: string;
  role: string;
}

export const authMiddleware = {
  requireAuth: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip auth for public paths
      if (PUBLIC_PATHS.some(path => req.path.endsWith(path))) {
        return next();
      }

      // Skip auth for OPTIONS requests (CORS preflight)
      if (req.method === 'OPTIONS') {
        return next();
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        // For development mode, set a default user for GET requests
        if (process.env.NODE_ENV === 'development' && req.method === 'GET') {
          req.user = {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'dev@example.com',
            role: 'USER',
            name: 'Dev User',
            createdAt: new Date(),
            updatedAt: new Date()
          } as UserEntity;
          return next();
        }
        throw new AppError(401, 'Authentication required');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new AppError(401, 'Invalid authentication token');
      }

      try {
        const decoded = await verifyToken(token);
        
        // Check cache first
        const cachedData = userCache.get(decoded.userId);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
          req.user = cachedData.user;
          return next();
        }

        // If not in cache or expired, fetch from database
        const user = await userRepository.findOne({ where: { id: decoded.userId } });
        if (!user) {
          throw new AppError(401, 'User not found');
        }

        // Update cache
        userCache.set(decoded.userId, { user, timestamp: Date.now() });
        req.user = user;

        // Check for token refresh
        const tokenAge = decoded.iat ? Date.now() / 1000 - decoded.iat : 0;
        if (tokenAge > 3600) { // 1 hour
          const refreshToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
          );
          res.set('X-New-Token', refreshToken);
        }

        next();
      } catch (error) {
        if (error instanceof AppError && error.message.includes('Token refresh required')) {
          // Handle token refresh
          const refreshError = error as { refreshToken?: string };
          if (refreshError.refreshToken) {
            res.set('X-New-Token', refreshError.refreshToken);
          }
          next();
        } else {
          throw error;
        }
      }
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        // Log token verification failure
        logger.warn('Token verification failed', {
          error: error.message,
          path: req.path,
          method: req.method
        });
        next(new AppError(401, 'Invalid authentication token'));
      } else {
        next(error);
      }
    }
  },

  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized - No user found' });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
}; 