import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure JWT_SECRET is set
if (!JWT_SECRET) {
  const errorMessage = 'JWT_SECRET environment variable is not set';
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

// After validation, we can safely assert JWT_SECRET is a string
const jwtSecretString: string = JWT_SECRET;

const TOKEN_EXPIRY = '24h'; // Token expiry time

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface TokenRefreshError extends AppError {
  refreshToken?: string;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    // Cast the decoded token to TokenPayload
    const decoded = jwt.verify(token, jwtSecretString) as unknown as TokenPayload;
    
    // Check if token is about to expire (less than 1 hour remaining)
    const expiresIn = (decoded.exp || 0) - Math.floor(Date.now() / 1000);
    if (expiresIn < 3600) {
      logger.debug('Token is about to expire, generating refresh token');
      // Generate a new token
      const newToken = generateToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });
      // Create a custom error with the refresh token
      const error = new AppError(401, 'Token refresh required') as TokenRefreshError;
      error.refreshToken = newToken;
      throw error;
    }
    
    return decoded;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error.name === 'JsonWebTokenError') {
      logger.error('Token verification failed:', error);
      throw new AppError(401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      logger.error('Token expired:', error);
      throw new AppError(401, 'Token has expired');
    }
    logger.error('Token verification failed:', error);
    throw new AppError(401, 'Invalid or expired token');
  }
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, jwtSecretString, { expiresIn: TOKEN_EXPIRY });
} 