import { EventEmitter } from 'events';
import { CacheService } from './cache.service';
import { logger } from '../utils/logger';

interface InvalidationPattern {
  pattern: string;
  ttl?: number;
}

interface InvalidationRule {
  entity: string;
  patterns: InvalidationPattern[];
  dependencies?: string[];
}

export class CacheInvalidationService extends EventEmitter {
  private static instance: CacheInvalidationService;
  private cache: CacheService;
  private rules: Map<string, InvalidationRule> = new Map();

  private constructor() {
    super();
    this.cache = CacheService.getInstance();
    this.setupDefaultRules();
  }

  public static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  private setupDefaultRules() {
    // User-related cache invalidation rules
    this.addRule({
      entity: 'user',
      patterns: [
        { pattern: 'user:*' },
        { pattern: 'users:list' },
        { pattern: 'auth:*' },
      ],
      dependencies: ['settings', 'preferences'],
    });

    // Settings-related cache invalidation rules
    this.addRule({
      entity: 'settings',
      patterns: [
        { pattern: 'settings:*' },
        { pattern: 'config:*' },
      ],
    });

    // CRUD pages cache invalidation rules
    this.addRule({
      entity: 'crudPage',
      patterns: [
        { pattern: 'crud:page:*' },
        { pattern: 'crud:list' },
      ],
      dependencies: ['crudData'],
    });

    // CRUD data cache invalidation rules
    this.addRule({
      entity: 'crudData',
      patterns: [
        { pattern: 'crud:data:*' },
      ],
    });

    // AI settings cache invalidation rules
    this.addRule({
      entity: 'aiSettings',
      patterns: [
        { pattern: 'ai:settings:*' },
        { pattern: 'ai:config' },
      ],
    });

    // Metrics cache invalidation rules
    this.addRule({
      entity: 'metrics',
      patterns: [
        { pattern: 'metrics:*', ttl: 300 }, // 5 minutes TTL for metrics
        { pattern: 'stats:*', ttl: 300 },
      ],
    });
  }

  public addRule(rule: InvalidationRule) {
    this.rules.set(rule.entity, rule);
  }

  public async invalidate(entity: string, identifier?: string): Promise<void> {
    try {
      const rule = this.rules.get(entity);
      if (!rule) {
        logger.warn(`No invalidation rule found for entity: ${entity}`);
        return;
      }

      // Invalidate patterns for the entity
      for (const { pattern, ttl } of rule.patterns) {
        const fullPattern = identifier 
          ? pattern.replace('*', identifier)
          : pattern;

        const keys = await this.cache.getKeys(fullPattern);
        
        if (keys.length > 0) {
          if (ttl) {
            // Set new TTL instead of deleting
            await Promise.all(keys.map(key => this.cache.expire(key, ttl)));
            logger.debug(`Updated TTL for cache keys matching ${fullPattern}`);
          } else {
            // Delete the keys
            await this.cache.deleteKeys(keys);
            logger.debug(`Invalidated cache keys matching ${fullPattern}`);
          }
        }
      }

      // Invalidate dependent entities
      if (rule.dependencies) {
        await Promise.all(
          rule.dependencies.map(dep => this.invalidate(dep, identifier))
        );
      }

      this.emit('invalidated', { entity, identifier });
    } catch (error) {
      logger.error(`Error invalidating cache for ${entity}:`, error);
      throw error;
    }
  }

  public async invalidateMultiple(entities: string[], identifier?: string): Promise<void> {
    await Promise.all(entities.map(entity => this.invalidate(entity, identifier)));
  }

  public async invalidateAll(): Promise<void> {
    try {
      await this.cache.flush();
      logger.info('Invalidated all cache entries');
      this.emit('invalidated', { entity: 'all' });
    } catch (error) {
      logger.error('Error invalidating all cache:', error);
      throw error;
    }
  }

  public async warmUp(entity: string, data: any, identifier?: string): Promise<void> {
    try {
      const rule = this.rules.get(entity);
      if (!rule) {
        logger.warn(`No cache rule found for entity: ${entity}`);
        return;
      }

      for (const { pattern, ttl } of rule.patterns) {
        const key = identifier 
          ? pattern.replace('*', identifier)
          : pattern.replace('*', 'list');

        await this.cache.set(key, data, ttl);
        logger.debug(`Warmed up cache for ${key}`);
      }

      this.emit('warmed', { entity, identifier });
    } catch (error) {
      logger.error(`Error warming up cache for ${entity}:`, error);
      throw error;
    }
  }
} 