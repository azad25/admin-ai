import { LLMProvider, AIProviderConfig } from '@admin-ai/shared';
import { wsService } from './websocket.service';
import { store } from '../store';
import { setProviders, setError, setLoading, setConnected } from '../store/slices/aiSlice';
import { logger } from '../utils/logger';
import { api } from './api';
import { authService } from './auth';

interface SaveProviderSettings {
  apiKey: string;
  selectedModel: string;
  isActive: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  apiKey?: string;
  models: AIModel[];
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  provider: string;
  contextWindow: number;
  maxTokens: number;
  costPer1kTokensInput: number;
  costPer1kTokensOutput: number;
}

export interface AISettings {
  providers: AIProvider[];
  defaultProvider: string;
  defaultModel: string;
}

// Create a class for the service
class AISettingsService {
  private settings: AISettings | null = null;
  private initialized = false;
  private initializing = false;
  private initPromise: Promise<void> | null = null;
  private initTimeout: number | null = null;

  constructor() {
    this.settings = null;
    this.initialized = false;
    this.initializing = false;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the service
   * This should be called before using any other methods
   */
  public async initialize(): Promise<void> {
    // Check if user is authenticated before initializing
    if (!authService.isAuthenticated()) {
      logger.debug('AISettingsService initialization skipped - user not authenticated');
      return;
    }

    if (this.initialized) {
      return;
    }

    if (this.initializing && this.initPromise) {
      return this.initPromise;
    }

    this.initializing = true;
    
    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        logger.debug('Initializing AISettingsService');
        
        // Set a timeout for initialization
        this.initTimeout = window.setTimeout(() => {
          if (!this.initialized) {
            const error = new Error('AISettingsService initialization timed out');
            logger.error('AISettingsService initialization timed out');
            reject(error);
            this.initializing = false;
          }
        }, 10000);
        
        // Fetch initial settings
        await this.fetchSettings();
        
        // Initialize WebSocket connection for settings updates
        this.initializeWebSocket();
        
        this.initialized = true;
        this.initializing = false;
        
        if (this.initTimeout) {
          clearTimeout(this.initTimeout);
          this.initTimeout = null;
        }
        
        logger.info('AISettingsService initialized successfully');
        resolve();
      } catch (error) {
        logger.error('Failed to initialize AISettingsService:', error);
        this.initializing = false;
        
        if (this.initTimeout) {
          clearTimeout(this.initTimeout);
          this.initTimeout = null;
        }
        
        reject(error);
      }
    });
    
    return this.initPromise;
  }

  /**
   * Ensure the service is initialized before proceeding
   * This is a helper method to use before any operation that requires initialization
   */
  private async ensureInitialized(): Promise<void> {
    // Check if user is authenticated before proceeding
    if (!authService.isAuthenticated()) {
      throw new Error('User is not authenticated');
    }

    if (!this.initialized) {
      if (!this.initializing) {
        await this.initialize();
      } else if (this.initPromise) {
        await this.initPromise;
      } else {
        throw new Error('AISettingsService is not initialized and cannot be initialized');
      }
    }
  }

  /**
   * Initialize WebSocket connection for settings updates
   */
  private initializeWebSocket(): void {
    // Listen for settings updates from WebSocket
    wsService.on('settings:update', (data: any) => {
      logger.debug('Received settings update from WebSocket:', data);
      if (data && data.settings) {
        this.settings = data.settings;
      }
    });
  }

  /**
   * Fetch settings from the API
   */
  private async fetchSettings(): Promise<void> {
    try {
      const response = await api.get('/settings/ai');
      if (response.data && response.data.settings) {
        this.settings = response.data.settings;
        logger.debug('Fetched AI settings:', this.settings);
      } else {
        throw new Error('Invalid settings response format');
      }
    } catch (error) {
      logger.error('Failed to fetch AI settings:', error);
      throw error;
    }
  }

  /**
   * Get all AI settings
   */
  public async getSettings(): Promise<AISettings> {
    await this.ensureInitialized();
    
    if (!this.settings) {
      throw new Error('AI settings not available');
    }
    
    return this.settings;
  }

  /**
   * Get all providers
   */
  public async getProviders(): Promise<AIProvider[]> {
    await this.ensureInitialized();
    if (!this.settings) {
      throw new Error('Settings not initialized');
    }
    return this.settings.providers;
  }

  /**
   * Get all provider settings
   * @returns Array of provider configurations
   */
  public async getAllProviderSettings(): Promise<any[]> {
    try {
      const response = await api.get('/settings/ai');
      if (response.data && Array.isArray(response.data.providers)) {
        return response.data.providers || [];
      } else if (response.data && response.data.settings && Array.isArray(response.data.settings.providers)) {
        return response.data.settings.providers || [];
      } else {
        logger.error('Invalid provider settings format:', response.data);
        return [];
      }
    } catch (error) {
      logger.error('Failed to fetch provider settings:', error);
      throw error;
    }
  }

  /**
   * Get a specific provider by ID
   */
  public async getProvider(providerId: string): Promise<AIProvider | null> {
    await this.ensureInitialized();
    
    if (!this.settings) {
      throw new Error('AI settings not available');
    }
    
    return this.settings.providers.find(p => p.id === providerId) || null;
  }

  /**
   * Get all models for a specific provider
   */
  public async getModels(providerId: string): Promise<AIModel[]> {
    await this.ensureInitialized();
    
    if (!this.settings) {
      throw new Error('AI settings not available');
    }
    
    const provider = this.settings.providers.find(p => p.id === providerId);
    return provider ? provider.models : [];
  }

  /**
   * Get a specific model by ID
   */
  public async getModel(modelId: string): Promise<AIModel | null> {
    await this.ensureInitialized();
    
    if (!this.settings) {
      throw new Error('AI settings not available');
    }
    
    for (const provider of this.settings.providers) {
      const model = provider.models.find(m => m.id === modelId);
      if (model) {
        return model;
      }
    }
    
    return null;
  }

  /**
   * Update provider settings
   */
  public async updateProvider(providerId: string, updates: Partial<AIProvider>): Promise<AIProvider> {
    await this.ensureInitialized();
    
    try {
      const response = await api.post(`/settings/providers/${providerId}`, updates);
      
      // Update local settings
      if (this.settings) {
        const providerIndex = this.settings.providers.findIndex(p => p.id === providerId);
        if (providerIndex >= 0) {
          this.settings.providers[providerIndex] = {
            ...this.settings.providers[providerIndex],
            ...response.data
          };
        }
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to update provider ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Update model settings
   */
  public async updateModel(modelId: string, updates: Partial<AIModel>): Promise<AIModel> {
    await this.ensureInitialized();
    
    try {
      const response = await api.put(`/settings/ai/models/${modelId}`, updates);
      
      // Update local settings
      if (this.settings) {
        for (const provider of this.settings.providers) {
          const modelIndex = provider.models.findIndex(m => m.id === modelId);
          if (modelIndex >= 0) {
            provider.models[modelIndex] = {
              ...provider.models[modelIndex],
              ...response.data
            };
            break;
          }
        }
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to update model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Update default provider and model
   */
  public async updateDefaults(defaultProvider: string, defaultModel: string): Promise<AISettings> {
    await this.ensureInitialized();
    
    try {
      const response = await api.put('/settings/ai/defaults', {
        defaultProvider,
        defaultModel
      });
      
      // Update local settings
      if (this.settings) {
        this.settings.defaultProvider = response.data.defaultProvider;
        this.settings.defaultModel = response.data.defaultModel;
      }
      
      return response.data;
    } catch (error) {
      logger.error('Failed to update default settings:', error);
      throw error;
    }
  }

  /**
   * Verify a provider's API key
   * @param provider The provider to verify
   * @returns A promise that resolves when the verification is complete
   */
  public async verifyProvider(provider: LLMProvider): Promise<void> {
    try {
      await api.post(`/settings/providers/${provider}/verify`);
    } catch (error) {
      logger.error(`Failed to verify provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Delete a provider's settings
   * @param provider The provider to delete
   * @returns A promise that resolves when the deletion is complete
   */
  public async deleteProvider(provider: LLMProvider): Promise<void> {
    try {
      await api.delete(`/settings/providers/${provider}`);
    } catch (error) {
      logger.error(`Failed to delete provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get decrypted API key for a provider
   * @param provider Provider ID
   * @returns Decrypted API key
   */
  public async getDecryptedApiKey(provider: LLMProvider): Promise<string> {
    try {
      logger.debug(`Fetching decrypted API key for provider: ${provider}`);
      const response = await api.get(`/settings/providers/${provider}/key`);
      
      // Check both possible response formats
      if (response.status === 200) {
        if (response.data && response.data.key) {
          logger.debug(`Successfully retrieved API key for provider: ${provider} (key format)`);
          return response.data.key;
        } else if (response.data && response.data.apiKey) {
          logger.debug(`Successfully retrieved API key for provider: ${provider} (apiKey format)`);
          return response.data.apiKey;
        } else {
          logger.warn(`Invalid response format for API key: ${provider}`, response.data);
          throw new Error('Invalid response format for API key');
        }
      } else {
        logger.warn(`Failed to retrieve API key for provider: ${provider}`, response.status);
        throw new Error(`Failed to retrieve API key: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to get decrypted API key for provider: ${provider}`, error);
      throw error;
    }
  }
}

// Create a single instance
export const aiSettingsService = new AISettingsService();

// Export the class type for type declarations
export type { AISettingsService };

// Export type for window augmentation
declare global {
  interface Window {
    aiSettingsService: AISettingsService;
    wsService: any;
  }
}