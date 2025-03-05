import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { ApiKey } from '@admin-ai/shared';
import { apiKeyService } from '../services/apiKeys';

export const ApiKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [keyName, setKeyName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await apiKeyService.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      showSnackbar('Failed to load API keys', 'error');
    }
  };

  const handleCreateKey = async () => {
    try {
      const newKey = await apiKeyService.createApiKey(keyName);
      setApiKeys([...apiKeys, newKey]);
      setOpenDialog(false);
      setKeyName('');
      showSnackbar('API key created successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to create API key', 'error');
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey) return;
    try {
      const updatedKey = await apiKeyService.updateApiKey(editingKey.id, keyName);
      setApiKeys(apiKeys.map(key => key.id === updatedKey.id ? updatedKey : key));
      setOpenDialog(false);
      setEditingKey(null);
      setKeyName('');
      showSnackbar('API key updated successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to update API key', 'error');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await apiKeyService.deleteApiKey(id);
      setApiKeys(apiKeys.filter(key => key.id !== id));
      showSnackbar('API key deleted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to delete API key', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const openCreateDialog = () => {
    setEditingKey(null);
    setKeyName('');
    setOpenDialog(true);
  };

  const openEditDialog = (key: ApiKey) => {
    setEditingKey(key);
    setKeyName(key.name);
    setOpenDialog(true);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">API Keys</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create API Key
        </Button>
      </Box>

      <Card>
        <CardContent>
          <List>
            {apiKeys.map((key) => (
              <ListItem key={key.id} divider>
                <ListItemText
                  primary={key.name}
                  secondary={`Created: ${new Date(key.createdAt).toLocaleDateString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => openEditDialog(key)} sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDeleteKey(key.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {apiKeys.length === 0 && (
              <ListItem>
                <ListItemText primary="No API keys found" />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingKey ? 'Edit API Key' : 'Create New API Key'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="API Key Name"
            fullWidth
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={editingKey ? handleUpdateKey : handleCreateKey} color="primary">
            {editingKey ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 