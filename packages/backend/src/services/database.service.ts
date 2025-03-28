import { DataSource } from 'typeorm';
import { POSTGRES_CONFIG, SQLITE_CONFIGS, DB_CONNECTIONS } from '../config/database.config';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private connections: Map<string, DataSource>;

  private constructor() {
    this.connections = new Map();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize PostgreSQL connection
      const postgresDS = new DataSource(POSTGRES_CONFIG);
      await postgresDS.initialize();
      this.connections.set(DB_CONNECTIONS.POSTGRES, postgresDS);
      logger.info('PostgreSQL connection initialized');

      // Initialize SQLite connections
      for (const [name, config] of Object.entries(SQLITE_CONFIGS)) {
        const sqliteDS = new DataSource(config);
        await sqliteDS.initialize();
        this.connections.set(name, sqliteDS);
        logger.info(`SQLite connection initialized for ${name}`);
      }
    } catch (error) {
      logger.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      for (const [name, connection] of this.connections.entries()) {
        await connection.destroy();
        logger.info(`Database connection closed for ${name}`);
      }
      this.connections.clear();
    } catch (error) {
      logger.error('Failed to close database connections:', error);
      throw error;
    }
  }

  public getConnection(name: keyof typeof DB_CONNECTIONS): DataSource {
    const connection = this.connections.get(DB_CONNECTIONS[name]);
    if (!connection) {
      throw new Error(`Database connection not found for ${name}`);
    }
    return connection;
  }

  public async executeQuery<T>(
    connectionName: keyof typeof DB_CONNECTIONS,
    query: string,
    parameters?: any[]
  ): Promise<T> {
    const connection = this.getConnection(connectionName);
    try {
      const result = await connection.query(query, parameters);
      return result as T;
    } catch (error) {
      logger.error(`Failed to execute query on ${connectionName}:`, error);
      throw error;
    }
  }

  public async transaction<T>(
    connectionName: keyof typeof DB_CONNECTIONS,
    callback: (queryRunner: any) => Promise<T>
  ): Promise<T> {
    const connection = this.getConnection(connectionName);
    const queryRunner = connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Transaction failed on ${connectionName}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async migrate(connectionName: keyof typeof DB_CONNECTIONS): Promise<void> {
    const connection = this.getConnection(connectionName);
    try {
      await connection.runMigrations();
      logger.info(`Migrations completed for ${connectionName}`);
    } catch (error) {
      logger.error(`Failed to run migrations for ${connectionName}:`, error);
      throw error;
    }
  }

  public async clearCache(connectionName: keyof typeof DB_CONNECTIONS): Promise<void> {
    const connection = this.getConnection(connectionName);
    try {
      await connection.queryResultCache?.clear();
      logger.info(`Cache cleared for ${connectionName}`);
    } catch (error) {
      logger.error(`Failed to clear cache for ${connectionName}:`, error);
      throw error;
    }
  }
} 