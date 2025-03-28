import { jwtDecode, JwtPayload as BaseJwtPayload } from 'jwt-decode';
import { logger } from '../utils/logger';
import axios from 'axios';

// Extend the JwtPayload interface to include userId
interface JwtPayload extends BaseJwtPayload {
  userId?: string;
}

export class AuthService {
  private static instance: AuthService | null = null;
  private token: string | null = null;

  private constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  public getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded?.userId || null;
    } catch (error) {
      logger.error('Failed to decode token:', error);
      return null;
    }
  }

  getUserIdFromToken(token: string): string | null {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded?.userId || null;
    } catch (error) {
      logger.error('Failed to decode token', { error });
      return null;
    }
  }

  private setUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  async login(credentials: { username: string; password: string }): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await axios.post('/api/auth/login', credentials);
        if (response.data.token) {
          this.setToken(response.data.token);
          this.setUser(response.data.user);
          return;
        }
      } catch (error) {
        retries++;
        if (retries === MAX_RETRIES) {
          logger.error('Login failed:', error);
          throw error;
        }
        logger.debug(`Login attempt ${retries} failed, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
} 