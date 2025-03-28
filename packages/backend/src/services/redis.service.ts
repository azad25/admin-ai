import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CONFIG, REDIS_KEYS, REDIS_TTL } from '../config/redis.config';
import { logger } from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis(REDIS_CONFIG);
    this.setupEventListeners();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.info('Redis connection closed');
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      logger.debug(`Set Redis key: ${key}`);
    } catch (error) {
      logger.error(`Failed to set Redis key ${key}:`, error);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Failed to get Redis key ${key}:`, error);
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      logger.debug(`Deleted Redis key: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete Redis key ${key}:`, error);
      throw error;
    }
  }

  public async setWithTTL(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.set(key, value, ttl);
    } catch (error) {
      logger.error(`Failed to set Redis key ${key} with TTL:`, error);
      throw error;
    }
  }

  public async publish(channel: string, message: any): Promise<void> {
    try {
      await this.client.publish(channel, JSON.stringify(message));
      logger.debug(`Published message to channel: ${channel}`);
    } catch (error) {
      logger.error(`Failed to publish message to channel ${channel}:`, error);
      throw error;
    }
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.subscribe(channel);
      
      subscriber.on('message', (channel, message) => {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          logger.error(`Error processing message from channel ${channel}:`, error);
        }
      });

      logger.info(`Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      logger.error(`Failed to subscribe to Redis channel ${channel}:`, error);
      throw error;
    }
  }

  public async increment(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Failed to increment Redis key ${key}:`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Failed to set expiration for Redis key ${key}:`, error);
      throw error;
    }
  }
} 