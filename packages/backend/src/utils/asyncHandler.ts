import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types/express';

type AsyncFunction<T extends Request = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<any>;

// Type guard to check if request has user
function isRequestWithUser(req: Request): req is RequestWithUser {
  return req.user !== undefined;
}

export const asyncHandler = <T extends Request = Request>(
  fn: AsyncFunction<T>,
  requireAuth = false
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (requireAuth && !isRequestWithUser(req)) {
        throw new Error('User not authenticated');
      }
      await fn(req as T, res, next);
    } catch (error) {
      next(error);
    }
  };
}; 