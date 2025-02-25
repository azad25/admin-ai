import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { systemMetricsService } from '../services/systemMetrics.service';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

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

export const errorHandler = async (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If headers have already been sent, don't try to send another response
  if (res.headersSent) {
    return next(err);
  }

  const error = err as AppError;
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id || null,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    location: getLocationFromRequest(req),
    timestamp: new Date().toISOString(),
    requestBody: req.body,
    requestQuery: req.query,
    requestParams: req.params,
    statusCode: error.statusCode
  };

  // Log to file system
  if (error.statusCode >= 500) {
    logger.error('Server Error:', { 
      ...errorDetails,
      type: 'ServerError'
    });
  } else {
    logger.warn('Client Error:', { 
      ...errorDetails,
      type: 'ClientError'
    });
  }

  // Log to database through metrics service
  try {
    await systemMetricsService.logError(errorDetails);
  } catch (logError) {
    logger.error('Failed to log error to database:', logError);
  }

  // Development vs Production error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(error.statusCode).json({
      status: error.status,
      error: error,
      message: error.message,
      stack: error.stack
    });
  } else {
    // Production: don't leak error details
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.isOperational ? error.message : 'Something went wrong'
    });
  }
}; 