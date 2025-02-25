import { User } from '../database/entities/User';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      location?: {
        country: string;
        city: string;
        latitude: number;
        longitude: number;
      };
    }
  }
}

// Extend the base Request type and make user property required
export type RequestWithUser = Request & {
  user: NonNullable<Express.Request['user']>;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}; 