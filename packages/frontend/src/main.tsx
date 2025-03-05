// Import React and ReactDOM first
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AuthProvider } from './contexts/AuthContext';
import { AppEngine } from './engine/AppEngine';
import { createTheme } from '@mui/material/styles';
import { getThemeOptions } from './theme';
import { App } from './App';
import { store } from './store';
import './index.css';
import './utils/websocket-console-test';

// Import services last
import { initializeServices } from './services/initialize';

async function initializeApp() {
  try {
    // Create default theme
    const defaultTheme = createTheme(getThemeOptions('light'));

    // Mount React application
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <Provider store={store}>
          <BrowserRouter>
            <ThemeProvider theme={defaultTheme}>
              <CssBaseline />
              <AuthProvider>
                <App />
              </AuthProvider>
            </ThemeProvider>
          </BrowserRouter>
        </Provider>
      </React.StrictMode>
    );

    // Initialize services after the app is mounted
    // This ensures the AuthProvider is available
    await initializeServices().catch(error => {
      console.error('Service initialization failed:', error);
      // Continue execution even if services fail to initialize
      // This allows the app to load and show appropriate error messages
    });

    // Initialize AppEngine
    try {
      const appEngine = AppEngine.getInstance();
      await appEngine.initialize();
      console.info('Frontend AppEngine initialized successfully');
    } catch (error) {
      console.error('AppEngine initialization failed:', error);
      // Continue execution even if AppEngine fails to initialize
    }

    // Handle window unload
    window.addEventListener('beforeunload', async () => {
      try {
        const appEngine = AppEngine.getInstance();
        await appEngine.shutdown();
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
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

// Override the window interface in this file only
interface CustomWindow extends Window {
  wsService: any;
  aiSettingsService: any;
}
declare const window: CustomWindow;

initializeApp(); 