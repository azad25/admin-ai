import { Kafka, Producer, Consumer, EachMessagePayload, Partitioners } from 'kafkajs';
import { logger } from '../utils/logger';
import { WebSocketService, getWebSocketService } from './websocket.service';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import { KAFKA_CONFIG, KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '../config/kafka.config';
import { Logger } from '@nestjs/common';

export interface KafkaMessage {
  type: string;
  userId?: string;
  jobId?: string;
  requestId?: string;
  pageId?: string;
  dataId?: string;
  data?: any;
  metrics?: Record<string, any>;
  method?: string;
  path?: string;
  priority?: 'high' | 'normal' | 'low';
  queueName?: string;
  timestamp: string;
  metadata?: {
    timestamp: string;
    source?: {
      page?: string;
      controller?: string;
      action?: string;
      details?: Record<string, any>;
    };
  };
}

export type MessageHandler = (message: any) => Promise<void>;

export class KafkaService {
  private static instance: KafkaService;
  private readonly kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();
  private connectionActive = false;
  private wsService?: WebSocketService;
  private isInitialized = false;
  private readonly logger = new Logger(KafkaService.name);

  private constructor() {
    this.kafka = new Kafka({
      clientId: 'admin-ai',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL === 'true' ? {
        mechanism: 'plain',
        username: process.env.KAFKA_USERNAME || '',
        password: process.env.KAFKA_PASSWORD || ''
      } : undefined
    });
  }

  public static getInstance(): KafkaService {
    if (!KafkaService.instance) {
      KafkaService.instance = new KafkaService();
    }
    return KafkaService.instance;
  }

  public isConnected(): boolean {
    return this.connectionActive;
  }

  public setWebSocketService(wsService: WebSocketService) {
    this.wsService = wsService;
    logger.info('WebSocket service set in KafkaService');
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize producer with LegacyPartitioner
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });
      
      // Connect producer with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      while (retryCount < maxRetries) {
        try {
          await this.producer.connect();
          this.connectionActive = true;
          logger.info('Kafka producer connected successfully');
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          logger.warn(`Failed to connect to Kafka (attempt ${retryCount}/${maxRetries}), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      // Initialize consumers for AI events with proper timeout
      await this.initializeConsumers();
      this.isInitialized = true;
    } catch (error) {
      logger.error('Error initializing Kafka:', error);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    } else if (!this.connectionActive) {
      await this.producer.connect();
      this.connectionActive = true;
      logger.info('Kafka producer reconnected successfully');
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      for (const consumer of this.consumers.values()) {
        await consumer.disconnect();
      }
      this.consumers.clear();
      this.connectionActive = false;
      this.isInitialized = false;
      logger.info('Disconnected from Kafka');
    } catch (error) {
      logger.error('Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  public async publish(topic: string, message: any): Promise<void> {
    if (!this.connectionActive) {
      throw new Error('Kafka service is not connected');
    }

    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }]
      });
      this.logger.debug(`Message published to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Error publishing message to topic ${topic}:`, error);
      throw error;
    }
  }

  public async subscribe(
    topic: string,
    groupId: string,
    handler: MessageHandler
  ): Promise<void> {
    if (this.consumers.has(topic)) {
      throw new Error(`Already subscribed to topic ${topic}`);
    }

    try {
      const consumer = this.kafka.consumer({
        groupId,
        maxWaitTimeInMs: 100,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      this.handlers.set(topic, handler);
      this.consumers.set(topic, consumer);

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          try {
            const { topic, message } = payload;
            const handler = this.handlers.get(topic);
            
            if (!handler) {
              throw new Error(`No handler registered for topic ${topic}`);
            }

            if (!message.value) {
              logger.warn(`Received empty message on topic ${topic}`);
              return;
            }

            const parsedMessage = JSON.parse(message.value.toString());
            await handler(parsedMessage);
          } catch (error) {
            this.logger.error(`Error processing message from topic ${topic}:`, error);
          }
        },
      });

      this.logger.log(`Subscribed to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  public async unsubscribe(topic: string): Promise<void> {
    const consumer = this.consumers.get(topic);
    if (!consumer) {
      return;
    }

    try {
      await consumer.disconnect();
      this.consumers.delete(topic);
      this.handlers.delete(topic);
      this.logger.log(`Unsubscribed from topic ${topic}`);
    } catch (error) {
      this.logger.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }

  public isReady(): boolean {
    return this.connectionActive;
  }

  // Helper method to create standard topics
  async createStandardTopics() {
    const topics = [
      'ai-tasks',
      'system-metrics',
      'error-logs',
      'user-activity',
      'notifications',
    ];

    for (const topic of topics) {
      await this.subscribe(topic, `${topic}-group`, async (message) => {
        // Handle different types of messages
        switch (topic) {
          case 'ai-tasks':
            await this.handleAITask(message);
            break;
          case 'system-metrics':
            await this.handleSystemMetrics(message);
            break;
          case 'error-logs':
            await this.handleErrorLog(message);
            break;
          case 'user-activity':
            await this.handleUserActivity(message);
            break;
          case 'notifications':
            await this.handleNotification(message);
            break;
        }
      });
    }
  }

  private async handleAITask(message: KafkaMessage) {
    if (!this.wsService) {
      logger.warn('WebSocket service not initialized, skipping notification');
      return;
    }
    if (message.userId) {
      const timestamp = Date.now().toString();
      this.wsService.sendToUser(message.userId, 'ai:message', {
        id: crypto.randomUUID(),
        content: `AI Task ${message.type}: ${message.data?.taskName || 'Unknown task'}`,
        role: 'system',
        timestamp,
        metadata: {
          type: 'notification',
          status: message.type === 'task_failed' ? 'error' : 'success',
          category: 'ai',
          source: message.metadata?.source,
          timestamp,
          read: false
        }
      });
    }
  }

  private async handleSystemMetrics(message: KafkaMessage) {
    try {
      logger.debug('Received system metrics message from Kafka');
      
      // Broadcast to all connected clients
      this.wsService.broadcast('metrics:update', {
        health: message.data?.health,
        metrics: message.data?.metrics
      });
      
      // Also broadcast individual updates for dashboard widgets
      if (message.data?.health) {
        this.wsService.broadcast('health_update', message.data.health);
      }
      
      if (message.data?.metrics) {
        // Extract and broadcast specific metrics for different dashboard widgets
        const { metrics } = message.data;
        
        // Request metrics
        if (metrics.requests) {
          this.wsService.broadcast('request_metrics_update', metrics.requests);
        }
        
        // Location data
        if (metrics.locations) {
          this.wsService.broadcast('locations_update', metrics.locations);
        }
        
        // Logs
        if (metrics.logs) {
          this.wsService.broadcast('logs_update', metrics.logs);
        }
        
        // Error logs
        if (metrics.errors) {
          this.wsService.broadcast('error_logs_update', metrics.errors);
        }
        
        // Auth logs
        if (metrics.authLogs) {
          this.wsService.broadcast('auth_logs_update', metrics.authLogs);
        }
      }
      
      // Trigger AI analysis of the metrics
      if (this.aiService && message.data?.metrics) {
        const analysis = await this.aiService.analyzeMetrics(message.data.metrics);
        this.wsService.broadcast('metrics:analysis', analysis);
      }
      
    } catch (error) {
      logger.error('Error handling system metrics message:', error);
    }
  }

  private async handleErrorLog(message: KafkaMessage) {
    if (!this.wsService) {
      logger.warn('WebSocket service not initialized, skipping notification');
      return;
    }
    if (message.userId) {
      const timestamp = Date.now().toString();
      this.wsService.sendToUser(message.userId, 'ai:message', {
        id: crypto.randomUUID(),
        content: `Error: ${message.data?.message || 'Unknown error'}`,
        role: 'system',
        timestamp,
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: message.metadata?.source,
          timestamp,
          read: false
        }
      });
    }
  }

  private async handleUserActivity(message: KafkaMessage) {
    // Handle user activity tracking
    if (message.userId) {
      const timestamp = Date.now().toString();
      const aiMessage: AIMessage = {
        id: crypto.randomUUID(),
        content: `Activity tracked: ${message.type}`,
        role: 'system',
        timestamp,
        metadata: {
          type: 'notification',
          status: 'info',
          category: 'activity',
          source: {
            ...message.metadata?.source,
            details: message.data,
          },
          timestamp,
          read: false,
        },
      };
      this.wsService?.sendToUser(message.userId, 'ai:message', aiMessage);
    }
  }

  private async handleNotification(message: KafkaMessage) {
    if (!this.wsService) {
      logger.warn('WebSocket service not initialized, skipping notification');
      return;
    }
    if (message.userId) {
      const timestamp = Date.now().toString();
      this.wsService.sendToUser(message.userId, 'ai:message', {
        id: crypto.randomUUID(),
        content: message.data?.message || 'New notification',
        role: 'system',
        timestamp,
        metadata: {
          type: 'notification',
          status: message.data?.status || 'info',
          category: message.data?.category || 'system',
          source: message.metadata?.source,
          timestamp,
          read: false
        }
      });
    }
  }

  async createTopic(topic: string) {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic }],
      });
      await admin.disconnect();
      logger.info(`Created Kafka topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to create Kafka topic ${topic}:`, error);
      throw error;
    }
  }

  async subscribeToTopics(topics: string[], groupId: string, callback: (payload: { topic: string; partition: number; message: any }) => Promise<void>) {
    try {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();

      await Promise.all(
        topics.map(topic => consumer.subscribe({ topic, fromBeginning: true }))
      );

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          const value = message.value?.toString();

          try {
            const parsedMessage = value ? JSON.parse(value) : null;
            await callback({
              topic,
              partition,
              message: parsedMessage,
            });
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        },
      });

      this.consumers.set(groupId, consumer);
      logger.info(`Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topics ${topics.join(', ')}:`, error);
      throw error;
    }
  }

  private createNotificationMessage(content: string, category: string, details: any, status: 'info' | 'success' | 'warning' | 'error' = 'info'): AIMessage {
    const timestamp = Date.now().toString();
    return {
      id: crypto.randomUUID(),
      content,
      role: 'system',
      timestamp,
      metadata: {
        type: 'notification',
        status,
        category,
        source: {
          page: 'System',
          controller: 'KafkaService',
          action: 'messageReceived',
          details,
        },
        timestamp,
        read: false,
      },
    };
  }

  private createErrorMessage(error: Error, category: string): AIMessage {
    const timestamp = Date.now().toString();
    return {
      id: crypto.randomUUID(),
      content: error.message,
      role: 'system',
      timestamp,
      metadata: {
        type: 'notification',
        status: 'error',
        category,
        source: {
          page: 'System',
          controller: 'KafkaService',
          action: 'error',
          details: {
            name: error.name,
            stack: error.stack,
          },
        },
        timestamp,
        read: false,
      },
    };
  }

  private async sendWebSocketNotification(userId: string, topic: string, messageType: string) {
    const timestamp = Date.now().toString();
    const aiMessage: AIMessage = {
      id: crypto.randomUUID(),
      content: `New message received from ${topic}`,
      role: 'system',
      timestamp,
      metadata: {
        type: 'notification',
        status: 'info',
        category: 'kafka',
        source: {
          page: 'System',
          controller: 'KafkaService',
          action: 'messageReceived',
          details: {
            topic,
            messageType,
          },
        },
        timestamp,
        read: false,
      },
    };
    await this.wsService?.sendToUser(userId, 'ai:message', aiMessage);
  }

  private async sendWebSocketError(userId: string, error: any) {
    const timestamp = Date.now().toString();
    const aiMessage: AIMessage = {
      id: crypto.randomUUID(),
      content: error.message || 'An error occurred while processing the message',
      role: 'system',
      timestamp,
      metadata: {
        type: 'notification',
        status: 'error',
        category: 'kafka',
        source: {
          page: 'System',
          controller: 'KafkaService',
          action: 'error',
          details: error,
        },
        timestamp,
        read: false,
      },
    };
    await this.wsService?.sendToUser(userId, 'ai:message', aiMessage);
  }

  // Add a method to publish system metrics
  public async publishSystemMetrics(data: any): Promise<void> {
    try {
      await this.publish('system-metrics', {
        health: data.health,
        metrics: data.metrics,
        timestamp: new Date().toISOString()
      });
      logger.debug('Published system metrics to Kafka');
    } catch (error) {
      logger.error('Failed to publish system metrics to Kafka:', error);
    }
  }

  // Add a method to publish dashboard updates
  public async publishDashboardUpdate(type: string, data: any): Promise<void> {
    try {
      await this.publish(`dashboard-${type}`, {
        type,
        data,
        timestamp: new Date().toISOString()
      });
      logger.debug(`Published dashboard ${type} update to Kafka`);
    } catch (error) {
      logger.error(`Failed to publish dashboard ${type} update to Kafka:`, error);
    }
  }

  public async sendMessage(topic: keyof typeof KAFKA_TOPICS, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic: KAFKA_TOPICS[topic],
        messages: [{ value: JSON.stringify(message) }],
      });
      logger.debug(`Message sent to topic ${KAFKA_TOPICS[topic]}`);
    } catch (error) {
      logger.error(`Failed to send message to topic ${KAFKA_TOPICS[topic]}:`, error);
      throw error;
    }
  }

  public async createConsumer(groupId: keyof typeof KAFKA_CONSUMER_GROUPS, topics: Array<keyof typeof KAFKA_TOPICS>): Promise<Consumer> {
    const consumer = this.kafka.consumer({ groupId: KAFKA_CONSUMER_GROUPS[groupId] });
    
    try {
      await consumer.connect();
      await Promise.all(
        topics.map(topic => consumer.subscribe({ topic: KAFKA_TOPICS[topic] }))
      );
      this.consumers.set(groupId, consumer);
      logger.info(`Kafka consumer created for group ${KAFKA_CONSUMER_GROUPS[groupId]}`);
      return consumer;
    } catch (error) {
      logger.error(`Failed to create Kafka consumer for group ${KAFKA_CONSUMER_GROUPS[groupId]}:`, error);
      throw error;
    }
  }

  public async consumeMessages(
    groupId: keyof typeof KAFKA_CONSUMER_GROUPS,
    callback: (message: any) => Promise<void>
  ): Promise<void> {
    const consumer = this.consumers.get(groupId);
    if (!consumer) {
      throw new Error(`Consumer not found for group ${KAFKA_CONSUMER_GROUPS[groupId]}`);
    }

    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              await callback(JSON.parse(value));
            }
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        },
      });
    } catch (error) {
      logger.error(`Failed to consume messages for group ${KAFKA_CONSUMER_GROUPS[groupId]}:`, error);
      throw error;
    }
  }

  private async initializeConsumers(): Promise<void> {
    try {
      // Initialize consumer for AI analysis events
      const consumer = this.kafka.consumer({
        groupId: 'admin-ai-ai.analysis',
        sessionTimeout: 30000, // 30 seconds
        heartbeatInterval: 3000, // 3 seconds
        maxWaitTimeInMs: 1000, // 1 second
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      await consumer.connect();
      await consumer.subscribe({ topic: 'ai.analysis', fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            if (!message.value) {
              logger.warn(`Received empty message on topic ${topic}`);
              return;
            }

            const data = JSON.parse(message.value.toString());
            // Handle message...
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        },
      });

      this.consumers.set('ai.analysis', consumer);
      logger.info('Kafka consumer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer:', error);
      throw error;
    }
  }

  private async handleAnalysisMessage(message: any): Promise<void> {
    // Implement analysis message handling
    this.logger.debug('Handling analysis message:', message);
  }

  private async handleSuggestionsMessage(message: any): Promise<void> {
    // Implement suggestions message handling
    this.logger.debug('Handling suggestions message:', message);
  }

  private async handleActionsMessage(message: any): Promise<void> {
    // Implement actions message handling
    this.logger.debug('Handling actions message:', message);
  }

  private async handleDiagnosticsMessage(message: any): Promise<void> {
    // Implement diagnostics message handling
    this.logger.debug('Handling diagnostics message:', message);
  }
}

// Export a singleton instance
export const kafkaService = KafkaService.getInstance(); 