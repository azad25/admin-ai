import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { logger } from '../utils/logger';

export const Home: React.FC = () => {
  useEffect(() => {
    logger.debug('Home component mounted');
    return () => {
      logger.debug('Home component unmounted');
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom>
        Welcome to Admin AI
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Your intelligent administrative assistant powered by multiple AI providers.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">AI Settings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Configure AI providers, manage API keys, and customize AI behavior.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/ai-settings" size="small">
                Configure AI
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Dashboard</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View system status, analytics, and AI-generated insights.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/dashboard" size="small">
                View Dashboard
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1 }} />
                <Typography variant="h6">CRUD Pages</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Manage your data with AI-powered CRUD operations.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/crud-pages" size="small">
                Manage Data
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}; 