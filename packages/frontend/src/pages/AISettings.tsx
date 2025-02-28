import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Paper,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CardActions
} from '@mui/material';
import {
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Key as KeyIcon,
  Psychology as PsychologyIcon,
  Settings as SettingsIcon,
  ModelTraining as ModelIcon
} from '@mui/icons-material';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSnackbar } from 'notistack';
import { aiSettingsService } from '../services/aiSettings';
import { LLMProvider, AIProviderConfig } from '@admin-ai/shared/src/types/ai';
import { AIStatusAlert } from '../components/AIStatusAlert';
import { wsService } from '../services/websocket.service';
import { useAuth } from '../contexts/AuthContext';

interface AIProvider {
  id: LLMProvider;
  name: string;
  description: string;
  icon: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
}

const providers: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Access GPT-4 and GPT-3.5 models',
    icon: '🤖',
    defaultModel: 'gpt-4',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Access Gemini models',
    icon: '🧠',
    defaultModel: 'gemini-2.0-flash',
    apiKeyPlaceholder: 'API Key',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Access Claude models',
    icon: '🌟',
    defaultModel: 'claude-3-opus',
    apiKeyPlaceholder: 'API Key',
  },
];

interface ProviderCardProps {
  provider: AIProvider;
  config: AIProviderConfig | null;
  onSave: (settings: { apiKey: string; selectedModel: string; isActive: boolean }) => Promise<void>;
  onVerify: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  config,
  onSave,
  onVerify,
  onDelete,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(provider.defaultModel);
  const [isActive, setIsActive] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const loadingKeyRef = useRef(false);

  // Load initial state from config
  useEffect(() => {
    if (config) {
      setIsActive(config.isActive || false);
      setSelectedModel(config.selectedModel || provider.defaultModel);
      if (config.apiKey && !loadingKeyRef.current) {
        loadApiKey();
      }
    }
  }, [config]);

  const loadApiKey = async () => {
    if (!config?.apiKey || loadingKeyRef.current) return;
    
    try {
      loadingKeyRef.current = true;
      setIsLoadingKey(true);
      setError(null);
      const key = await aiSettingsService.getDecryptedApiKey(provider.id);
      setApiKey(key);
    } catch (error) {
      enqueueSnackbar('Failed to load API key', { variant: 'error' });
      setError('Failed to load API key');
    } finally {
      setIsLoadingKey(false);
      loadingKeyRef.current = false;
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);
      
      // Always save as active when saving a new API key
      await onSave({ 
        apiKey, 
        selectedModel, 
        isActive: true 
      });
      
      setIsActive(true);
      
      // Verify immediately after saving to create the client
      await onVerify();
    } catch (error) {
      setError('Failed to save settings');
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifying) return;
    try {
      setIsVerifying(true);
      setError(null);
      await onVerify();
    } catch (error) {
      setError('Failed to verify API key');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleActiveToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setError(null);
      
      const newActiveState = event.target.checked;
      await onSave({
        apiKey: apiKey || (config?.apiKey ? await aiSettingsService.getDecryptedApiKey(provider.id) : ''),
        selectedModel,
        isActive: newActiveState
      });
      
      setIsActive(newActiveState);
      
      if (newActiveState) {
        // Verify and create client when activating
        await onVerify();
      }
    } catch (error) {
      setError('Failed to update active state');
      enqueueSnackbar('Failed to update active state', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h5" component="span" mr={1}>
            {provider.icon}
          </Typography>
          <Typography variant="h5">{provider.name}</Typography>
          {config?.isVerified && (
            <Chip
              icon={<CheckIcon />}
              label="Verified"
              color="success"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <Typography color="textSecondary" paragraph>
          {provider.description}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="API Key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider.apiKeyPlaceholder}
          margin="normal"
          disabled={isLoadingKey || isSaving}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            label="Model"
          >
            {config?.availableModels?.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            )) || (
              <MenuItem value={provider.defaultModel}>
                {provider.defaultModel}
              </MenuItem>
            )}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={handleActiveToggle}
              disabled={isSaving || (!config?.apiKey && !apiKey)}
            />
          }
          label={
            <Box display="flex" alignItems="center">
              Active
              {(isSaving || isLoadingKey) && (
                <CircularProgress size={16} sx={{ ml: 1 }} />
              )}
            </Box>
          }
        />
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!apiKey || isSaving}
          startIcon={isSaving ? <CircularProgress size={20} /> : <KeyIcon />}
        >
          {config?.apiKey ? 'Update' : 'Save & Activate'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleVerify}
          disabled={!config?.apiKey || isVerifying}
          startIcon={isVerifying ? <CircularProgress size={20} /> : <PsychologyIcon />}
        >
          Verify
        </Button>
        {config && (
          <Button 
            color="error" 
            onClick={onDelete}
            startIcon={<ErrorIcon />}
          >
            Delete
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export const AISettings: React.FC = () => {
  const [providerConfigs, setProviderConfigs] = useState<Record<LLMProvider, AIProviderConfig | null>>({
    openai: null,
    gemini: null,
    anthropic: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const loadingRef = useRef(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const auth = useAuth();

  if (!auth) {
    throw new Error('Auth context is required');
  }
  const { user } = auth;

  useEffect(() => {
    // Handle WebSocket notifications
    const handleNotification = (notification: any) => {
      if (notification.metadata?.source?.page === 'AI Settings') {
        if (notification.metadata.status === 'success') {
          enqueueSnackbar(notification.content, { variant: 'success' });
        } else if (notification.metadata.status === 'error') {
          enqueueSnackbar(notification.content, { variant: 'error' });
        }
      }
    };

    wsService.on('notification', handleNotification);
    
    if (!loadingRef.current) {
      loadSettings();
    }

    return () => {
      loadingRef.current = false;
      wsService.off('notification', handleNotification);
    };
  }, [enqueueSnackbar]);

  const loadSettings = async () => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true;
      console.log('Loading AI settings...');
      setLoading(true);
      setError(null);
      
      // Initialize default configs
      const defaultConfigs: Record<LLMProvider, AIProviderConfig | null> = {
        openai: null,
        gemini: null,
        anthropic: null,
      };

      // Fetch settings from the server
      const settings = await aiSettingsService.getAllProviderSettings();
      console.log('Received settings:', settings);

      // Update configs with received settings
      if (Array.isArray(settings)) {
        settings.forEach((setting) => {
          if (setting && setting.provider) {
            defaultConfigs[setting.provider] = setting;
          }
        });
      }

      setProviderConfigs(defaultConfigs);
    } catch (error: any) {
      console.error('Failed to load AI settings:', error);
      setError(error?.message || 'Failed to load AI settings. Please try again later.');
      enqueueSnackbar(error?.message || 'Failed to load AI settings', { variant: 'error' });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleSave = async (provider: LLMProvider, settings: {
    apiKey: string;
    selectedModel: string;
    isActive: boolean;
  }) => {
    try {
      const config = await aiSettingsService.saveProviderSettings(provider, settings);
      setProviderConfigs((prev) => ({
        ...prev,
        [provider]: config,
      }));
      enqueueSnackbar('Settings saved successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
      throw error;
    }
  };

  const handleVerify = async (provider: LLMProvider) => {
    try {
      setVerifying(true);
      const result = await aiSettingsService.verifyProvider(provider);
      
      if (result.isVerified && user) {
        // Send a greeting message through the WebSocket
        wsService.send('ai_message', {
          content: 'Hello! I am your AI assistant. How can I help you today?',
          userId: user.id
        });

        // Show success notification
        enqueueSnackbar(`${provider} verified successfully`, { variant: 'success' });
        
        // Trigger AI assistant panel animation
        const event = new CustomEvent('show-ai-assistant', {
          detail: { animate: true }
        });
        window.dispatchEvent(event);
      }

      await loadSettings();
    } catch (error) {
      console.error('Failed to verify provider:', error);
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to verify provider',
        { variant: 'error' }
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (provider: LLMProvider) => {
    try {
      await aiSettingsService.deleteProviderSettings(provider);
      setProviderConfigs((prev) => ({
        ...prev,
        [provider]: null,
      }));
      enqueueSnackbar('Settings deleted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to delete settings', { variant: 'error' });
    }
  };

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadSettings}>
          Retry
        </Button>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" gap={2}>
          <CircularProgress />
          <Typography>Loading AI settings...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 8 }}>
      <Stack spacing={6}>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom>AI Provider Settings</Typography>
          <AIStatusAlert />
        </Box>
        
        <Grid container spacing={3}>
          {providers.map((provider) => (
            <Grid item xs={12} md={6} lg={4} key={provider.id}>
              <ProviderCard
                provider={provider}
                config={providerConfigs[provider.id]}
                onSave={(settings) => handleSave(provider.id, settings)}
                onVerify={() => handleVerify(provider.id)}
                onDelete={() => handleDelete(provider.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
};

export default AISettings; 