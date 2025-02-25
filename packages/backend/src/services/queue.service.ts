import Queue from 'bull';
import { logger } from '../utils/logger';

interface QueueOptions {
  name: string;
  concurrency?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

class QueueService {
  private queues: Map<string, Queue.Queue> = new Map();

  constructor() {
    // Clean up queues on process exit
    process.on('SIGTERM', this.closeQueues.bind(this));
    process.on('SIGINT', this.closeQueues.bind(this));
  }

  createQueue(options: QueueOptions): Queue.Queue {
    const { name, concurrency = 1, attempts = 3, backoff } = options;

    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts,
        backoff: backoff || {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    queue.on('error', (error) => {
      logger.error(`Queue ${name} error:`, error);
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} in queue ${name} failed:`, error);
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} in queue ${name} completed`);
    });

    this.queues.set(name, queue);
    return queue;
  }

  async addJob<T>(queueName: string, data: T, options?: Queue.JobOptions): Promise<Queue.Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(data, options);
  }

  async processQueue<T>(
    queueName: string,
    processor: (job: Queue.Job<T>) => Promise<any>,
    concurrency: number = 1
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.process(concurrency, processor);
  }

  async getQueue(name: string): Promise<Queue.Queue | undefined> {
    return this.queues.get(name);
  }

  async closeQueues(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) => queue.close());
    await Promise.all(closePromises);
    this.queues.clear();
  }

  async pauseQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.pause();
    }
  }

  async resumeQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.resume();
    }
  }

  async getQueueMetrics(name: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}

export const queueService = new QueueService(); 