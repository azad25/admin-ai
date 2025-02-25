import axios from 'axios';
import { logger } from '../utils/logger';

// Configure axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',  // Point to backend server
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000,
  withCredentials: true
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      logger.debug('Adding auth token to request');
    } else {
      logger.debug('No auth token found for request');
    }
    
    logger.debug('Making API request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      headers: { ...config.headers, Authorization: config.headers.Authorization ? '[REDACTED]' : undefined }
    });
    
    return config;
  },
  (error) => {
    logger.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    logger.debug('API Response:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // Log error details
      logger.error('API Error Response:', {
        status: error.response.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        data: error.response.data
      });

      // For 401 errors, remove the token and trigger a custom event
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-error'));
      }
    } else if (error.request) {
      logger.error('Network Error:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        error: error.message
      });
    } else {
      logger.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api; 