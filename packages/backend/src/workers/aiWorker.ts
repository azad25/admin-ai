import { Job, Worker } from 'bullmq';
import { logger } from '../utils/logger';
import { queueService } from '../services/queue.service';
import { kafkaService } from '../services/kafka.service';
import { cacheService } from '../services/cache.service';
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

const aiService = new AIService();

export const aiWorker = new Worker<AITaskData>('ai-tasks', async (job: Job<AITaskData, any, string>) => {
  try {
    logger.info(`Processing AI task: ${job.name}`, { jobId: job.id });

    // Send start message to Kafka
    const timestamp = new Date().toISOString();
    await kafkaService.sendMessage('ai-events', {
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
    await kafkaService.sendMessage('ai-events', {
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
    await kafkaService.sendMessage('ai-events', {
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