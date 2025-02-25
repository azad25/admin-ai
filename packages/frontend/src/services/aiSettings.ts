import axios from 'axios';
import { LLMProvider, AIProviderConfig } from '@admin-ai/shared/src/types/ai';

const api = axios.create({
  baseURL: '/api/settings/providers',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject('Request timed out. Please try again.');
    }
    return Promise.reject(error.response?.data?.error || error.message || 'An error occurred');
  }
);

export interface SaveProviderSettingsData {
  apiKey: string;
  selectedModel?: string;
  isActive?: boolean;
}

export const aiSettingsService = {
  async getAllProviderSettings(): Promise<AIProviderConfig[]> {
    try {
      const { data } = await api.get('/');
      return data;
    } catch (error) {
      console.error('Failed to get all provider settings:', error);
      throw error;
    }
  },

  async getProviderSettings(provider: LLMProvider): Promise<AIProviderConfig | null> {
    try {
      const { data } = await api.get(`/${provider}`);
      return data;
    } catch (error) {
      console.error(`Failed to get provider settings for ${provider}:`, error);
      throw error;
    }
  },

  async getDecryptedApiKey(provider: LLMProvider): Promise<string> {
    try {
      const { data } = await api.get(`/${provider}/key`);
      return data.apiKey;
    } catch (error) {
      console.error(`Failed to get API key for ${provider}:`, error);
      throw error;
    }
  },

  async saveProviderSettings(
    provider: LLMProvider,
    settings: SaveProviderSettingsData
  ): Promise<AIProviderConfig> {
    try {
      // If we have an API key, always use POST to create/update settings
      if (settings.apiKey) {
        const { data } = await api.post(`/${provider}`, settings);
        return data;
      }
      
      // For other updates (like isActive or selectedModel) without API key, use PUT
      const { data } = await api.put(`/${provider}`, settings);
      return data;
    } catch (error) {
      console.error(`Failed to save provider settings for ${provider}:`, error);
      throw error;
    }
  },

  async verifyProvider(provider: LLMProvider): Promise<{
    isVerified: boolean;
    availableModels?: string[];
  }> {
    try {
      const { data } = await api.post(`/${provider}/verify`, { provider });
      return data;
    } catch (error) {
      console.error(`Failed to verify provider ${provider}:`, error);
      throw error;
    }
  },

  async deleteProviderSettings(provider: LLMProvider): Promise<void> {
    try {
      await api.delete(`/${provider}`);
    } catch (error) {
      console.error(`Failed to delete provider settings for ${provider}:`, error);
      throw error;
    }
  },
}; 