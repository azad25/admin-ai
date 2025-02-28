import axios from 'axios';

interface ServerConfig {
  wsPort: number;
  wsPath: string;
  apiUrl: string;
  wsHost: string;
  secure: boolean;
}

class ConfigService {
  private static instance: ConfigService;
  private config: ServerConfig | null = null;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async getConfig(): Promise<ServerConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const response = await axios.get<ServerConfig>(`${this.baseUrl}/api/config`);
      this.config = response.data;
      return this.config;
    } catch (error) {
      console.error('Failed to fetch server configuration:', error);
      // Return default configuration
      const host = window.location.hostname;
      return {
        wsPort: 3000,
        wsPath: '/socket.io',
        apiUrl: `${window.location.protocol}//${host}:3000/api`,
        wsHost: host,
        secure: window.location.protocol === 'https:'
      };
    }
  }

  public clearCache(): void {
    this.config = null;
  }
}

export const configService = ConfigService.getInstance(); 