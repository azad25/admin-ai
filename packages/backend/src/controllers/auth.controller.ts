import { Request, Response, NextFunction } from 'express';
import { hash, compare } from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { AppDataSource } from '../database';
import { User } from '../database/entities/User';
import { AppError } from '../middleware/errorHandler';
import { CreateUserSchema } from '@admin-ai/shared';
import { logger, authLogger } from '../utils/logger';
import { systemMetricsService } from '../services/systemMetrics.service';
import { WebSocketService } from '../services/websocket.service';

const userRepository = AppDataSource.getRepository(User);

const getLocationFromRequest = (req: Request) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
             req.headers['x-real-ip'] as string || 
             req.socket.remoteAddress?.replace('::ffff:', '') || 
             'unknown';

  return {
    country: 'Unknown',
    city: 'Unknown',
    latitude: 0,
    longitude: 0
  };
};

class AuthController {
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  register = async (req: Request, res: Response) => {
    try {
      const result = CreateUserSchema.safeParse(req.body);
      if (!result.success) {
        throw new AppError(400, 'Invalid registration data: ' + JSON.stringify(result.error.errors));
      }

      const { email, password, name, role = 'USER' } = result.data;

      // Check if user already exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new AppError(400, 'A user with this email already exists');
      }

      // Hash password and create user
      const hashedPassword = await hash(password, 10);
      
      // Create and save user directly
      const user = await userRepository.save({
        email,
        password: hashedPassword,
        name,
        role,
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
      );

      // Log successful registration
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                 req.socket.remoteAddress || 
                 'unknown';
      
      systemMetricsService.logAuth({
        timestamp: new Date().toISOString(),
        userId: user.id,
        action: 'register',
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        location: getLocationFromRequest(req)
      });

      // Send notification for successful registration
      this.wsService.sendToUser(user.id, {
        id: crypto.randomUUID(),
        content: `Welcome ${name}! Your account has been created successfully.`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'auth',
          source: {
            page: 'Authentication',
            controller: 'AuthController',
            action: 'register',
            details: { email }
          },
          timestamp: Date.now(),
          read: false
        }
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      // Send error notification if we have a user ID
      if (error instanceof AppError && req.user?.id) {
        this.wsService.sendToUser(req.user.id, {
          id: crypto.randomUUID(),
          content: `Registration failed: ${error.message}`,
          role: 'system',
          metadata: {
            type: 'notification',
            status: 'error',
            category: 'auth',
            source: {
              page: 'Authentication',
              controller: 'AuthController',
              action: 'register'
            },
            timestamp: Date.now(),
            read: false
          }
        });
      }

      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error during registration:', error);
      throw new AppError(500, 'Failed to create user account');
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'Email and password are required');
      }

      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        throw new AppError(401, 'Invalid email or password');
      }

      const isValidPassword = await compare(password, user.password);

      if (!isValidPassword) {
        throw new AppError(401, 'Invalid email or password');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Send response
      return res.status(200).json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      return next(error);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, 'Authentication required');
      }

      const user = await userRepository.findOne({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return next(error);
    }
  };

  changePassword = async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;

    const user = await userRepository.findOne({
      where: { id: req.user.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify old password
    const isPasswordValid = await compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid current password');
    }

    // Hash and update new password
    const hashedPassword = await hash(newPassword, 10);
    user.password = hashedPassword;

    await userRepository.save(user);

    // Send notification for password change
    this.wsService.sendToUser(user.id, {
      id: crypto.randomUUID(),
      content: 'Your password has been updated successfully.',
      role: 'system',
      metadata: {
        type: 'notification',
        status: 'success',
        category: 'auth',
        source: {
          page: 'Authentication',
          controller: 'AuthController',
          action: 'changePassword'
        },
        timestamp: Date.now(),
        read: false
      }
    });

    res.json({ message: 'Password updated successfully' });
  };

  logout = async (req: Request, res: Response) => {
    // Log logout event
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
               req.socket.remoteAddress || 
               'unknown';
    
    systemMetricsService.logAuth({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      action: 'logout',
      ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      location: getLocationFromRequest(req)
    });

    // Send notification for logout
    this.wsService.sendToUser(req.user.id, {
      id: crypto.randomUUID(),
      content: 'You have been logged out successfully.',
      role: 'system',
      metadata: {
        type: 'notification',
        status: 'info',
        category: 'auth',
        source: {
          page: 'Authentication',
          controller: 'AuthController',
          action: 'logout'
        },
        timestamp: Date.now(),
        read: false
      }
    });

    res.json({ message: 'Logged out successfully' });
  };

  requestPasswordReset = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, 'Email is required');
    }

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal whether a user exists
      res.json({ message: 'If an account exists, a reset link will be sent' });
      return;
    }

    // TODO: Implement actual password reset token generation and email sending
    res.json({ message: 'If an account exists, a reset link will be sent' });
  };

  resetPassword = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError(400, 'Token and new password are required');
    }

    // TODO: Implement actual password reset logic
    throw new AppError(501, 'Password reset functionality not implemented');
  };
}

// Create and export a single instance with the WebSocket service
export const createAuthController = (wsService: WebSocketService) => {
  return new AuthController(wsService);
}; 