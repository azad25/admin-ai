import React, { createContext, useContext, useState, useEffect } from 'react';
import { CreateCrudPageData, crudPageService, CrudPage } from '../services/crudPages';
import { useSnackbar } from '../contexts/SnackbarContext';
import { authService } from '../services/auth';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

interface CrudPagesContextType {
  pages: CrudPage[];
  loading: boolean;
  error: string | null;
  createPage: (data: CreateCrudPageData) => Promise<CrudPage>;
  updatePage: (id: string, data: Partial<CreateCrudPageData>) => Promise<CrudPage>;
  deletePage: (id: string) => Promise<void>;
  refreshPages: () => Promise<void>;
}

const CrudPagesContext = createContext<CrudPagesContextType | null>(null);

export const useCrudPages = () => {
  const context = useContext(CrudPagesContext);
  if (!context) {
    throw new Error('useCrudPages must be used within a CrudPagesProvider');
  }
  return context;
};

export const CrudPagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<CrudPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useSnackbar();
  const { user } = useAuth();

  const loadPages = async () => {
    if (!authService.isAuthenticated()) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const fetchedPages = await crudPageService.getCrudPages();
      setPages(fetchedPages);
    } catch (err) {
      logger.error('Failed to load CRUD pages:', err);
      setError('Failed to load CRUD pages');
      showError('Failed to load CRUD pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPages();
    } else {
      setLoading(false);
    }
  }, [user]);

  const refreshPages = async () => {
    await loadPages();
  };

  const createPage = async (data: CreateCrudPageData) => {
    try {
      const newPage = await crudPageService.createCrudPage(data);
      setPages(prev => [...prev, newPage]);
      showSuccess('CRUD page created successfully');
      return newPage;
    } catch (err) {
      console.error('Failed to create CRUD page:', err);
      showError('Failed to create CRUD page');
      throw err;
    }
  };

  const updatePage = async (id: string, data: Partial<CreateCrudPageData>) => {
    try {
      const updatedPage = await crudPageService.updateCrudPage(id, data);
      setPages(prev => prev.map(p => p.id === id ? updatedPage : p));
      showSuccess('CRUD page updated successfully');
      return updatedPage;
    } catch (err) {
      console.error('Failed to update CRUD page:', err);
      showError('Failed to update CRUD page');
      throw err;
    }
  };

  const deletePage = async (id: string) => {
    try {
      await crudPageService.deleteCrudPage(id);
      setPages(prev => prev.filter(p => p.id !== id));
      showSuccess('CRUD page deleted successfully');
    } catch (err) {
      console.error('Failed to delete CRUD page:', err);
      showError('Failed to delete CRUD page');
      throw err;
    }
  };

  const value = {
    pages,
    loading,
    error,
    refreshPages,
    createPage,
    updatePage,
    deletePage,
  };

  return (
    <CrudPagesContext.Provider value={value}>
      {children}
    </CrudPagesContext.Provider>
  );
}; 