import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

// PostgreSQL configuration for primary database
export const POSTGRES_CONFIG: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'admin_ai',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [join(__dirname, '../entities/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../migrations/**/*.{ts,js}')],
  subscribers: [join(__dirname, '../subscribers/**/*.{ts,js}')],
  ssl: process.env.POSTGRES_SSL === 'true',
  poolSize: 20,
  maxQueryExecutionTime: 1000
};

// SQLite configurations for AI operations
export const SQLITE_CONFIGS = {
  AI_ANALYSIS: {
    type: 'sqlite' as const,
    database: join(__dirname, '../../data/ai_analysis.db'),
    entities: [join(__dirname, '../entities/ai/**/*.entity.{ts,js}')],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production'
  },
  SYSTEM_DIAGNOSTICS: {
    type: 'sqlite' as const,
    database: join(__dirname, '../../data/system_diagnostics.db'),
    entities: [join(__dirname, '../entities/diagnostics/**/*.entity.{ts,js}')],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production'
  },
  PERFORMANCE_METRICS: {
    type: 'sqlite' as const,
    database: join(__dirname, '../../data/performance_metrics.db'),
    entities: [join(__dirname, '../entities/metrics/**/*.entity.{ts,js}')],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production'
  }
} as const;

// Database connection names
export const DB_CONNECTIONS = {
  POSTGRES: 'postgres',
  AI_ANALYSIS: 'ai_analysis',
  SYSTEM_DIAGNOSTICS: 'system_diagnostics',
  PERFORMANCE_METRICS: 'performance_metrics'
} as const; 