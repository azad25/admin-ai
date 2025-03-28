import { ThemeOptions } from '@mui/material/styles';

export const getThemeOptions = (mode: 'light' | 'dark') => {
  return {
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light mode settings
            primary: {
              main: '#1a73e8',
              dark: '#0f52ba',
              light: '#64b5f6',
            },
            secondary: {
              main: '#fb8c00',
              dark: '#ef6c00',
              light: '#ffa726',
            },
            background: {
              default: '#f5f5f9',
              paper: '#ffffff',
            },
            text: {
              primary: '#11142d',
              secondary: '#65748b',
            },
          }
        : {
            // Dark mode settings - Midnight Black Theme
            primary: {
              main: '#3a7bff',
              dark: '#1a5dc9',
              light: '#75a1ff',
            },
            secondary: {
              main: '#7040ff',
              dark: '#5526c5',
              light: '#9e7aff',
            },
            background: {
              default: '#080A12', // Darker midnight black
              paper: '#111827', // Slightly lighter for card backgrounds
            },
            text: {
              primary: '#f3f4f6',
              secondary: '#9ca3af',
            },
            error: {
              main: '#ff5d5d',
            },
            warning: {
              main: '#ffb74d',
            },
            info: {
              main: '#64b5f6',
            },
            success: {
              main: '#66bb6a',
            },
          }),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 500,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
        letterSpacing: '0.5px',
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '8px',
          },
          contained: {
            boxShadow: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: '12px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            boxShadow: mode === 'light' 
              ? '0 2px 4px rgba(0,0,0,0.1)' 
              : '0 4px 8px rgba(0,0,0,0.4)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: mode === 'light' 
              ? '0 1px 3px rgba(0,0,0,0.1)' 
              : '0 2px 6px rgba(0,0,0,0.5)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: mode === 'light' ? '#ffffff' : '#0c162a',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: mode === 'light' 
              ? '1px solid rgba(0, 0, 0, 0.12)' 
              : '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    shape: {
      borderRadius: 10,
    },
  };
}; 