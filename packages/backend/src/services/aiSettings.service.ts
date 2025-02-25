import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { AISettings } from '../database/entities/AISettings';
import { encrypt, decrypt } from '../utils/encryption';
import { LLMProvider } from '@admin-ai/shared/src/types/ai';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

export class AISettingsService {
  private repository: Repository<AISettings>;

  constructor() {
    this.repository = AppDataSource.getRepository(AISettings);
  }

  async getProviderSettings(userId: string, provider: LLMProvider) {
    const settings = await this.repository.findOne({
      where: { userId, provider },
    });

    if (!settings) {
      return {
        provider,
        isActive: false,
        isVerified: false,
        selectedModel: null,
        availableModels: [],
        settings: {}
      };
    }

    return {
      provider: settings.provider,
      isActive: settings.isActive,
      isVerified: settings.isVerified,
      selectedModel: settings.selectedModel,
      availableModels: settings.availableModels,
      settings: settings.settings,
      lastVerified: settings.lastVerified
    };
  }

  async getDecryptedApiKey(userId: string, provider: LLMProvider) {
    const settings = await this.repository.findOne({
      where: { userId, provider },
    });

    if (!settings || !settings.apiKey) {
      return null;
    }

    return decrypt(settings.apiKey);
  }

  async getAllProviderSettings(userId: string) {
    const settings = await this.repository.find({
      where: { userId },
    });

    return settings.map(setting => ({
      provider: setting.provider,
      isActive: setting.isActive,
      isVerified: setting.isVerified,
      selectedModel: setting.selectedModel,
      availableModels: setting.availableModels,
      settings: setting.settings,
      lastVerified: setting.lastVerified
    }));
  }

  async saveProviderSettings(userId: string, provider: LLMProvider, data: {
    apiKey: string;
    selectedModel?: string;
    isActive?: boolean;
  }) {
    try {
      // Validate provider type
      if (!['openai', 'anthropic', 'gemini'].includes(provider)) {
        throw new AppError(400, 'Invalid provider type');
      }

      let settings = await this.repository.findOne({
        where: { userId, provider },
      });

      if (!settings) {
        settings = this.repository.create({
          userId,
          provider,
          apiKey: encrypt(data.apiKey),
          selectedModel: data.selectedModel || null,
          isActive: data.isActive ?? true,
          isVerified: false,
          availableModels: [], // Initialize as empty array for TypeORM
          settings: {}, // TypeORM will handle jsonb conversion
          lastVerified: null
        });
      } else {
        settings.apiKey = encrypt(data.apiKey);
        if (data.selectedModel !== undefined) {
          settings.selectedModel = data.selectedModel || null;
        }
        if (typeof data.isActive === 'boolean') {
          settings.isActive = data.isActive;
        }
        // Ensure arrays and objects are properly initialized
        settings.availableModels = Array.isArray(settings.availableModels) ? settings.availableModels : [];
        settings.settings = settings.settings || {};
      }

      // Save the settings
      const savedSettings = await this.repository.save(settings);

      // Return the saved settings
      return {
        provider: savedSettings.provider,
        isActive: savedSettings.isActive,
        isVerified: savedSettings.isVerified,
        selectedModel: savedSettings.selectedModel,
        availableModels: savedSettings.availableModels || [],
        settings: savedSettings.settings || {},
        lastVerified: savedSettings.lastVerified
      };
    } catch (error) {
      logger.error('Failed to save provider settings:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Failed to save provider settings');
    }
  }

  async deleteProviderSettings(userId: string, provider: LLMProvider) {
    const settings = await this.repository.findOne({
      where: { userId, provider },
    });

    if (settings) {
      await this.repository.remove(settings);
    }
  }

  async updateProviderSettings(userId: string, provider: LLMProvider, settings: {
    selectedModel?: string;
    isActive?: boolean;
    settings?: Record<string, any>;
  }) {
    const aiSettings = await this.repository.findOne({
      where: { userId, provider },
    });

    if (!aiSettings) {
      throw new AppError(404, 'Provider settings not found');
    }

    if (settings.selectedModel) {
      aiSettings.selectedModel = settings.selectedModel;
    }
    if (typeof settings.isActive === 'boolean') {
      aiSettings.isActive = settings.isActive;
    }
    if (settings.settings) {
      aiSettings.settings = settings.settings;
    }

    await this.repository.save(aiSettings);
    return this.getProviderSettings(userId, provider);
  }

  async verifyProviderSettings(userId: string, provider: LLMProvider, settings?: Record<string, any>) {
    const aiSettings = await this.repository.findOne({
      where: { userId, provider },
    });

    if (!aiSettings) {
      throw new AppError(404, 'Provider settings not found');
    }

    try {
      const apiKey = decrypt(aiSettings.apiKey);
      let availableModels: string[] = [];

      switch (provider) {
        case 'openai':
          availableModels = ['gpt-4', 'gpt-3.5-turbo'];
          break;
        case 'gemini':
          availableModels = ['gemini-2.0-flash', 'gemini-pro'];
          break;
        case 'anthropic':
          availableModels = ['claude-3-opus', 'claude-3-sonnet'];
          break;
      }

      aiSettings.isVerified = true;
      aiSettings.lastVerified = new Date();
      aiSettings.availableModels = availableModels;
      if (settings) {
        aiSettings.settings = settings;
      }

      await this.repository.save(aiSettings);

      return {
        success: true,
        availableModels,
        settings: aiSettings.settings
      };
    } catch (error) {
      logger.error('Provider verification failed:', error);
      aiSettings.isVerified = false;
      aiSettings.lastVerified = new Date();
      await this.repository.save(aiSettings);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async verifyProvider(userId: string, provider: LLMProvider) {
    return this.verifyProviderSettings(userId, provider);
  }
} 