import { EventEmitter } from 'events';
import { logger } from './logger';
import { KafkaService } from '../services/kafka.service';

export interface EventData {
  type: string;
  payload: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class EventService extends EventEmitter {
  private static instance: EventService;
  private kafkaService: KafkaService;
  private eventHandlers: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;

  private constructor(kafkaService: KafkaService) {
    super();
    this.kafkaService = kafkaService;
  }

  public static getInstance(kafkaService: KafkaService): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService(kafkaService);
    }
    return EventService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Subscribe to Kafka topics
      await this.kafkaService.subscribeToTopics(
        ['system-events', 'user-events', 'ai-events'],
        'event-processor-group',
        this.handleKafkaMessage.bind(this)
      );

      this.isInitialized = true;
      logger.info('Event service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize event service:', error);
      throw error;
    }
  }

  private async handleKafkaMessage(payload: { topic: string; partition: number; message: any }): Promise<void> {
    try {
      const { topic, message } = payload;
      const eventData: EventData = {
        type: message.type,
        payload: message.data,
        timestamp: new Date().toISOString(),
        metadata: message.metadata
      };

      // Emit the event locally
      this.emit(eventData.type, eventData);

      // Call registered handlers
      const handlers = this.eventHandlers.get(eventData.type) || [];
      for (const handler of handlers) {
        try {
          await handler(eventData);
        } catch (error) {
          logger.error(`Error in event handler for ${eventData.type}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error handling Kafka message:', error);
    }
  }

  public async emitEvent(eventData: EventData): Promise<void> {
    try {
      // Emit locally
      this.emit(eventData.type, eventData);

      // Publish to Kafka
      await this.kafkaService.publish(
        this.getTopicForEvent(eventData.type),
        eventData
      );

      // Call registered handlers
      const handlers = this.eventHandlers.get(eventData.type) || [];
      for (const handler of handlers) {
        try {
          await handler(eventData);
        } catch (error) {
          logger.error(`Error in event handler for ${eventData.type}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Error emitting event ${eventData.type}:`, error);
      throw error;
    }
  }

  public onEvent(eventType: string, handler: (event: EventData) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  public removeEventHandler(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  private getTopicForEvent(eventType: string): string {
    if (eventType.startsWith('system.')) return 'system-events';
    if (eventType.startsWith('user.')) return 'user-events';
    if (eventType.startsWith('ai.')) return 'ai-events';
    return 'system-events';
  }

  public async emitSystemEvent(type: string, payload: any, metadata?: Record<string, any>): Promise<void> {
    await this.emitEvent({
      type: `system.${type}`,
      payload,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  public async emitUserEvent(type: string, payload: any, metadata?: Record<string, any>): Promise<void> {
    await this.emitEvent({
      type: `user.${type}`,
      payload,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  public async emitAIEvent(type: string, payload: any, metadata?: Record<string, any>): Promise<void> {
    await this.emitEvent({
      type: `ai.${type}`,
      payload,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  public async cleanup(): Promise<void> {
    try {
      // Unsubscribe from Kafka topics
      await this.kafkaService.unsubscribe('system-events');
      await this.kafkaService.unsubscribe('user-events');
      await this.kafkaService.unsubscribe('ai-events');

      // Clear event handlers
      this.eventHandlers.clear();

      this.isInitialized = false;
      logger.info('Event service cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up event service:', error);
      throw error;
    }
  }
} 