import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour in seconds
  private readonly prefix = 'admin-ai:';
  private isConnected = false;

  private constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Retrying Redis connection in ${delay}ms... (attempt ${times})`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      autoResubscribe: true,
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Connected to Redis');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis is ready to accept commands');
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  public async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const fullKey = this.getKey(key);
      
      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
      
      logger.debug(`Cache set: ${fullKey}`);
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.redis.get(fullKey);
      
      if (!value) {
        return null;
      }

      logger.debug(`Cache hit: ${fullKey}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await this.redis.del(fullKey);
      logger.debug(`Cache deleted: ${fullKey}`);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  public async setHash(key: string, field: string, value: any): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      const serializedValue = JSON.stringify(value);
      await this.redis.hset(fullKey, field, serializedValue);
      logger.debug(`Cache hash set: ${fullKey}.${field}`);
    } catch (error) {
      logger.error(`Error setting cache hash ${key}.${field}:`, error);
      throw error;
    }
  }

  public async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.redis.hget(fullKey, field);
      
      if (!value) {
        return null;
      }

      logger.debug(`Cache hash hit: ${fullKey}.${field}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting cache hash ${key}.${field}:`, error);
      return null;
    }
  }

  public async getAllHash<T>(key: string): Promise<Record<string, T>> {
    try {
      const fullKey = this.getKey(key);
      const hash = await this.redis.hgetall(fullKey);
      
      if (!hash || Object.keys(hash).length === 0) {
        return {};
      }

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value) as T;
      }

      logger.debug(`Cache hash all hit: ${fullKey}`);
      return result;
    } catch (error) {
      logger.error(`Error getting all cache hash ${key}:`, error);
      return {};
    }
  }

  public async deleteHash(key: string, field: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await this.redis.hdel(fullKey, field);
      logger.debug(`Cache hash deleted: ${fullKey}.${field}`);
    } catch (error) {
      logger.error(`Error deleting cache hash ${key}.${field}:`, error);
      throw error;
    }
  }

  public async increment(key: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.redis.incr(fullKey);
      logger.debug(`Cache incremented: ${fullKey}`);
      return value;
    } catch (error) {
      logger.error(`Error incrementing cache key ${key}:`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await this.redis.expire(fullKey, seconds);
      logger.debug(`Cache expiration set: ${fullKey} (${seconds}s)`);
    } catch (error) {
      logger.error(`Error setting expiration for cache key ${key}:`, error);
      throw error;
    }
  }

  public async flush(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Error flushing cache:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  public async getKeys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(this.getKey(pattern));
    } catch (error) {
      logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  public async deleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    
    try {
      await this.redis.del(...keys);
      logger.debug(`Deleted multiple cache keys: ${keys.join(', ')}`);
    } catch (error) {
      logger.error('Error deleting multiple cache keys:', error);
      throw error;
    }
  }
} 