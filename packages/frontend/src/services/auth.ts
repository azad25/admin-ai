import { User } from '@admin-ai/shared';
import api from './api';
import { logger } from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  role?: 'USER' | 'ADMIN';
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      logger.debug('Attempting login:', { email: credentials.email });
      const { data } = await api.post<LoginResponse>('/auth/login', credentials);
      
      // Ensure we have both user and token in the response
      if (!data.user || !data.token) {
        throw new Error('Invalid response format from server');
      }
      
      // Store the token
      this.setToken(data.token);
      
      logger.debug('Login successful:', { user: data.user });
      return data;
    } catch (error: any) {
      logger.error('Login failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { data, headers } = await api.get<User>('/auth/me');
      
      // Check for token refresh
      const newToken = headers['x-new-token'];
      if (newToken) {
        this.setToken(newToken);
      }

      if (!data || !data.id) {
        throw new Error('Invalid user data received from server');
      }

      return data;
    } catch (error: any) {
      // If token is invalid or expired, clear it
      if (error?.response?.status === 401) {
        this.setToken(null);
      }
      logger.error('Failed to get current user:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  },

  async register(registerData: RegisterData): Promise<LoginResponse> {
    try {
      logger.debug('Sending registration request:', {
        ...registerData,
        password: '[REDACTED]'
      });
      const { data } = await api.post<LoginResponse>('/auth/register', {
        ...registerData,
        role: 'USER'
      });
      
      // Ensure we have both user and token in the response
      if (!data.user || !data.token) {
        throw new Error('Invalid response format from server');
      }
      
      logger.debug('Registration successful:', { user: data.user });
      return data;
    } catch (error: any) {
      logger.error('Registration failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error: any) {
      logger.error('Logout failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
    } finally {
      localStorage.removeItem('auth_token');
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
    } catch (error: any) {
      logger.error('Password change failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await api.post('/auth/forgot-password', { email });
    } catch (error: any) {
      logger.error('Password reset request failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await api.post('/auth/reset-password', { token, newPassword });
    } catch (error: any) {
      logger.error('Password reset failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  },

  // Token management
  setToken(token: string | null) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}; 