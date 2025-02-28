import { randomBytes } from 'crypto';
import { AppDataSource } from '../database';
import { ApiKey } from '../database/entities/ApiKey';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class APIKeyService {
  private static instance: APIKeyService;
  private apiKeyRepository = AppDataSource.getRepository(ApiKey);

  private constructor() {}

  public static getInstance(): APIKeyService {
    if (!APIKeyService.instance) {
      APIKeyService.instance = new APIKeyService();
    }
    return APIKeyService.instance;
  }

  async getAllKeys(userId: string): Promise<ApiKey[]> {
    try {
      return await this.apiKeyRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to get API keys:', error);
      throw new AppError(500, 'Failed to get API keys');
    }
  }

  async createKey(userId: string, name: string): Promise<ApiKey> {
    try {
      if (!name) {
        throw new AppError(400, 'Name is required');
      }

      const key = `ak_${randomBytes(32).toString('hex')}`;
      const apiKey = await this.apiKeyRepository.save({
        name,
        key,
        userId,
      });

      return apiKey;
    } catch (error) {
      logger.error('Failed to create API key:', error);
      throw new AppError(500, 'Failed to create API key');
    }
  }

  async updateKey(userId: string, id: string, name: string): Promise<ApiKey> {
    try {
      if (!name) {
        throw new AppError(400, 'Name is required');
      }

      const apiKey = await this.apiKeyRepository.findOne({
        where: { id, userId },
      });

      if (!apiKey) {
        throw new AppError(404, 'API key not found');
      }

      apiKey.name = name;
      return await this.apiKeyRepository.save(apiKey);
    } catch (error) {
      logger.error('Failed to update API key:', error);
      throw new AppError(500, 'Failed to update API key');
    }
  }

  async deleteKey(userId: string, id: string): Promise<void> {
    try {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id, userId },
      });

      if (!apiKey) {
        throw new AppError(404, 'API key not found');
      }

      await this.apiKeyRepository.remove(apiKey);
    } catch (error) {
      logger.error('Failed to delete API key:', error);
      throw new AppError(500, 'Failed to delete API key');
    }
  }

  async regenerateKey(userId: string, id: string): Promise<ApiKey> {
    try {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id, userId },
      });

      if (!apiKey) {
        throw new AppError(404, 'API key not found');
      }

      apiKey.key = `ak_${randomBytes(32).toString('hex')}`;
      return await this.apiKeyRepository.save(apiKey);
    } catch (error) {
      logger.error('Failed to regenerate API key:', error);
      throw new AppError(500, 'Failed to regenerate API key');
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { key },
      });

      if (!apiKey) {
        return false;
      }

      // Update last used timestamp
      apiKey.lastUsed = new Date();
      await this.apiKeyRepository.save(apiKey);

      return true;
    } catch (error) {
      logger.error('Failed to validate API key:', error);
      return false;
    }
  }
} 