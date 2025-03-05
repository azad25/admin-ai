import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AIProviderConfig, LLMProvider, AIMessage } from '../../types/ai';
import { aiSettingsService } from '../../services/aiSettings.service';
import { logger } from '../../utils/logger';

export interface AIState {
  providers: AIProviderConfig[];
  isLoading: boolean;
  isConnected: boolean;
  isProcessing: boolean;
  isInitialized: boolean;
  error: string | null;
  messages: AIMessage[];
}

const initialState: AIState = {
  providers: [],
  isLoading: false,
  isConnected: false,
  isProcessing: false,
  isInitialized: false,
  error: null,
  messages: []
};

// Async thunks
export const loadProviders = createAsyncThunk(
  'ai/loadProviders',
  async (_, { rejectWithValue }) => {
    try {
      const providers = await aiSettingsService.getAllProviderSettings();
      return providers;
    } catch (error) {
      logger.error('Failed to load providers:', error);
      return rejectWithValue('Failed to load AI providers');
    }
  }
);

export const updateProvider = createAsyncThunk(
  'ai/updateProvider',
  async ({ provider, settings }: { provider: LLMProvider; settings: any }, { rejectWithValue }) => {
    try {
      await aiSettingsService.updateProvider(provider, settings);
      
      const updatedProviders = await aiSettingsService.getAllProviderSettings();
      return { provider, settings, providers: updatedProviders };
    } catch (error) {
      logger.error('Failed to update provider:', error);
      return rejectWithValue('Failed to update provider settings');
    }
  }
);

export const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProviders: (state, action: PayloadAction<AIProviderConfig[]>) => {
      state.providers = action.payload;
    },
    addMessage: (state, action: PayloadAction<AIMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProviders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadProviders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.providers = action.payload;
        state.error = null;
      })
      .addCase(loadProviders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to load providers';
      })
      .addCase(updateProvider.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProvider.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.providers) {
          state.providers = action.payload.providers;
        } else {
          state.providers = state.providers.map(p => 
            p.provider === action.payload.provider
              ? { ...p, ...action.payload.settings }
              : p
          );
        }
        state.error = null;
      })
      .addCase(updateProvider.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to update provider';
      });
  }
});

export const {
  setLoading,
  setConnected,
  setProcessing,
  setInitialized,
  setError,
  setProviders,
  addMessage,
  clearMessages
} = aiSlice.actions;

export const aiReducer = aiSlice.reducer; 