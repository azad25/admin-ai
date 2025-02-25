import { User } from '../database/entities/User';

declare global {
  namespace Express {
    interface Request {
      user: User;
      location?: {
        country: string;
        city: string;
        latitude: number;
        longitude: number;
      };
    }
  }
}

export interface RequestWithUser extends Request {
  user: User;
} 