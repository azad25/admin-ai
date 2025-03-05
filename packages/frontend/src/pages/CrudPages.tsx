import React, { useState } from 'react';
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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { CreateCrudPageData } from '../types/crud';
import { useCrudPages } from '../contexts/CrudPagesContext';
import { useAuth } from '../contexts/AuthContext';

const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'text',
  'email',
  'url',
  'select',
];

interface Field {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  label?: string;
}

interface CrudPageSchema {
  type: string;
  properties: Record<string, any>;
  tableName: string;
  description: string;
  fields: Field[];
}

interface ExtendedCrudPage {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  userId: string;
  fields: Field[];
  schema: CrudPageSchema;
  config: {
    defaultView: 'table' | 'grid';
    allowCreate: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const CrudPages: React.FC = () => {
  const { pages, loading, createPage, updatePage, deletePage } = useCrudPages();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<ExtendedCrudPage | null>(null);
  const [formData, setFormData] = useState<CreateCrudPageData>({
    name: '',
    description: '',
    tableName: '',
    fields: [{ name: '', type: 'string', required: false, unique: false, label: '' }],
  });
  const { user } = useAuth();

  const handleCreatePage = async () => {
    try {
      await createPage(formData);
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      // Error is already handled by the context
    }
  };

  const handleUpdatePage = async () => {
    if (!editingPage) return;
    try {
      await updatePage(editingPage.id, formData);
      setOpenDialog(false);
      setEditingPage(null);
      resetForm();
    } catch (error) {
      // Error is already handled by the context
    }
  };

  const handleDeletePage = async (id: string) => {
    try {
      await deletePage(id);
    } catch (error) {
      // Error is already handled by the context
    }
  };

  const openCreateDialog = () => {
    setEditingPage(null);
    resetForm();
    setOpenDialog(true);
  };

  const openEditDialog = (page: ExtendedCrudPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      description: page.description || '',
      tableName: page.schema.tableName || '',
      fields: page.fields.map(field => ({
        ...field,
        label: field.label || ''
      })),
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tableName: '',
      fields: [{ name: '', type: 'string', required: false, unique: false, label: '' }],
    });
  };

  const handleAddField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { name: '', type: 'string', required: false, unique: false, label: '' }],
    });
  };

  const handleRemoveField = (index: number) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index),
    });
  };

  const handleFieldChange = (index: number, field: Partial<Field>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...field };
    setFormData({ ...formData, fields: newFields });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">CRUD Pages</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create CRUD Page
        </Button>
      </Box>

      <Card>
        <CardContent>
          <List>
            {loading ? (
              <ListItem>
                <ListItemText primary="Loading..." />
              </ListItem>
            ) : pages.length === 0 ? (
              <ListItem>
                <ListItemText primary="No CRUD pages found" />
              </ListItem>
            ) : (
              pages.map((page) => (
                <ListItem key={page.id} divider>
                  <ListItemText
                    primary={page.name}
                    secondary={
                      <>
                        Table: {page.schema.tableName} - {page.schema.description}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => openEditDialog({ ...page, userId: user?.id || '' })} sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeletePage(page.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </CardContent>
      </Card>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPage ? 'Edit CRUD Page' : 'Create New CRUD Page'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Page Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Table Name"
                fullWidth
                value={formData.tableName}
                onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6">Fields</Typography>
              {formData.fields.map((field, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <TextField
                        label="Field Name"
                        fullWidth
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          label="Type"
                          onChange={(e) => handleFieldChange(index, { type: e.target.value })}
                        >
                          {FIELD_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.required}
                            onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                          />
                        }
                        label="Required"
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.unique}
                            onChange={(e) => handleFieldChange(index, { unique: e.target.checked })}
                          />
                        }
                        label="Unique"
                      />
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton onClick={() => handleRemoveField(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              <Button onClick={handleAddField} startIcon={<AddIcon />}>
                Add Field
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={editingPage ? handleUpdatePage : handleCreatePage}
            variant="contained"
            color="primary"
          >
            {editingPage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 