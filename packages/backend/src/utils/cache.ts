import { RedisService } from '../services/redis.service';
import { logger } from './logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private static instance: CacheService;
  private redisService: RedisService;
  private defaultTTL: number = 3600; // 1 hour
  private defaultPrefix: string = 'cache:';

  private constructor(redisService: RedisService) {
    this.redisService = redisService;
  }

  public static getInstance(redisService: RedisService): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(redisService);
    }
    return CacheService.instance;
  }

  private getKey(key: string, prefix?: string): string {
    return `${prefix || this.defaultPrefix}${key}`;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const cacheKey = this.getKey(key, options.prefix);
      const value = await this.redisService.get(cacheKey);
      return value as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const cacheKey = this.getKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      await this.redisService.setWithTTL(cacheKey, value, ttl);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.getKey(key, options.prefix);
      await this.redisService.delete(cacheKey);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      const pattern = this.getKey('*', prefix);
      // Note: This is a simplified version. In a real implementation,
      // you would need to handle pattern matching and deletion properly
      await this.redisService.delete(pattern);
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await getter();
    await this.set(key, value, options);
    return value;
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keyPattern = this.getKey(pattern);
      // Note: This is a simplified version. In a real implementation,
      // you would need to handle pattern matching and deletion properly
      await this.redisService.delete(keyPattern);
    } catch (error) {
      logger.error(`Cache invalidate error for pattern ${pattern}:`, error);
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key, options.prefix);
      const value = await this.redisService.get(cacheKey);
      return value !== null;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const cacheKey = this.getKey(key, options.prefix);
      return await this.redisService.increment(cacheKey);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, seconds: number, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.getKey(key, options.prefix);
      await this.redisService.expire(cacheKey, seconds);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
    }
  }
} 