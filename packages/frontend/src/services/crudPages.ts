import { api } from './api';
import type { CrudPage, CreateCrudPageData, CrudData, Field } from '../types/crud';

export type { CrudPage, CreateCrudPageData, CrudData, Field };

export const crudPageService = {
  async getCrudPages(): Promise<CrudPage[]> {
    const { data } = await api.get<CrudPage[]>('/crud/pages');
    return data;
  },

  async getCrudPage(id: string): Promise<CrudPage> {
    const { data } = await api.get<CrudPage>(`/crud/pages/${id}`);
    return data;
  },

  async createCrudPage(pageData: CreateCrudPageData): Promise<CrudPage> {
    const { data } = await api.post<CrudPage>('/crud/pages', pageData);
    return data;
  },

  async deleteCrudPage(id: string): Promise<void> {
    await api.delete(`/crud/pages/${id}`);
  },

  async updateCrudPage(id: string, pageData: Partial<CreateCrudPageData>): Promise<CrudPage> {
    const { data } = await api.put<CrudPage>(`/crud/pages/${id}`, pageData);
    return data;
  },

  async getCrudPageData(id: string, query: Record<string, any> = {}): Promise<CrudData[]> {
    const { data } = await api.get<CrudData[]>(`/crud/pages/${id}/data`, { params: query });
    return data;
  },

  async createCrudPageData(id: string, rowData: Record<string, any>): Promise<CrudData> {
    const { data } = await api.post<CrudData>(`/crud/pages/${id}/data`, rowData);
    return data;
  },

  async updateCrudPageData(id: string, rowId: string, rowData: Record<string, any>): Promise<CrudData> {
    const { data } = await api.put<CrudData>(`/crud/pages/${id}/data/${rowId}`, rowData);
    return data;
  },

  async deleteCrudPageData(id: string, rowId: string): Promise<void> {
    await api.delete(`/crud/pages/${id}/data/${rowId}`);
  }
};