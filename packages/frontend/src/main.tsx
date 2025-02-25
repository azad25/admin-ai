import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppEngine } from './engine/AppEngine';
import { createTheme } from '@mui/material/styles';
import { getThemeOptions } from './theme';
import { App } from './App';

async function initializeApp() {
  try {
    // Initialize AppEngine
    const appEngine = AppEngine.getInstance();
    await appEngine.initialize();
    console.info('Frontend AppEngine initialized successfully');

    // Create default theme
    const defaultTheme = createTheme(getThemeOptions('light'));

    // Mount React application
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <ThemeProvider theme={defaultTheme}>
            <CssBaseline />
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </React.StrictMode>
    );

    // Handle window unload
    window.addEventListener('beforeunload', async () => {
      await appEngine.shutdown();
    });
  } catch (error) {
    console.error('Failed to initialize frontend application:', error);
    // Show error UI
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        font-family: Arial, sans-serif;
      ">
        <h1>Application Error</h1>
        <p>We're sorry, but the application failed to start. Please try refreshing the page.</p>
        <button onclick="window.location.reload()" style="
          padding: 10px 20px;
          margin-top: 20px;
          font-size: 16px;
          cursor: pointer;
        ">
          Refresh Page
        </button>
      </div>
    `;
  }
}

initializeApp(); 