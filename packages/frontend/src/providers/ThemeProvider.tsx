import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ThemeMode, ThemeContextType } from '../types/theme';
import { logger } from '../utils/logger';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface CustomThemeProviderProps {
  children: (props: ThemeContextType) => React.ReactNode;
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    // Try to get the theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = (savedTheme === 'dark' || savedTheme === 'light') 
      ? savedTheme 
      : prefersDarkMode ? 'dark' : 'light';
    
    logger.debug('Initial theme loaded:', initialTheme);
    return initialTheme;
  });

  // Apply theme to document when it changes
  useEffect(() => {
    logger.debug('Theme changed to:', theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme to body element for global styling
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${theme}-mode`);
    
    // Set data-theme attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
    
    // Add a global class to the html element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    
    logger.debug('Applied theme classes and attributes to document');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme: ThemeMode) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      logger.debug('Toggling theme from', prevTheme, 'to', newTheme);
      return newTheme;
    });
  }, []);

  const value: ThemeContextType = { theme, toggleTheme };

  return children(value);
}; 