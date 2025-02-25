import { Request, Response, NextFunction } from 'express';
import { queueService } from '../services/queue.service';
import { kafkaService } from '../services/kafka.service';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface QueuedRequest {
  id: string;
  method: string;
  path: string;
  body: any;
  userId: string;
  timestamp: number;
}

const QUEUE_PRIORITIES = {
  'GET': 1,    // Read operations are highest priority
  'POST': 2,   // Create operations are medium priority
  'PUT': 2,    // Update operations are medium priority
  'PATCH': 2,  // Partial updates are medium priority
  'DELETE': 3  // Delete operations are lowest priority
};

const REQUEST_QUEUES = {
  'crud': 'crud-requests',
  'ai': 'ai-requests',
  'auth': 'auth-requests',
  'metrics': 'metrics-requests'
};

export const requestQueueMiddleware = {
  async initialize() {
    // Create queues for different request types
    Object.values(REQUEST_QUEUES).forEach(queueName => {
      queueService.createQueue({
        name: queueName,
        concurrency: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });
    });

    // Process queued requests
    await this.setupQueueProcessors();
  },

  getQueueForRequest(path: string): string {
    if (path.startsWith('/api/crud')) return REQUEST_QUEUES.crud;
    if (path.startsWith('/api/ai')) return REQUEST_QUEUES.ai;
    if (path.startsWith('/api/auth')) return REQUEST_QUEUES.auth;
    if (path.startsWith('/api/metrics')) return REQUEST_QUEUES.metrics;
    return REQUEST_QUEUES.crud; // Default queue
  },

  async setupQueueProcessors() {
    // Process CRUD requests
    await queueService.processQueue(REQUEST_QUEUES.crud, async (job) => {
      const { id, method, path, body, userId } = job.data as QueuedRequest;
      await kafkaService.sendMessage('request-events', {
        type: 'request-processing',
        requestId: id,
        method,
        path,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Process AI requests
    await queueService.processQueue(REQUEST_QUEUES.ai, async (job) => {
      const { id, method, path, body, userId } = job.data as QueuedRequest;
      await kafkaService.sendMessage('ai-events', {
        type: 'ai-request-processing',
        requestId: id,
        method,
        path,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Process Auth requests
    await queueService.processQueue(REQUEST_QUEUES.auth, async (job) => {
      const { id, method, path, body, userId } = job.data as QueuedRequest;
      await kafkaService.sendMessage('auth-events', {
        type: 'auth-request-processing',
        requestId: id,
        method,
        path,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Process Metrics requests
    await queueService.processQueue(REQUEST_QUEUES.metrics, async (job) => {
      const { id, method, path, body, userId } = job.data as QueuedRequest;
      await kafkaService.sendMessage('metrics-events', {
        type: 'metrics-request-processing',
        requestId: id,
        method,
        path,
        userId,
        timestamp: new Date().toISOString()
      });
    });
  },

  middleware: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip queueing for WebSocket upgrades and static files
      if (req.headers.upgrade === 'websocket' || req.path.startsWith('/static')) {
        return next();
      }

      const requestId = crypto.randomUUID();
      const queueName = requestQueueMiddleware.getQueueForRequest(req.path);
      const priority = req.body.priority || 'normal';

      // Check cache first for GET requests
      if (req.method === 'GET') {
        const cacheKey = `request:${req.path}:${req.user?.id || 'anonymous'}`;
        const cachedResponse = await cacheService.get(cacheKey);
        if (cachedResponse) {
          logger.info(`Cache hit for request: ${req.path}`);
          return res.json(cachedResponse);
        }
      }

      // Queue the request
      const queuedRequest: QueuedRequest = {
        id: requestId,
        method: req.method,
        path: req.path,
        body: req.body,
        userId: req.user?.id || 'anonymous',
        timestamp: Date.now()
      };

      await queueService.addJob(queueName, queuedRequest, {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });

      // Emit event to Kafka
      await kafkaService.sendMessage('request-events', {
        type: 'request_started',
        jobId: requestId,
        data: {
          method: req.method,
          path: req.path,
          userId: req.user?.id,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          location: req.location
        },
        metadata: {
          source: {
            controller: 'RequestQueueMiddleware',
            action: 'processRequest'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      // Add request ID to response headers
      res.setHeader('X-Request-ID', requestId);

      next();
    } catch (error) {
      logger.error('Error in request queue middleware:', error);
      next(error);
    }
  }
}; 