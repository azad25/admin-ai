import { KafkaConfig } from 'kafkajs';

export const KAFKA_CONFIG: KafkaConfig = {
  clientId: 'admin-ai-backend',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_SASL === 'true' ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME || '',
    password: process.env.KAFKA_PASSWORD || ''
  } : undefined
};

export const KAFKA_TOPICS = {
  SYSTEM_METRICS: 'system-metrics',
  USER_ACTIVITY: 'user-activity',
  ERROR_LOGS: 'error-logs',
  AI_OPERATIONS: 'ai-operations',
  DASHBOARD_UPDATES: 'dashboard-updates',
  PERFORMANCE_METRICS: 'performance-metrics',
  SECURITY_EVENTS: 'security-events',
  USAGE_ANALYTICS: 'usage-analytics'
} as const;

export const KAFKA_CONSUMER_GROUPS = {
  DASHBOARD: 'dashboard-consumer-group',
  AI_ANALYSIS: 'ai-analysis-consumer-group',
  METRICS_PROCESSOR: 'metrics-processor-group',
  LOG_PROCESSOR: 'log-processor-group'
} as const;

export const KAFKA_PARTITIONS = {
  [KAFKA_TOPICS.SYSTEM_METRICS]: 3,
  [KAFKA_TOPICS.USER_ACTIVITY]: 3,
  [KAFKA_TOPICS.ERROR_LOGS]: 3,
  [KAFKA_TOPICS.AI_OPERATIONS]: 3,
  [KAFKA_TOPICS.DASHBOARD_UPDATES]: 3,
  [KAFKA_TOPICS.PERFORMANCE_METRICS]: 3,
  [KAFKA_TOPICS.SECURITY_EVENTS]: 3,
  [KAFKA_TOPICS.USAGE_ANALYTICS]: 3
} as const; 