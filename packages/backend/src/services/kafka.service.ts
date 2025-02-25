import { Kafka, Producer, Consumer, EachMessagePayload, KafkaConfig } from 'kafkajs';
import { logger } from '../utils/logger';
import { WebSocketService, getWebSocketService } from './websocket.service';
import { AIMessage } from '@admin-ai/shared/src/types/ai';

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

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private wsService?: WebSocketService;

  constructor() {
    const config: KafkaConfig = {
      clientId: process.env.KAFKA_CLIENT_ID || 'admin-ai',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 5
      }
    };

    this.kafka = new Kafka(config);
    this.producer = this.kafka.producer();
  }

  public setWebSocketService(wsService: WebSocketService) {
    this.wsService = wsService;
    logger.info('WebSocket service set in KafkaService');
  }

  async connect() {
    try {
      await this.producer.connect();
      logger.info('Connected to Kafka');
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      for (const consumer of this.consumers.values()) {
        await consumer.disconnect();
      }
      logger.info('Disconnected from Kafka');
    } catch (error) {
      logger.error('Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  async sendMessage(topic: string, message: KafkaMessage) {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });
      logger.debug(`Sent message to topic ${topic}:`, message);
    } catch (error) {
      logger.error(`Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  async subscribe(topic: string, groupId: string, callback?: (message: KafkaMessage) => Promise<void>) {
    try {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          try {
            const parsedMessage: KafkaMessage = JSON.parse(message.value?.toString() || '');
            logger.info(`Received message from topic ${topic}:`, parsedMessage);

            if (callback) {
              await callback(parsedMessage);
            }

            // Send real-time updates via WebSocket if userId is provided
            if (parsedMessage.userId) {
              const aiMessage: AIMessage = {
                id: crypto.randomUUID(),
                content: `New message received from ${topic}`,
                role: 'system',
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
                      messageType: parsedMessage.type,
                    },
                  },
                  timestamp: Date.now().toString(),
                  read: false,
                },
              };
              this.wsService?.sendToUser(parsedMessage.userId, aiMessage);
            }
          } catch (error) {
            logger.error(`Failed to process message from topic ${topic}:`, error);
          }
        },
      });

      this.consumers.set(topic, consumer);
      logger.info(`Subscribed to topic ${topic}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  async unsubscribe(topic: string) {
    try {
      const consumer = this.consumers.get(topic);
      if (consumer) {
        await consumer.disconnect();
        this.consumers.delete(topic);
        logger.info(`Unsubscribed from topic ${topic}`);
      }
    } catch (error) {
      logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
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
      this.wsService.sendToUser(message.userId, {
        id: crypto.randomUUID(),
        content: `AI Task ${message.type}: ${message.data?.taskName || 'Unknown task'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: message.type === 'task_failed' ? 'error' : 'success',
          category: 'ai',
          source: message.metadata?.source,
          timestamp: Date.now(),
          read: false
        }
      });
    }
  }

  private async handleSystemMetrics(message: KafkaMessage) {
    if (!this.wsService) {
      logger.warn('WebSocket service not initialized, skipping notification');
      return;
    }
    this.wsService.broadcast('metrics_update', {
      type: message.type,
      data: message.data,
      timestamp: message.timestamp
    });
  }

  private async handleErrorLog(message: KafkaMessage) {
    if (!this.wsService) {
      logger.warn('WebSocket service not initialized, skipping notification');
      return;
    }
    if (message.userId) {
      this.wsService.sendToUser(message.userId, {
        id: crypto.randomUUID(),
        content: `Error: ${message.data?.message || 'Unknown error'}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'error',
          category: 'system',
          source: message.metadata?.source,
          timestamp: Date.now(),
          read: false
        }
      });
    }
  }

  private async handleUserActivity(message: KafkaMessage) {
    // Handle user activity tracking
    if (message.userId) {
      const aiMessage: AIMessage = {
        id: crypto.randomUUID(),
        content: `Activity tracked: ${message.type}`,
        role: 'system',
        metadata: {
          type: 'notification',
          status: 'info',
          category: 'activity',
          source: {
            ...message.metadata?.source,
            details: message.data,
          },
          timestamp: Date.now().toString(),
          read: false,
        },
      };
      this.wsService?.sendToUser(message.userId, aiMessage);
    }
  }

  private async handleNotification(message: KafkaMessage) {
    // Handle general notifications
    if (message.userId) {
      const aiMessage: AIMessage = {
        id: crypto.randomUUID(),
        content: message.data.content,
        role: 'system',
        metadata: {
          type: 'notification',
          status: message.data.status || 'info',
          category: message.data.category || 'general',
          source: {
            ...message.metadata?.source,
            details: message.data,
          },
          timestamp: Date.now().toString(),
          read: false,
        },
      };
      this.wsService?.sendToUser(message.userId, aiMessage);
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
}

// Export a singleton instance
export const kafkaService = new KafkaService(); 