import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getThemeOptions } from './theme';
import { createTheme } from '@mui/material/styles';
import { SnackbarProvider as NotistackProvider } from 'notistack';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './utils/logger';
import { AIMessage } from '@admin-ai/shared/src/types/ai';
import { wsService } from './services/websocket.service';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { CrudProvider } from './contexts/CrudContext';
import { CrudPagesProvider } from './contexts/CrudPagesContext';
import { ThemeProvider as CustomThemeProvider } from './contexts/ThemeContext';
import { AIProvider } from './contexts/AIContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { SocketProvider } from './contexts/SocketContext';
import { AIMessagesProvider } from './contexts/AIMessagesContext';

// Components and Pages
import { Layout } from './components/Layout';
import Login from './pages/Login';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { AIDashboard } from './pages/AIDashboard';
import AISettings from './pages/AISettings';
import CrudPages from './pages/CrudPages';
import ApiKeys from './pages/ApiKeys';
import Settings from './pages/Settings';
import { CrudPage } from './pages/CrudPage';
import { RequireAuth } from './components/RequireAuth';
import { AIAssistant } from './components/AIAssistant';

export function App() {
  const theme = React.useMemo(() => createTheme(getThemeOptions('light')), []); // Default theme
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  React.useEffect(() => {
    logger.debug('App mounted');
    return () => {
      logger.debug('App unmounted');
    };
  }, []);

  useEffect(() => {
    const handleAiMessage = (message: AIMessage) => {
      setAiMessages(prev => [...prev, message]);
    };

    wsService.on('ai:message', handleAiMessage);
    wsService.on('ai:start', () => setIsAiLoading(true));
    wsService.on('ai:end', () => setIsAiLoading(false));

    return () => {
      wsService.off('ai:message', handleAiMessage);
      wsService.off('ai:start', () => {});
      wsService.off('ai:end', () => {});
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotistackProvider 
          maxSnack={3} 
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={3000}
        >
          <CustomThemeProvider>
            <AuthProvider>
              <SocketProvider>
                <SnackbarProvider>
                  <AIProvider>
                    <AIMessagesProvider>
                      <CrudProvider>
                        <CrudPagesProvider>
                          <ErrorBoundary>
                            <Routes>
                              {/* Public routes */}
                              <Route path="/login" element={<Login />} />
                              
                              {/* Protected routes */}
                              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                                <Route index element={<Home />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="ai-dashboard" element={<AIDashboard />} />
                                <Route path="ai-settings" element={<AISettings />} />
                                <Route path="crud-pages" element={<CrudPages />} />
                                <Route path="crud-pages/:id" element={<CrudPage />} />
                                <Route path="api-keys" element={<ApiKeys />} />
                                <Route path="settings" element={<Settings />} />
                              </Route>

                              {/* Catch-all route */}
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          </ErrorBoundary>
                        </CrudPagesProvider>
                      </CrudProvider>
                    </AIMessagesProvider>
                  </AIProvider>
                </SnackbarProvider>
              </SocketProvider>
            </AuthProvider>
          </CustomThemeProvider>
          <AIAssistant 
            messages={aiMessages}
            isLoading={isAiLoading}
            onClose={() => setAiMessages([])}
          />
        </NotistackProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
} 