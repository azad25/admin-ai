import React, { useState, useEffect } from 'react';
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
import { useAi } from '../contexts/AiContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { aiSettingsService } from '../services/aiSettings';
import { LLMProvider, AIProviderConfig } from '@admin-ai/shared/src/types/ai';

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
  const { showError } = useSnackbar();

  // Load initial state from config
  useEffect(() => {
    if (config) {
      setIsActive(config.isActive || false);
      setSelectedModel(config.selectedModel || provider.defaultModel);
      loadApiKey();
    }
  }, [config]);

  const loadApiKey = async () => {
    if (!config?.apiKey) return;
    
    try {
      setIsLoadingKey(true);
      setError(null);
      const key = await aiSettingsService.getDecryptedApiKey(provider.id);
      setApiKey(key);
    } catch (error) {
      showError('Failed to load API key');
      setError('Failed to load API key');
    } finally {
      setIsLoadingKey(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;

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
      showError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
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
      showError('Failed to update active state');
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
  const { showSuccess, showError } = useSnackbar();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
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
      showError(error?.message || 'Failed to load AI settings');
    } finally {
      setLoading(false);
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
      showSuccess('Settings saved successfully');
    } catch (error) {
      showError('Failed to save settings');
      throw error;
    }
  };

  const handleVerify = async (provider: LLMProvider) => {
    try {
      const result = await aiSettingsService.verifyProvider(provider);
      setProviderConfigs((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider]!,
          isVerified: result.isVerified,
          availableModels: result.availableModels,
        },
      }));
      showSuccess('API key verified successfully');
    } catch (error) {
      showError('Failed to verify API key');
      throw error;
    }
  };

  const handleDelete = async (provider: LLMProvider) => {
    try {
      await aiSettingsService.deleteProviderSettings(provider);
      setProviderConfigs((prev) => ({
        ...prev,
        [provider]: null,
      }));
      showSuccess('Settings deleted successfully');
    } catch (error) {
      showError('Failed to delete settings');
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
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Settings
      </Typography>
      <Typography color="textSecondary" paragraph>
        Configure your AI providers and API keys
      </Typography>
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
    </Container>
  );
};

export default AISettings; 