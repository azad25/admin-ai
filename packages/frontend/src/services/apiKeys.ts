import { ApiKey } from '@admin-ai/shared';
import api from './api';

export const apiKeyService = {
  async getApiKeys(): Promise<ApiKey[]> {
    const { data } = await api.get<ApiKey[]>('/api/api-keys');
    return data;
  },

  async createApiKey(name: string): Promise<ApiKey> {
    const { data } = await api.post<ApiKey>('/api/api-keys', { name });
    return data;
  },

  async deleteApiKey(id: string): Promise<void> {
    await api.delete(`/api/api-keys/${id}`);
  },

  async updateApiKey(id: string, name: string): Promise<ApiKey> {
    const { data } = await api.put<ApiKey>(`/api/api-keys/${id}`, { name });
    return data;
  }
}; 