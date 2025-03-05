import { Job, Worker } from 'bullmq';
import { logger } from '../utils/logger';
import { queueService } from '../services/queue.service';
import { kafkaService } from '../services/kafka.service';
import { CacheService } from '../services/cache.service';
import { AIService } from '../services/ai.service';
import { WebSocketService } from '../services/websocket.service';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import { AppError } from '../utils/error';

interface AITaskData {
  taskName: string;
  params?: Record<string, unknown>;
  description?: string;
  schema?: Record<string, unknown>;
  dataset?: unknown[];
}

const cacheService = CacheService.getInstance();
const aiService = new AIService();

export const aiWorker = new Worker<AITaskData>('ai-tasks', async (job: Job<AITaskData, any, string>) => {
  try {
    logger.info(`Processing AI task: ${job.name}`, { jobId: job.id });

    // Send start message to Kafka
    const timestamp = new Date().toISOString();
    await kafkaService.publish('ai-events', {
      type: 'task_started',
      jobId: job.id,
      data: {
        taskName: job.name,
        params: job.data.params || {}
      },
      metadata: {
        timestamp,
        source: {
          controller: 'AIWorker',
          action: 'processTask'
        }
      },
      timestamp
    });

    // Process the task
    let result;
    switch (job.name) {
      case 'generate_schema':
        if (!job.data.description) throw new Error('Description is required');
        result = await aiService.generateSchema(job.data.description);
        break;
      case 'generate_crud_config':
        if (!job.data.schema) throw new Error('Schema is required');
        result = await aiService.generateCrudConfig(job.data.schema);
        break;
      case 'analyze_data':
        if (!job.data.dataset) throw new Error('Dataset is required');
        result = await aiService.analyzeData(job.data.dataset);
        break;
      case 'generate_dashboard':
        if (!job.data.dataset) throw new Error('Dataset is required');
        result = await aiService.generateDashboardSuggestions(job.data.dataset);
        break;
      default:
        throw new Error(`Unknown task type: ${job.name}`);
    }

    // Send completion message to Kafka
    const completionTimestamp = new Date().toISOString();
    await kafkaService.publish('ai-events', {
      type: 'task_completed',
      jobId: job.id,
      data: {
        taskName: job.name,
        result
      },
      metadata: {
        timestamp: completionTimestamp,
        source: {
          controller: 'AIWorker',
          action: 'processTask'
        }
      },
      timestamp: completionTimestamp
    });

    return result;
  } catch (error) {
    logger.error(`Failed to process AI task: ${job.name}`, error);

    // Send error message to Kafka
    const errorTimestamp = new Date().toISOString();
    await kafkaService.publish('ai-events', {
      type: 'task_failed',
      jobId: job.id,
      data: {
        taskName: job.name,
        error: error instanceof Error ? error.message : String(error)
      },
      metadata: {
        timestamp: errorTimestamp,
        source: {
          controller: 'AIWorker',
          action: 'processTask'
        }
      },
      timestamp: errorTimestamp
    });

    throw error;
  }
});

export async function startAIWorker() {
  try {
    logger.info('Starting AI worker');
    await aiWorker.waitUntilReady();
    logger.info('AI worker started');
  } catch (error) {
    logger.error('Failed to start AI worker:', error);
    throw error;
  }
}

export const aiWorkerHandler = {
  async initialize() {
    try {
      await kafkaService.connect();
      await kafkaService.subscribe('ai-tasks', 'ai-worker', this.handleAITask.bind(this));
      logger.info('AI worker initialized');
    } catch (error) {
      logger.error('Failed to initialize AI worker:', error);
      throw error;
    }
  },

  async handleAITask(message: any) {
    const { type, userId, data } = message;

    try {
      switch (type) {
        case 'analyze_request':
          await this.analyzeRequest(data, userId);
          break;
        case 'analyze_error':
          await this.analyzeError(data, userId);
          break;
        case 'analyze_metrics':
          await this.analyzeMetrics(data, userId);
          break;
        default:
          logger.warn(`Unknown AI task type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error processing AI task ${type}:`, error);
      if (error instanceof Error) {
        await kafkaService.publish('ai-events', {
          type: 'task_failed',
          userId,
          data: {
            taskName: type,
            error: error.message
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  },

  async analyzeRequest(data: any, userId: string) {
    const analysis = await aiService.analyzeData([data]);
    await kafkaService.publish('ai-events', {
      type: 'request_analyzed',
      userId,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  },

  async analyzeError(data: any, userId: string) {
    const analysis = await aiService.analyzeData([data]);
    await kafkaService.publish('ai-events', {
      type: 'error_analyzed',
      userId,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  },

  async analyzeMetrics(data: any, userId: string) {
    const analysis = await aiService.analyzeMetrics(data);
    await kafkaService.publish('ai-events', {
      type: 'metrics_analyzed',
      userId,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  }
};

// Handle worker shutdown
process.on('SIGTERM', async () => {
  logger.info('AI worker shutting down');
  await kafkaService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('AI worker shutting down');
  await kafkaService.disconnect();
  process.exit(0);
}); 