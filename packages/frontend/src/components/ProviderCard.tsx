import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import KeyIcon from '@mui/icons-material/Key';
import { useSnackbar } from '../contexts/SnackbarContext';
import { AIProviderConfig, LLMProvider } from '../types/ai';
import { aiSettingsService } from '../services/aiSettings.service';
import { logger } from '../utils/logger';

interface AIProvider {
  id: LLMProvider;
  name: string;
  description: string;
  icon: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
  provider: LLMProvider;
}

interface SaveProviderSettings {
  apiKey: string;
  selectedModel: string;
  isActive: boolean;
}

interface ProviderCardProps {
  provider: AIProvider;
  config: AIProviderConfig;
  onSave: (settings: SaveProviderSettings) => Promise<void>;
  onVerify: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
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
  const { showSuccess, showError } = useSnackbar();
  const loadingKeyRef = useRef(false);
  const mountedRef = useRef(true);

  // Set up mounted ref for cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load config data when it changes
  useEffect(() => {
    if (!config || !mountedRef.current) return;
    
    logger.debug(`Setting up ProviderCard for ${provider.provider}`, config);
    
    // Set active state and selected model
    setIsActive(config.isActive || false);
    setSelectedModel(config.selectedModel || provider.defaultModel);
    
    // Load API key if available
    if (config.apiKey) {
      logger.debug(`Config has API key for ${provider.provider}, loading it`);
      loadApiKey();
    }
  }, [config, provider.defaultModel, provider.provider]);

  const loadApiKey = async () => {
    if (!config?.apiKey || !mountedRef.current) return;
    
    // Prevent multiple simultaneous loads
    if (loadingKeyRef.current) {
      logger.debug(`Already loading API key for ${provider.provider}`);
      return;
    }
    
    try {
      loadingKeyRef.current = true;
      setIsLoadingKey(true);
      setError(null);
      
      if (!provider.provider) {
        throw new Error('Invalid provider');
      }
      
      logger.debug(`Loading API key for provider: ${provider.provider}`);
      const key = await aiSettingsService.getDecryptedApiKey(provider.provider);
      
      if (!mountedRef.current) return;
      
      logger.debug(`API key loaded successfully for ${provider.provider}`);
      setApiKey(key);
    } catch (error) {
      if (!mountedRef.current) return;
      
      logger.error(`Error loading API key for ${provider.provider}:`, error);
      setError('Failed to load API key');
      showError('Failed to load API key');
    } finally {
      if (mountedRef.current) {
        setIsLoadingKey(false);
      }
      loadingKeyRef.current = false;
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);
      await onSave({ 
        apiKey, 
        selectedModel, 
        isActive: true 
      });
      setIsActive(true);
      await onVerify();
    } catch (error) {
      setError('Failed to save settings');
      showError('Failed to save settings');
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
      
      let currentApiKey = apiKey;
      
      if (!currentApiKey && config?.apiKey && provider.provider) {
        try {
          currentApiKey = await aiSettingsService.getDecryptedApiKey(provider.provider);
        } catch (error) {
          console.error('Error fetching API key for toggle:', error);
          currentApiKey = '';
        }
      }
      
      await onSave({
        apiKey: currentApiKey,
        selectedModel,
        isActive: newActiveState
      });
      
      setIsActive(newActiveState);
      
      if (newActiveState) {
        await onVerify();
      }
    } catch (error) {
      setError('Failed to update active state');
      showError('Failed to update active state');
      console.error('Error toggling active state:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box component="div" sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <Typography variant="h5" component="span" sx={{ mr: 1 }}>
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
          disabled={isLoadingKey}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            label="Model"
          >
            <MenuItem value={provider.defaultModel}>{provider.defaultModel}</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={handleActiveToggle}
              disabled={isSaving}
            />
          }
          label="Active"
        />
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!apiKey.trim() || isSaving}
          startIcon={<KeyIcon />}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleVerify}
          disabled={!config?.apiKey || isVerifying}
          startIcon={<CheckIcon />}
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={onDelete}
          disabled={!config?.apiKey || isSaving}
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );
}; 