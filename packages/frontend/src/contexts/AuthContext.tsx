import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { logger } from '../utils/logger';
import { wsService } from '../services/websocket.service';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        // Clear everything if no token
        authService.setToken(null);
        wsService.disconnect();
        setUser(null);
        setError(null);
        
        // Only redirect if we're not already on an auth page and not in the initial loading state
        if (!loading && !location.pathname.match(/^\/(login|register)$/)) {
          navigate('/login', { replace: true });
        }
        return;
      }

      // Set token in auth service first
      authService.setToken(token);
      
      try {
        // Get current user with the token
        const user = await authService.getCurrentUser();
        setUser(user);
        setError(null);

        // Set up WebSocket with the token after user is confirmed
        wsService.setToken(token);
        wsService.connect(); // Explicitly connect after setting token

        // If we're on the login page but already authenticated, redirect to home
        // Only redirect if we have a valid user and we're not in the process of refreshing
        if (location.pathname === '/login' && user) {
          navigate('/', { replace: true });
        }
      } catch (error: any) {
        // Handle specific API errors
        const message = error?.response?.data?.message || 'Authentication failed. Please log in again.';
        logger.error('Authentication error:', error);
        
        // Only clear auth state and redirect if it's not a token refresh error
        if (!error.response?.data?.refreshToken) {
          setError(message);
          authService.setToken(null);
          wsService.disconnect();
          setUser(null);
          
          // Only redirect if we're not already on an auth page
          if (!location.pathname.match(/^\/(login|register)$/)) {
            navigate('/login', { replace: true });
          }
        }
      }
    } catch (error: any) {
      logger.error('Auth state change failed:', error);
      const message = error?.response?.data?.message || 'An unexpected error occurred.';
      setError(message);
      
      // Clear everything on error
      authService.setToken(null);
      wsService.disconnect();
      setUser(null);
      
      // Only redirect if we're not already on an auth page
      if (!location.pathname.match(/^\/(login|register)$/)) {
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, location.pathname, loading]);

  // Initial auth check
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const token = authService.getToken();
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
      if (e.key === 'auth_token') {
        handleAuthStateChange(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [handleAuthStateChange]);

  // Listen for auth error events
  useEffect(() => {
    const handleAuthError = (error: any) => {
      // Only clear auth state if it's a fatal error
      if (error?.message?.includes('Authentication failed') || error?.message?.includes('Token expired')) {
        setUser(null);
        setError('Your session has expired. Please log in again.');
        if (!location.pathname.match(/^\/(login|register)$/)) {
          navigate('/login', { replace: true });
        }
      } else {
        // For other errors, just set the error message but don't log out
        setError(error?.message || 'Connection error. Please try again.');
      }
    };

    wsService.on('error', handleAuthError);
    return () => wsService.off('error', handleAuthError);
  }, [navigate, location.pathname]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First get the login response
      const response = await authService.login({ email, password });
      
      if (!response.token || !response.user) {
        setError('Invalid response from server');
        return;
      }
      
      // Set token first
      authService.setToken(response.token);
      
      // Set user state
      setUser(response.user);
      
      // Connect WebSocket with new token
      wsService.connect();
      
      // Navigate to home
      navigate('/', { replace: true });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      // Clear everything on error
      authService.setToken(null);
      wsService.disconnect();
      setUser(null);
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
      setError(null);
      authService.setToken(null);
      wsService.disconnect();
      setUser(null);
      navigate('/login', { replace: true });
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register({ email, password, name });
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
        isAuthenticated: !!user,
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