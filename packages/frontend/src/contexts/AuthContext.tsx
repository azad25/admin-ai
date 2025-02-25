import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  changePassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthStateChange = useCallback(async (token: string | null) => {
    try {
      if (!token) {
        setUser(null);
        if (!location.pathname.match(/^\/(login|register)$/)) {
          navigate('/login', { replace: true });
        }
        return;
      }

      // Set token in localStorage and axios headers
      localStorage.setItem('token', token);
      
      // Get current user with the token
      const user = await authService.getCurrentUser();
      setUser(user);

      // If we're on the login page but already authenticated, redirect to home
      if (location.pathname === '/login') {
        navigate('/', { replace: true });
      }
    } catch (error) {
      logger.error('Auth state change failed:', error);
      setUser(null);
      localStorage.removeItem('token');
      if (!location.pathname.match(/^\/(login|register)$/)) {
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  // Initial auth check
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        await handleAuthStateChange(token);
      } catch (error) {
        logger.error('Initial auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [handleAuthStateChange]);

  // Listen for storage events (token changes in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        handleAuthStateChange(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [handleAuthStateChange]);

  // Listen for auth error events
  useEffect(() => {
    const handleAuthError = () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
      if (!location.pathname.match(/^\/(login|register)$/)) {
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, [navigate, location.pathname]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing token before attempting login
      localStorage.removeItem('token');
      
      const response = await authService.login({ email, password });
      
      if (!response.token || !response.user) {
        throw new Error('Invalid response from server');
      }
      
      // Let handleAuthStateChange handle token storage and user state
      await handleAuthStateChange(response.token);
    } catch (error: any) {
      setUser(null);
      localStorage.removeItem('token');
      const message = error?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      logger.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      await handleAuthStateChange(null);
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register({ email, password, name });
      localStorage.setItem('token', response.token);
      await handleAuthStateChange(response.token);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      await authService.changePassword(currentPassword, newPassword);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to change password.';
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        register,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 