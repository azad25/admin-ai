import axios from 'axios';
import { logger } from '../utils/logger';

// List of endpoints that don't require authentication
const publicEndpoints = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/health'
];

// Configure axios instance
const api = axios.create({
  // Use relative URLs that will be handled by the Vite proxy
  baseURL: '/api',
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
    // Check if the URL already starts with /api
    const url = config.url || '';
    const hasApiPrefix = url.startsWith('/api');
    
    // Construct the full URL, avoiding duplicate /api prefixes
    const fullUrl = hasApiPrefix ? url : `/api${url}`;
    
    // Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      fullUrl.startsWith(endpoint)
    );
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      logger.debug('Adding auth token to request');
    } else if (!isPublicEndpoint) {
      // If this is not a public endpoint and there's no token, log a warning
      logger.warn('Attempting to access protected endpoint without authentication:', fullUrl);
    }
    
    logger.debug('Making API request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullUrl,
      isPublicEndpoint,
      headers: { ...config.headers, Authorization: config.headers.Authorization ? '[REDACTED]' : undefined }
    });
    
    return config;
  },
  (error) => {
    logger.error('API request error:', error);
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
        localStorage.removeItem('auth_token');
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

export { api };
export default api; 