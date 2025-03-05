import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { NotistackProvider, CustomThemeProvider } from './providers';
import { SocketProvider } from './contexts/SocketContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { AIProvider } from './contexts/AIContext';
import { AIMessagesProvider } from './contexts/AIMessagesContext';
import { CrudProvider } from './contexts/CrudContext';
import { CrudPagesProvider } from './contexts/CrudPagesContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RequireAuth } from './components/RequireAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { AIDashboard } from './pages/AIDashboard';
import { AISettings } from './pages/AISettings';
import { CrudPages } from './pages/CrudPages';
import { CrudPage } from './pages/CrudPage';
import { ApiKeys } from './pages/ApiKeys';
import { Settings } from './pages/Settings';
import { getThemeOptions } from './theme';
import { ThemeContextType } from './types/theme';
import WebSocketTestPage from './pages/WebSocketTest';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotistackProvider
        maxSnack={0}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <CustomThemeProvider>
          {({ theme: themeMode }: ThemeContextType) => (
            <ThemeProvider theme={createTheme(getThemeOptions(themeMode))}>
              <CssBaseline />
              <SocketProvider>
                <SnackbarProvider>
                  <AIProvider>
                    <AIMessagesProvider>
                      <CrudProvider>
                        <CrudPagesProvider>
                          <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route element={<RequireAuth><Layout /></RequireAuth>}>
                              <Route path="/" element={<Navigate to="/dashboard" />} />
                              <Route path="/home" element={<Home />} />
                              <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/ai" element={<AIDashboard />} />
                              <Route path="/ai/settings" element={<AISettings />} />
                              <Route path="/crud" element={<CrudPages />} />
                              <Route path="/crud/:id" element={<CrudPage />} />
                              <Route path="/api-keys" element={<ApiKeys />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/websocket-test" element={
                                <ProtectedRoute>
                                  <WebSocketTestPage />
                                </ProtectedRoute>
                              } />
                            </Route>
                          </Routes>
                        </CrudPagesProvider>
                      </CrudProvider>
                    </AIMessagesProvider>
                  </AIProvider>
                </SnackbarProvider>
              </SocketProvider>
            </ThemeProvider>
          )}
        </CustomThemeProvider>
      </NotistackProvider>
    </ErrorBoundary>
  );
}; 