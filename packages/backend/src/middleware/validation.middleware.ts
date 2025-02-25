import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/error';

interface ValidationConfig {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

export const validateRequest = (config: ValidationConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (config.body) {
        req.body = await config.body.parseAsync(req.body);
      }
      if (config.query) {
        req.query = await config.query.parseAsync(req.query);
      }
      if (config.params) {
        req.params = await config.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'Validation failed', error.errors));
      } else {
        next(error);
      }
    }
  };
}; 