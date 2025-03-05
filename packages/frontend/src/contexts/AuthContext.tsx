import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@admin-ai/shared';
import { authService, LoginCredentials } from '../services/auth';
import { wsService } from '../services/websocket.service';
import { logger } from '../utils/logger';
import { initializeServices } from '../services/initialize';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          logger.debug('Token found, checking authentication');
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          
          // Connect to WebSocket with the token
          try {
            await wsService.connect(token);
          } catch (wsError) {
            logger.error('Failed to connect to WebSocket:', wsError);
            // Don't fail auth if WebSocket fails
          }
        }
      } catch (error) {
        logger.error('Authentication check failed:', error);
        // Clear token if it's invalid
        authService.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for storage events (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth_token') {
        if (!event.newValue) {
          // Token was removed in another tab
          setUser(null);
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        } else if (event.newValue !== event.oldValue) {
          // Token was changed in another tab
          authService.getCurrentUser()
            .then(setUser)
            .catch(() => {
              setUser(null);
              navigate('/login');
            });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-error', () => {
      setUser(null);
      navigate('/login');
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-error', () => {});
    };
  }, [navigate, location.pathname]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.debug('Attempting login');
      const { user, token } = await authService.login({ email, password });
      setUser(user);
      
      // Initialize services after successful login
      try {
        await initializeServices();
        logger.debug('Services initialized after login');
      } catch (serviceError) {
        logger.error('Failed to initialize services after login:', serviceError);
        // Continue even if service initialization fails
      }
      
      // Connect to WebSocket with the new token
      try {
        await wsService.connect(token);
      } catch (wsError) {
        logger.error('Failed to connect to WebSocket after login:', wsError);
        // Don't fail login if WebSocket fails
      }
      
      // Redirect to the intended page or dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
      
      logger.debug('Login successful, redirecting to:', from);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Login failed';
      setError(errorMessage);
      logger.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      await authService.logout();
      wsService.disconnect();
      setUser(null);
      navigate('/login');
    } catch (error) {
      logger.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { user, token } = await authService.register({ name, email, password });
      setUser(user);
      
      // Connect to WebSocket with the new token
      try {
        await wsService.connect(token);
      } catch (wsError) {
        logger.error('Failed to connect to WebSocket after registration:', wsError);
      }
      
      navigate('/');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      logger.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.changePassword(oldPassword, newPassword);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Password change failed';
      setError(errorMessage);
      logger.error('Password change failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 