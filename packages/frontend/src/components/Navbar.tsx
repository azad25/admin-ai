import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  Box,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import {
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAIMessages } from '../contexts/AIMessagesContext';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const theme = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useAIMessages();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, color: theme.palette.text.primary }}
        >
          Admin AI
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="large"
            color="inherit"
            sx={{ color: theme.palette.text.primary }}
            onClick={() => navigate('/notifications')}
          >
            <NotificationsIcon />
            {unreadCount > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: theme.palette.error.main,
                  color: theme.palette.error.contrastText,
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount}
              </Box>
            )}
          </IconButton>
          <MenuItem component={Link} to="/settings">
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <MenuItem component={Link} to="/test-globe">
            <ListItemIcon><PublicIcon fontSize="small" /></ListItemIcon>
            Test Globe
          </MenuItem>
          <IconButton
            size="large"
            color="inherit"
            sx={{ color: theme.palette.text.primary }}
            onClick={handleLogout}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 