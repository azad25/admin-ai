export interface AIProvider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isVerified: boolean;
  apiKey?: string;
  settings?: Record<string, any>;
  metadata?: {
    version?: string;
    capabilities?: string[];
    [key: string]: any;
  };
  status?: {
    lastCheck: string;
    isAvailable: boolean;
    error?: string;
  };
} 