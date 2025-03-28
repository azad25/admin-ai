import { RedisOptions } from 'ioredis';

export const REDIS_CONFIG: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

export const REDIS_KEYS = {
  // Real-time metrics cache
  METRICS: {
    SYSTEM: 'metrics:system',
    USER: 'metrics:user',
    PERFORMANCE: 'metrics:performance',
    AI: 'metrics:ai'
  },
  
  // Dashboard state
  DASHBOARD: {
    STATE: 'dashboard:state',
    UPDATES: 'dashboard:updates',
    ALERTS: 'dashboard:alerts'
  },
  
  // AI operations cache
  AI: {
    ANALYSIS: 'ai:analysis',
    SUGGESTIONS: 'ai:suggestions',
    DIAGNOSTICS: 'ai:diagnostics'
  },
  
  // Session and user data
  USER: {
    SESSION: 'user:session',
    ACTIVITY: 'user:activity',
    PREFERENCES: 'user:preferences'
  },
  
  // System state
  SYSTEM: {
    HEALTH: 'system:health',
    STATUS: 'system:status',
    CONFIG: 'system:config'
  }
} as const;

export const REDIS_TTL = {
  METRICS: 300, // 5 minutes
  DASHBOARD: 60, // 1 minute
  AI_ANALYSIS: 3600, // 1 hour
  USER_SESSION: 86400, // 24 hours
  SYSTEM_HEALTH: 300 // 5 minutes
} as const; 