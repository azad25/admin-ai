import { logger } from '../utils/logger';
import { kafkaService } from '../services/kafka.service';
import { CacheService } from '../services/cache.service';
import { dynamicCrudService } from '../services/dynamicCrud.service';
import { CrudPage } from '../database/entities/CrudPage';

const cacheService = CacheService.getInstance();

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

export const tableWorker = {
  async initialize() {
    try {
      await kafkaService.connect();
      await kafkaService.subscribe('table-tasks', 'table-worker', this.handleTableTask.bind(this));
      logger.info('Table worker initialized');
    } catch (error) {
      logger.error('Failed to initialize table worker:', error);
      throw error;
    }
  },

  async handleTableTask(message: any) {
    const { type, userId, data } = message;

    try {
      switch (type) {
        case 'create_table':
          await this.createTable(data, userId);
          break;
        case 'update_table':
          await this.updateTable(data, userId);
          break;
        case 'delete_table':
          await this.deleteTable(data, userId);
          break;
        default:
          logger.warn(`Unknown table task type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error processing table task ${type}:`, error);
      if (error instanceof Error) {
        await kafkaService.publish('table-events', {
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

  async createTable(data: TypedCrudPage, userId: string) {
    const result = await dynamicCrudService.createTable(data);
    await kafkaService.publish('table-events', {
      type: 'table_created',
      userId,
      data: {
        tableName: data.schema.tableName,
        schema: data.schema
      },
      timestamp: new Date().toISOString()
    });
  },

  async updateTable(data: TypedCrudPage, userId: string) {
    const result = await dynamicCrudService.update(data, data.id, data.schema, userId);
    await kafkaService.publish('table-events', {
      type: 'table_updated',
      userId,
      data: {
        tableName: data.schema.tableName,
        schema: data.schema
      },
      timestamp: new Date().toISOString()
    });
  },

  async deleteTable(data: TypedCrudPage, userId: string) {
    const result = await dynamicCrudService.dropTable(data);
    await kafkaService.publish('table-events', {
      type: 'table_deleted',
      userId,
      data: {
        tableName: data.schema.tableName
      },
      timestamp: new Date().toISOString()
    });
  }
};

// Handle worker shutdown
process.on('SIGTERM', async () => {
  logger.info('Table worker shutting down');
  await kafkaService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Table worker shutting down');
  await kafkaService.disconnect();
  process.exit(0);
}); 