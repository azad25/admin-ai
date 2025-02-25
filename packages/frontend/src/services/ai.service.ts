import axios from 'axios';
import { SystemMetrics } from '../types/system';
import { ErrorLog } from '../types/logs';
import { RequestMetric } from '../types/metrics';

export class AIService {
  private static instance: AIService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await axios.get(`${this.baseUrl}/metrics/system`);
    return response.data;
  }

  async getErrorLogs(): Promise<ErrorLog[]> {
    const response = await axios.get(`${this.baseUrl}/metrics/errors`);
    return response.data;
  }

  async getRequestMetrics(): Promise<RequestMetric[]> {
    const response = await axios.get(`${this.baseUrl}/metrics/requests`);
    return response.data;
  }

  async analyzeErrors(errors: ErrorLog[]): Promise<ErrorLog[]> {
    const response = await axios.post(`${this.baseUrl}/ai/analyze/errors`, { errors });
    return response.data;
  }

  async predictSystemIssues(): Promise<{
    predictions: Array<{
      issue: string;
      probability: number;
      impact: 'high' | 'medium' | 'low';
      suggestedAction: string;
    }>;
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/predict/issues`);
    return response.data;
  }

  async getSystemHealth(): Promise<{
    score: number;
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/health`);
    return response.data;
  }

  async optimizeSystem(): Promise<{
    recommendations: Array<{
      type: string;
      description: string;
      impact: string;
      difficulty: string;
    }>;
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/optimize`);
    return response.data;
  }

  async getAIMetrics(): Promise<{
    requestCount: number;
    averageLatency: number;
    errorRate: number;
    modelUsage: Record<string, number>;
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/metrics`);
    return response.data;
  }

  async executeCommand(command: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const response = await axios.post(`${this.baseUrl}/ai/execute`, { command });
    return response.data;
  }

  async getResourceUsage(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    network: {
      in: number;
      out: number;
    };
  }> {
    const response = await axios.get(`${this.baseUrl}/ai/resources`);
    return response.data;
  }
}

export const aiService = AIService.getInstance();