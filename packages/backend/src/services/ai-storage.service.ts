import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export class AIStorageService {
  private static instance: AIStorageService;
  private db: Database | null = null;
  private readonly dbPath: string;
  private readonly dataDir: string;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.dbPath = path.join(this.dataDir, 'ai.sqlite');
  }

  public static getInstance(): AIStorageService {
    if (!AIStorageService.instance) {
      AIStorageService.instance = new AIStorageService();
    }
    return AIStorageService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.info('Created data directory:', this.dataDir);
      }

      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      logger.info('AI Storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Storage:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        context TEXT,
        metadata TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        type TEXT,
        metadata TEXT,
        timestamp INTEGER,
        FOREIGN KEY (conversationId) REFERENCES ai_conversations(id)
      );

      CREATE TABLE IF NOT EXISTS ai_user_preferences (
        userId TEXT PRIMARY KEY,
        settings TEXT NOT NULL,
        lastUpdated INTEGER
      );

      CREATE TABLE IF NOT EXISTS ai_model_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        metadata TEXT,
        expiresAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS ai_training_data (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        labels TEXT,
        metadata TEXT,
        createdAt INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_userId ON ai_conversations(userId);
      CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON ai_messages(conversationId);
      CREATE INDEX IF NOT EXISTS idx_model_cache_expires ON ai_model_cache(expiresAt);
    `);
  }

  public async saveConversation(data: {
    id: string;
    userId: string;
    context?: any;
    metadata?: any;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    await this.db.run(
      `INSERT INTO ai_conversations (id, userId, context, metadata, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.userId,
        data.context ? JSON.stringify(data.context) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        now,
        now
      ]
    );
  }

  public async saveMessage(data: {
    id: string;
    conversationId: string;
    content: string;
    role: string;
    type?: string;
    metadata?: any;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO ai_messages (id, conversationId, content, role, type, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.conversationId,
        data.content,
        data.role,
        data.type || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        Date.now()
      ]
    );
  }

  public async getConversation(id: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const conversation = await this.db.get(
      'SELECT * FROM ai_conversations WHERE id = ?',
      [id]
    );

    if (!conversation) return null;

    const messages = await this.db.all(
      'SELECT * FROM ai_messages WHERE conversationId = ? ORDER BY timestamp ASC',
      [id]
    );

    return {
      ...conversation,
      context: conversation.context ? JSON.parse(conversation.context) : null,
      metadata: conversation.metadata ? JSON.parse(conversation.metadata) : null,
      messages: messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    };
  }

  public async getUserPreferences(userId: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const prefs = await this.db.get(
      'SELECT * FROM ai_user_preferences WHERE userId = ?',
      [userId]
    );

    return prefs ? {
      ...prefs,
      settings: JSON.parse(prefs.settings)
    } : null;
  }

  public async saveUserPreferences(userId: string, settings: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT OR REPLACE INTO ai_user_preferences (userId, settings, lastUpdated)
       VALUES (?, ?, ?)`,
      [userId, JSON.stringify(settings), Date.now()]
    );
  }

  public async cacheModelData(key: string, value: any, ttlMs: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const expiresAt = Date.now() + ttlMs;
    await this.db.run(
      `INSERT OR REPLACE INTO ai_model_cache (key, value, expiresAt)
       VALUES (?, ?, ?)`,
      [key, JSON.stringify(value), expiresAt]
    );
  }

  public async getModelCache(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const cached = await this.db.get(
      'SELECT * FROM ai_model_cache WHERE key = ? AND expiresAt > ?',
      [key, now]
    );

    return cached ? JSON.parse(cached.value) : null;
  }

  public async saveTrainingData(data: {
    id: string;
    type: string;
    content: any;
    labels?: string[];
    metadata?: any;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO ai_training_data (id, type, content, labels, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.type,
        JSON.stringify(data.content),
        data.labels ? JSON.stringify(data.labels) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        Date.now()
      ]
    );
  }

  public async cleanup(): Promise<void> {
    if (!this.db) return;

    const now = Date.now();
    await this.db.run('DELETE FROM ai_model_cache WHERE expiresAt <= ?', [now]);
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
} 