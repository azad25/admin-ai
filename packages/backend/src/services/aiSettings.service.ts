import { AppDataSource } from '../database';
import { AISettings } from '../database/entities/AISettings';
import { encrypt, decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { AIProviderConfig, LLMProvider } from '@admin-ai/shared/src/types/ai';
import { WebSocketService } from './websocket.service';
import { EventEmitter } from 'events';
import { GoogleGenerativeAI } from '@google/generative-ai';

type SafeWebSocketService = {
  isInitialized(): boolean;
  broadcast(event: string, data: any): void;
};

export class AISettingsService extends EventEmitter {
  private aiSettingsRepository = AppDataSource.getRepository(AISettings);
  private wsService: SafeWebSocketService | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private wsConnected: boolean = false;
  private wsInitialized: boolean = false;
  private wsInitCheckInterval: NodeJS.Timeout | null = null;
  private wsConnectionCheckInterval: NodeJS.Timeout | null = null;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readonly TIMEOUT_MS = 10000; // 10 second timeout
  private readonly MAX_RETRIES = 3;
  private retryCount = 0;
  private hasActiveProviders: boolean = false;

  constructor() {
    super();
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  private async checkForActiveProviders(): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      // Get all provider settings
      const allSettings = await this.aiSettingsRepository.find();
      
      // Check if any settings have active and verified providers
      this.hasActiveProviders = allSettings.some(settings => 
        settings.providers?.some(p => p.isVerified && p.isActive)
      );

      logger.info('Checked for active providers:', {
        hasActiveProviders: this.hasActiveProviders,
        totalSettings: allSettings.length,
        activeSettings: allSettings.filter(s => 
          s.providers?.some(p => p.isVerified && p.isActive)
        ).length,
        wsServiceAvailable: !!this.wsService,
        wsInitialized: this.wsService?.isInitialized() || false
      });

      // If we have active providers, ensure WebSocket is ready
      if (this.hasActiveProviders) {
        if (this.wsService?.isInitialized()) {
          logger.info('Active providers found and WebSocket service is initialized');
          this.wsInitialized = true;
          this.wsConnected = true;
          this.initialized = true;
          this.readyResolve();
          await this.checkAndBroadcastStatus();
        } else {
          logger.info('Active providers found but WebSocket service not ready, waiting for initialization');
        }
      } else {
        logger.info('No active providers found, service marked as ready');
        this.initialized = true;
        this.readyResolve();
      }
    } catch (error) {
      logger.error('Failed to check for active providers:', error);
      this.hasActiveProviders = false;
      this.initialized = true;
      this.readyResolve();
    }
  }

  public setWebSocketService(wsService: WebSocketService) {
    logger.info('Setting WebSocket service');
    
    // Clear any existing intervals
    if (this.wsInitCheckInterval) {
      clearInterval(this.wsInitCheckInterval);
      this.wsInitCheckInterval = null;
    }
    
    if (this.wsConnectionCheckInterval) {
      clearInterval(this.wsConnectionCheckInterval);
      this.wsConnectionCheckInterval = null;
    }

    // Set the new WebSocket service
    this.wsService = wsService;
    
    // Listen for WebSocket events
    wsService.on('connected', () => {
      logger.info('WebSocket connected event received');
      this.wsConnected = true;
      this.wsInitialized = true;
      this.checkAndBroadcastStatus().catch(error => {
        logger.error('Failed to broadcast status after connection:', error);
      });
    });

    wsService.on('disconnected', () => {
      logger.warn('WebSocket disconnected event received');
      this.wsConnected = false;
      this.wsInitialized = false;
    });
    
    // Set up listeners and check connection immediately
    this.setupWebSocketListeners();
    
    // Check WebSocket initialization status immediately
    if (wsService.isInitialized()) {
      logger.info('WebSocket service is already initialized');
      this.wsInitialized = true;
      this.wsConnected = true;
      this.setupConnectionCheck();
      
      // Check active providers and broadcast status
      this.checkForActiveProviders().catch(error => {
        logger.error('Failed to check for active providers after setting WebSocket service:', error);
      });
    } else {
      logger.info('WebSocket service not yet initialized, setting up initialization check');
      // Start initialization check
      this.wsInitCheckInterval = setInterval(() => {
        if (wsService.isInitialized()) {
          logger.info('WebSocket service initialized during check');
          this.wsInitialized = true;
          this.wsConnected = true;
          clearInterval(this.wsInitCheckInterval!);
          this.wsInitCheckInterval = null;
          this.setupConnectionCheck();
          this.checkForActiveProviders().catch(error => {
            logger.error('Failed to check for active providers after initialization:', error);
          });
        }
      }, 500);
    }
  }

  public async waitForReady(): Promise<void> {
    try {
      // Check current state first
      const hasVerifiedProviders = await this.hasVerifiedProviders();
      
      // If no active providers, check if we need to wait
      if (!hasVerifiedProviders) {
        logger.info('No verified providers, service ready for configuration');
        this.initialized = true;
        this.readyResolve();
        return;
      }

      // If we have providers but no WebSocket, we should wait
      if (!this.wsService?.isInitialized()) {
        logger.info('Waiting for WebSocket initialization with active providers');
        await Promise.race([
          this.readyPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service initialization timeout')), this.TIMEOUT_MS)
          )
        ]);
      }

      // After timeout or success, check state again
      const isReady = await this.isServiceReady();
      if (!isReady) {
        logger.warn('Service not ready after initialization attempt', {
          hasVerifiedProviders,
          wsInitialized: this.wsService?.isInitialized() || false,
          wsConnected: this.wsConnected
        });
      }
    } catch (error) {
      logger.error('Service initialization error:', error);
      // Do not mark as initialized on timeout if we have active providers
      const hasProviders = await this.hasVerifiedProviders();
      if (!hasProviders) {
        this.initialized = true;
        this.readyResolve();
      }
    }
  }

  private setupWebSocketListeners(): void {
    if (!this.wsService) {
      logger.warn('No WebSocket service available for setup');
      return;
    }

    // Clear any existing intervals
    if (this.wsInitCheckInterval) {
      clearInterval(this.wsInitCheckInterval);
      this.wsInitCheckInterval = null;
    }

    if (this.wsConnectionCheckInterval) {
      clearInterval(this.wsConnectionCheckInterval);
      this.wsConnectionCheckInterval = null;
    }

    // Check if already initialized
    if (this.wsService.isInitialized()) {
      logger.info('WebSocket service is already initialized during setup');
      this.wsInitialized = true;
      this.wsConnected = true;
      this.setupConnectionCheck();
      
      // Check active providers and broadcast status
      this.checkForActiveProviders().catch(error => {
        logger.error('Failed to check for active providers during setup:', error);
      });
      return;
    }

    // Set up initialization check with shorter interval
    this.wsInitCheckInterval = setInterval(async () => {
      try {
        if (this.wsService?.isInitialized()) {
          logger.info('WebSocket service initialized successfully during check');
          this.wsInitialized = true;
          this.wsConnected = true;
          
          // Clear the interval once initialized
          if (this.wsInitCheckInterval) {
            clearInterval(this.wsInitCheckInterval);
            this.wsInitCheckInterval = null;
          }
          
          this.setupConnectionCheck();
          
          // Check active providers and broadcast status
          await this.checkForActiveProviders();
          
          // Broadcast initial status
          await this.checkAndBroadcastStatus();
        }
      } catch (error) {
        logger.error('Error during WebSocket initialization check:', error);
      }
    }, 500);

    // Set up initial connection check
    this.setupConnectionCheck();
  }

  private setupConnectionCheck(): void {
    if (!this.wsService) {
      logger.warn('No WebSocket service available for connection check');
      return;
    }

    // Clear any existing interval
    if (this.wsConnectionCheckInterval) {
      clearInterval(this.wsConnectionCheckInterval);
      this.wsConnectionCheckInterval = null;
    }

    // Set up connection check
    this.wsConnectionCheckInterval = setInterval(async () => {
      try {
        const wasConnected = this.wsConnected;
        const isInitialized = this.wsService?.isInitialized() || false;
        
        // Update connection state
        this.wsConnected = isInitialized;
        this.wsInitialized = isInitialized;

        // Log connection state changes
        if (wasConnected !== this.wsConnected) {
          if (this.wsConnected) {
            logger.info('WebSocket connection established during check');
            // Check active providers and broadcast status immediately
            await this.checkForActiveProviders();
            await this.checkAndBroadcastStatus();
          } else {
            logger.warn('WebSocket connection lost during check');
          }
        }

        // If we're connected, ensure service state is properly reflected
        if (this.wsConnected) {
          const hasActiveProviders = await this.hasVerifiedProviders();
          const isReady = await this.isServiceReady();
          
          logger.debug('Connection check status:', {
            wsConnected: this.wsConnected,
            wsInitialized: this.wsInitialized,
            hasActiveProviders,
            isReady,
            initialized: this.initialized
          });

          // If we're connected and have active providers but not initialized
          if (hasActiveProviders && !this.initialized) {
            this.initialized = true;
            this.readyResolve();
            logger.info('Service marked as ready during connection check', {
              wsConnected: this.wsConnected,
              hasActiveProviders,
              initialized: this.initialized
            });
            await this.checkAndBroadcastStatus();
          }
        }
      } catch (error) {
        logger.error('Error during connection check:', error);
      }
    }, 1000);
  }

  private async checkAndBroadcastStatus() {
    try {
      // Check if WebSocket service is available
      if (!this.wsService) {
        logger.debug('No WebSocket service available for status broadcast');
        return;
      }

      // Get current settings and check for active providers
      const settings = await this.aiSettingsRepository.find();
      const activeProviders = settings.flatMap(s => s.providers || [])
        .filter(p => p.isVerified && p.isActive);

      this.hasActiveProviders = activeProviders.length > 0;

      // Check if service is actually ready
      const isReady = await this.isServiceReady();

      // Prepare status object
      const status = {
        ready: isReady,
        connected: this.wsConnected && this.wsService.isInitialized(),
        initialized: this.initialized,
        hasProviders: this.hasActiveProviders,
        activeProviders: activeProviders.map(p => ({
          provider: p.provider,
          model: p.selectedModel
        }))
      };

      // Log the status we're about to broadcast
      logger.info('Broadcasting AI service status:', status);

      // Broadcast the status
      this.wsService.broadcast('ai:status', status);

      // Only broadcast ready if we have active providers
      if (status.ready) {
        this.wsService.broadcast('ai:ready', { 
          ready: true,
          hasProviders: this.hasActiveProviders,
          activeProviders: activeProviders.map(p => p.provider)
        });
      }

      return status;
    } catch (error) {
      logger.error('Failed to check and broadcast status:', error);
      throw error;
    }
  }

  private async broadcastStatus() {
    if (!this.wsService || !this.wsService.isInitialized()) {
      logger.debug('Cannot broadcast status: WebSocket service not available or not initialized');
      return;
    }

    try {
      const allSettings = await this.aiSettingsRepository.find();
      const activeProviders = allSettings
        .flatMap(s => s.providers || [])
        .filter(p => p.isVerified && p.isActive)
        .map(p => p.provider);

      // Update hasActiveProviders based on current state
      this.hasActiveProviders = activeProviders.length > 0;

      const status = {
        ready: await this.isServiceReady(),
        connected: this.wsConnected,
        initialized: this.wsInitialized,
        hasProviders: this.hasActiveProviders,
        activeProviders
      };

      this.wsService.broadcast('ai:status', status);
      logger.info('Broadcasting AI status:', status);

      if (status.ready && this.hasActiveProviders) {
        this.wsService.broadcast('ai:ready', { ready: true });
        this.emit('ready');
      }
    } catch (error) {
      logger.error('Failed to broadcast status:', error);
    }
  }

  public async shutdown(): Promise<void> {
    if (this.wsInitCheckInterval) {
      clearInterval(this.wsInitCheckInterval);
      this.wsInitCheckInterval = null;
    }
    if (this.wsConnectionCheckInterval) {
      clearInterval(this.wsConnectionCheckInterval);
      this.wsConnectionCheckInterval = null;
    }
    this.wsConnected = false;
    this.wsInitialized = false;
    this.initialized = false;
    this.wsService = null;
  }

  async isServiceReady(): Promise<boolean> {
    try {
      // Get all provider settings
      const allSettings = await this.aiSettingsRepository.find();

      // Check if any settings have active and verified providers
      const hasVerifiedProvider = allSettings.some(settings => 
        settings.providers?.some(p => p.isVerified && p.isActive)
      );

      // Update the hasActiveProviders flag
      this.hasActiveProviders = hasVerifiedProvider;

      // Log the current state
      logger.info('Checking AI service readiness:', {
        totalSettings: allSettings.length,
        hasVerifiedProvider,
        wsConnected: this.wsConnected,
        wsService: !!this.wsService,
        wsInitialized: this.wsService?.isInitialized() || false,
        activeProviders: allSettings.flatMap(s => s.providers || [])
          .filter(p => p.isVerified && p.isActive)
          .map(p => ({
            provider: p.provider,
            selectedModel: p.selectedModel
          }))
      });

      // If we have no active providers, service is ready for configuration
      if (!hasVerifiedProvider) {
        logger.info('No verified providers found, service ready for configuration');
        return true;
      }

      // If we have active providers, we need WebSocket to be connected
      const isWsReady = this.wsService?.isInitialized() && this.wsConnected;
      if (!isWsReady) {
        logger.warn('Service not ready: WebSocket not initialized or not connected');
        return false;
      }
      
      logger.info('Service ready with active providers');
      this.emit('ready');
      if (this.wsService) {
        this.wsService.broadcast('ai:ready', { 
          ready: true,
          activeProviders: allSettings.flatMap(s => s.providers || [])
            .filter(p => p.isVerified && p.isActive)
            .map(p => p.provider)
        });
      }
      return true;
    } catch (error) {
      logger.error('Failed to check service readiness:', error);
      return false;
    }
  }

  private async initialize() {
    if (this.initialized) {
      logger.info('AISettingsService already initialized');
      return;
    }

    try {
      // Set up initialization promise
      if (!this.initializationPromise) {
        this.initializationPromise = new Promise((resolve) => {
          this.readyResolve = resolve;
        });
      }

      // Ensure repository connection
      await this.ensureRepositoryConnection();

      // Check for active providers
      const settings = await this.aiSettingsRepository.find();
      this.hasActiveProviders = settings.some(setting => 
        setting.providers.some(provider => provider.isVerified && provider.isActive)
      );

      logger.info('Checking active providers during initialization', {
        hasActiveProviders: this.hasActiveProviders,
        totalSettings: settings.length,
        activeProviders: settings.filter(s => s.providers.some(p => p.isVerified && p.isActive)).length
      });

      // Initialize even if no active providers
      this.initialized = true;
      
      // Resolve the ready promise if no active providers or if WebSocket is ready
      if (!this.hasActiveProviders || (this.wsService?.isInitialized() && this.wsConnected)) {
        logger.info('Service ready', {
          hasActiveProviders: this.hasActiveProviders,
          wsInitialized: this.wsService?.isInitialized(),
          wsConnected: this.wsConnected
        });
        this.readyResolve();
      }

      // Broadcast initial status
      await this.checkAndBroadcastStatus();

    } catch (error) {
      logger.error('Failed to initialize AISettingsService:', error);
      throw error;
    }
  }

  private async ensureRepositoryConnection() {
    try {
      if (!AppDataSource.isInitialized) {
        logger.warn('Database connection not initialized, attempting to initialize...');
        await AppDataSource.initialize();
      }
      
      // Verify connection is working
      await AppDataSource.query('SELECT 1');
      this.aiSettingsRepository = AppDataSource.getRepository(AISettings);
    } catch (error) {
      logger.error('Failed to ensure database connection:', error);
      throw new AppError(500, 'Database connection failed');
    }
  }

  async getSettings(userId: string): Promise<AISettings> {
    if (!userId) {
      throw new AppError(400, 'User ID is required');
    }

    try {
      await this.initialize();
      logger.info('Getting AI settings for user:', { userId });

      const existingSettings = await this.aiSettingsRepository.findOne({
        where: { userId },
        relations: ['user'],
      });

      if (existingSettings) {
        return existingSettings;
      }

      logger.info('No existing settings found, creating default settings for user:', { userId });

      const defaultSettings = this.aiSettingsRepository.create({
        userId,
        providers: [] as AIProviderConfig[],
        enableRandomMessages: true,
        messageInterval: 5000,
        systemCommands: [] as string[]
      });

      return await this.aiSettingsRepository.save(defaultSettings);
    } catch (error) {
      logger.error('Failed to get/create AI settings:', error);
      throw error instanceof AppError ? error : new AppError(500, 'Failed to get/create AI settings');
    }
  }

  async updateSettings(userId: string, updates: Partial<AISettings>): Promise<AISettings> {
    try {
      logger.info(`Updating AI settings for user ${userId}`);
      
      const existingSettings = await this.getSettings(userId);
      const updatedSettings = this.aiSettingsRepository.merge(existingSettings, updates);
      return await this.aiSettingsRepository.save(updatedSettings);
    } catch (error) {
      logger.error('Failed to update AI settings:', error);
      throw new AppError(500, 'Failed to update AI settings');
    }
  }

  async getAllProviderSettings(): Promise<AIProviderConfig[]> {
    try {
      await this.initialize();
      logger.info('Getting all provider settings');

      // Get all settings first
      const allSettings = await this.aiSettingsRepository.find();

      // Collect all unique providers across all settings
      const allProviders = allSettings.flatMap(settings => settings.providers || [])
        .filter(p => p.isVerified && p.isActive)
        .map(provider => ({
          ...provider,
          apiKey: '********' // Mask API keys for security
        }));

      logger.info('Retrieved all provider settings', {
        totalSettings: allSettings.length,
        activeProviders: allProviders.length,
        providers: allProviders.map(p => ({
          provider: p.provider,
          isVerified: p.isVerified,
          isActive: p.isActive,
          selectedModel: p.selectedModel
        }))
      });

      // Update hasActiveProviders flag based on the results
      this.hasActiveProviders = allProviders.length > 0;
      
      // If we have active providers, ensure we broadcast the status
      if (this.hasActiveProviders) {
        this.broadcastStatus();
      }

      return allProviders;
    } catch (error) {
      logger.error('Failed to get all provider settings:', error);
      throw error instanceof AppError ? error : new AppError(500, 'Failed to get all provider settings');
    }
  }

  async getProviderSettings(userId: string, provider: LLMProvider): Promise<AIProviderConfig | null> {
    try {
      await this.initialize();
      logger.info(`Getting provider settings for ${provider}`, { userId });

      const settings = await this.getSettings(userId);
      const providerConfig = settings.providers.find(p => p.provider === provider);

      if (providerConfig) {
        // Return a copy with masked API key
        return {
          ...providerConfig,
          apiKey: '********'
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get provider settings for ${provider}:`, error);
      throw error instanceof AppError ? error : new AppError(500, `Failed to get provider settings for ${provider}`);
    }
  }

  async addProvider(userId: string, config: AIProviderConfig): Promise<AISettings> {
    try {
      logger.info(`Adding provider ${config.provider} for user ${userId}`);
      
      const settings = await this.getSettings(userId);
      
      if (!config.apiKey) {
        throw new AppError(400, 'API key is required');
      }

      // Clean and process the key
      let apiKey = config.apiKey.trim().replace(/[\r\n\t]/g, '');
      
      // Check if the key is already encrypted
      const isEncrypted = apiKey.includes(':');
      
      if (!isEncrypted) {
        // For Gemini, validate key length
        if (config.provider === 'gemini' && apiKey.length < 20) {
          throw new AppError(400, 'Invalid API key format - Gemini API key must be at least 20 characters');
        }
        
        // Encrypt the cleaned and validated key
        apiKey = encrypt(apiKey);
      }

      // Remove any existing provider with the same type
      settings.providers = settings.providers.filter(p => p.provider !== config.provider);

      // Add the new provider
      settings.providers.push({
        provider: config.provider,
        apiKey: apiKey,
        selectedModel: config.selectedModel,
        isActive: true,
        isVerified: config.isVerified || false,
        lastVerified: config.lastVerified || new Date(),
        availableModels: config.availableModels || []
      });

      logger.info(`Saving updated settings with new provider ${config.provider}`);
      return await this.aiSettingsRepository.save(settings);
    } catch (error) {
      logger.error(`Failed to add provider ${config.provider}:`, error);
      throw error instanceof AppError ? error : new AppError(500, `Failed to add provider ${config.provider}`);
    }
  }

  async verifyProvider(provider: LLMProvider, apiKey: string, userId: string): Promise<AIProviderConfig> {
    try {
      logger.info(`Verifying provider ${provider} for user ${userId}`);

      // Clean the key first
      let cleanedKey = apiKey.trim().replace(/[\r\n\t]/g, '');
      
      // Check if the key is already encrypted
      const isEncrypted = cleanedKey.includes(':');
      
      // Get the actual key to test with
      let testKey = cleanedKey;
      if (isEncrypted) {
        try {
          testKey = decrypt(cleanedKey);
        } catch (error) {
          logger.error('Failed to decrypt provided API key:', error);
          throw new AppError(400, 'Invalid encrypted API key format');
        }
      }

      // For Gemini, validate key format
      if (provider === 'gemini' && testKey.length < 20) {
        logger.error('Invalid Gemini API key format', {
          keyLength: testKey.length
        });
        throw new AppError(400, 'Invalid API key format - Gemini API key must be at least 20 characters');
      }

      // Test the provider
      let availableModels: string[] = [];
      try {
        switch (provider) {
          case 'gemini':
            const geminiClient = new GoogleGenerativeAI(testKey);
            const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent('Test connection');
            if (result) {
              availableModels = ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-2.0-vision'];
              logger.info('Gemini API test successful');
            }
            break;
          // ... other provider cases ...
        }
      } catch (error) {
        logger.error(`${provider} verification failed:`, error);
        throw new AppError(400, `${provider} verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Create the provider config
      const config: AIProviderConfig = {
        provider,
        apiKey: isEncrypted ? cleanedKey : encrypt(testKey),
        selectedModel: availableModels[0],
        availableModels,
        isActive: true,
        isVerified: true,
        lastVerified: new Date()
      };

      // Save the provider settings for the user
      logger.info(`Saving provider ${provider} settings for user ${userId}`);
      const savedSettings = await this.addProvider(userId, config);
      
      // Update active providers flag
      this.hasActiveProviders = true;
      
      // Check and log service readiness
      const isReady = await this.isServiceReady();
      logger.info('Service readiness after provider verification:', {
        isReady,
        provider,
        userId,
        providersCount: savedSettings.providers.length,
        hasActiveProviders: this.hasActiveProviders
      });

      // Broadcast updated status
      this.broadcastStatus();

      // Emit provider updated event
      this.emit('providerUpdated', userId);

      // Return the config without the API key
      return {
        ...config,
        apiKey: '********'
      };
    } catch (error) {
      logger.error(`Provider verification failed:`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider, 
        userId 
      });
      throw error instanceof AppError ? error : new AppError(500, 'Unknown error during provider verification');
    }
  }

  async updateProviderSettings(userId: string, provider: LLMProvider, updates: Partial<AIProviderConfig>): Promise<AISettings> {
    try {
      logger.info(`Updating provider settings for ${provider}`, { userId });
      
      const settings = await this.getSettings(userId);
      const providerIndex = settings.providers.findIndex(p => p.provider === provider);
      
      if (providerIndex === -1) {
        throw new AppError(404, `Provider ${provider} not found`);
      }

      // Update the provider settings
      settings.providers[providerIndex] = {
        ...settings.providers[providerIndex],
        ...updates
      };

      // Save the updated settings
      const updatedSettings = await this.aiSettingsRepository.save(settings);
      
      // Check service readiness after update
      await this.isServiceReady();
      
      return updatedSettings;
    } catch (error) {
      logger.error(`Failed to update provider settings for ${provider}:`, error);
      throw error instanceof AppError ? error : new AppError(500, `Failed to update provider settings for ${provider}`);
    }
  }

  async getDecryptedApiKey(userId: string, provider: LLMProvider): Promise<string> {
    try {
      const settings = await this.getSettings(userId);
      const providerConfig = settings.providers.find(p => p.provider === provider);
      
      if (!providerConfig || !providerConfig.apiKey) {
        throw new AppError(404, `No API key found for provider ${provider}`);
      }
      
      return decrypt(providerConfig.apiKey);
    } catch (error) {
      logger.error(`Failed to get decrypted API key for ${provider}:`, error);
      throw error instanceof AppError ? error : new AppError(500, `Failed to get API key for ${provider}`);
    }
  }

  private async hasVerifiedProviders(): Promise<boolean> {
    try {
      const settings = await this.aiSettingsRepository.find();
      return settings.some(setting => 
        setting.providers.some(provider => 
          provider.isVerified && provider.isActive
        )
      );
    } catch (error) {
      logger.error('Error checking for verified providers:', error);
      return false;
    }
  }
}