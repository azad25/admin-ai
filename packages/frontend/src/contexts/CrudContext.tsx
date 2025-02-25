import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSnackbar } from './SnackbarContext';
import { crudPageService } from '../services/crudPages';
import { CrudPage, CreateCrudPageData } from '../types/crud';

interface CrudContextType {
  pages: CrudPage[];
  loading: boolean;
  error: string | null;
  createPage: (page: CreateCrudPageData) => Promise<CrudPage>;
  updatePage: (id: string, page: Partial<CreateCrudPageData>) => Promise<CrudPage>;
  deletePage: (id: string) => Promise<void>;
  refreshPages: () => Promise<void>;
}

const defaultPage: CrudPage = {
  id: '',
  name: '',
  description: '',
  endpoint: '',
  fields: [],
  schema: {
    type: 'object',
    properties: {},
    tableName: '',
    description: ''
  },
  config: {
    defaultView: 'table',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true
  }
};

const CrudContext = createContext<CrudContextType>({
  pages: [],
  loading: false,
  error: null,
  createPage: async () => defaultPage,
  updatePage: async () => defaultPage,
  deletePage: async () => {},
  refreshPages: async () => {},
});

export const useCrud = () => useContext(CrudContext);

export const CrudProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<CrudPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useSnackbar();

  const fetchPages = async () => {
    try {
      setLoading(true);
      const fetchedPages = await crudPageService.getCrudPages();
      setPages(fetchedPages);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch CRUD pages:', error);
      setError('Failed to load CRUD pages');
      showError('Failed to load CRUD pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const createPage = async (page: CreateCrudPageData) => {
    try {
      setLoading(true);
      const newPage = await crudPageService.createCrudPage(page);
      await fetchPages();
      showSuccess('CRUD page created successfully');
      return newPage;
    } catch (error) {
      console.error('Failed to create CRUD page:', error);
      showError('Failed to create CRUD page');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePage = async (id: string, page: Partial<CreateCrudPageData>) => {
    try {
      setLoading(true);
      const updatedPage = await crudPageService.updateCrudPage(id, page);
      await fetchPages();
      showSuccess('CRUD page updated successfully');
      return updatedPage;
    } catch (error) {
      console.error('Failed to update CRUD page:', error);
      showError('Failed to update CRUD page');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePage = async (id: string) => {
    try {
      setLoading(true);
      await crudPageService.deleteCrudPage(id);
      await fetchPages();
      showSuccess('CRUD page deleted successfully');
    } catch (error) {
      console.error('Failed to delete CRUD page:', error);
      showError('Failed to delete CRUD page');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrudContext.Provider value={{
      pages,
      loading,
      error,
      createPage,
      updatePage,
      deletePage,
      refreshPages: fetchPages
    }}>
      {children}
    </CrudContext.Provider>
  );
}; 