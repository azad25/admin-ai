import { Job } from 'bull';
import { logger } from '../utils/logger';
import { queueService } from '../services/queue.service';
import { dynamicCrudService } from '../services/dynamicCrud.service';
import { kafkaService } from '../services/kafka.service';
import { CrudPage } from '../database/entities/CrudPage';
import { KafkaMessage } from '../services/kafka.service';

interface CrudPageSchema {
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    unique?: boolean;
  }>;
  tableName: string;
  description: string;
}

interface TypedCrudPage extends Omit<CrudPage, 'schema'> {
  schema: CrudPageSchema;
}

interface TableJobData {
  page: TypedCrudPage;
  userId: string;
}

async function processTableCreation(job: Job<TableJobData>) {
  const { page, userId } = job.data;

  try {
    logger.info(`Creating table for page ${page.id}`);
    await dynamicCrudService.createTable(page);

    // Emit success event
    await kafkaService.sendMessage('table-events', {
      type: 'table_created',
      userId,
      jobId: job.id.toString(),
      pageId: page.id,
      data: {
        tableName: page.schema.tableName,
        schema: page.schema
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: {
          controller: 'TableWorker',
          action: 'createTable'
        }
      },
      timestamp: new Date().toISOString()
    } as KafkaMessage);

    logger.info(`Table created successfully for page ${page.id}`);
  } catch (error) {
    logger.error(`Failed to create table for page ${page.id}:`, error);

    // Emit failure event
    await kafkaService.sendMessage('table-events', {
      type: 'table_creation_failed',
      userId,
      jobId: job.id.toString(),
      pageId: page.id,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: {
          controller: 'TableWorker',
          action: 'createTable'
        }
      },
      timestamp: new Date().toISOString()
    } as KafkaMessage);

    throw error;
  }
}

async function processTableDeletion(job: Job<TableJobData>) {
  const { page, userId } = job.data;

  try {
    logger.info(`Deleting table for page ${page.id}`);
    await dynamicCrudService.dropTable(page);

    // Emit success event
    await kafkaService.sendMessage('table-events', {
      type: 'table_deleted',
      userId,
      jobId: job.id.toString(),
      pageId: page.id,
      data: {
        tableName: page.schema.tableName
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: {
          controller: 'TableWorker',
          action: 'deleteTable'
        }
      },
      timestamp: new Date().toISOString()
    } as KafkaMessage);

    logger.info(`Table deleted successfully for page ${page.id}`);
  } catch (error) {
    logger.error(`Failed to delete table for page ${page.id}:`, error);

    // Emit failure event
    await kafkaService.sendMessage('table-events', {
      type: 'table_deletion_failed',
      userId,
      jobId: job.id.toString(),
      pageId: page.id,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: {
          controller: 'TableWorker',
          action: 'deleteTable'
        }
      },
      timestamp: new Date().toISOString()
    } as KafkaMessage);

    throw error;
  }
}

export async function startTableWorker() {
  // Create queues
  const tableCreationQueue = queueService.createQueue({
    name: 'table-creation',
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });

  const tableDeletionQueue = queueService.createQueue({
    name: 'table-deletion',
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });

  // Process jobs
  await queueService.processQueue('table-creation', processTableCreation);
  await queueService.processQueue('table-deletion', processTableDeletion);

  logger.info('Table worker started successfully');
}

// Handle worker shutdown
process.on('SIGTERM', async () => {
  logger.info('Table worker shutting down');
  await queueService.closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Table worker shutting down');
  await queueService.closeQueues();
  process.exit(0);
}); 