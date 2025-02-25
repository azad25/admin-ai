import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  CircularProgress,
  Box,
  Tooltip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  Storage as StorageIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import { useCrud } from '../contexts/CrudContext';
import { CreateCrudPageData } from '../types/crud';
import { useSnackbar } from '../contexts/SnackbarContext';
import axios from 'axios';

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

interface DynamicCrudMenuProps {
  onNavigate?: () => void;
}

export const DynamicCrudMenu: React.FC<DynamicCrudMenuProps> = ({ onNavigate }) => {
  const [open, setOpen] = React.useState(true);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const { pages, loading, error, refreshPages, createPage } = useCrud();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = React.useState<CreateCrudPageData>({
    name: '',
    description: '',
    tableName: '',
    fields: [{ name: '', type: 'string', required: false, unique: false, label: '' }],
  });

  useEffect(() => {
    refreshPages();
  }, []);

  const handleClick = () => {
    setOpen(!open);
  };

  const handlePageClick = (path: string) => {
    navigate(path);
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshPages();
    } catch (error) {
      console.error('Failed to refresh pages:', error);
    }
  };

  const handleCreatePage = async () => {
    try {
      setFormError(null);
      if (!validateForm()) {
        return;
      }

      // Format table name: lowercase, replace spaces with underscores
      const formattedTableName = formData.tableName.toLowerCase().replace(/\s+/g, '_');

      const pageData: CreateCrudPageData = {
        name: formData.description || formattedTableName, // Use description as name, fallback to tableName
        description: formData.description,
        tableName: formattedTableName,
        fields: formData.fields.map(field => ({
          ...field,
          name: formatFieldName(field.name)
        }))
      };

      const createdPage = await createPage(pageData);
      showSuccess('CRUD page created successfully');
      setOpenDialog(false);
      resetForm();
      await refreshPages();
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 'Failed to create page';
        setFormError(errorMessage);
        showError(errorMessage);
      } else {
        setFormError('An unexpected error occurred');
        showError('Failed to create page');
      }
      console.error('Error creating page:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return false;
    }

    if (!formData.tableName.trim()) {
      setFormError('Table name is required');
      return false;
    }

    // Validate table name format
    const tableNameRegex = /^[a-z][a-z0-9_]*$/;
    if (!tableNameRegex.test(formData.tableName.toLowerCase())) {
      setFormError('Table name must start with a letter and contain only lowercase letters, numbers, and underscores');
      return false;
    }

    if (formData.fields.length === 0) {
      setFormError('At least one field is required');
      return false;
    }

    // Check for duplicate field names
    const fieldNames = formData.fields.map(f => f.name.toLowerCase());
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      setFormError(`Duplicate field names found: ${duplicates.join(', ')}`);
      return false;
    }

    // Validate field names
    const invalidFields = formData.fields.filter(
      field => !field.name.trim() || !/^[a-z][a-z0-9_]*$/.test(field.name.toLowerCase())
    );
    if (invalidFields.length > 0) {
      setFormError('Field names must start with a letter and contain only lowercase letters, numbers, and underscores');
      return false;
    }

    return true;
  };

  const formatFieldName = (name: string): string => {
    return name.toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
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
    
    // Auto-format field name if it's being changed
    if (field.name !== undefined) {
      newFields[index].name = formatFieldName(field.name);
    }
    
    setFormData({ ...formData, fields: newFields });
    setFormError(null); // Clear error when user makes changes
  };

  return (
    <>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <TableChartIcon />
        </ListItemIcon>
        <ListItemText primary="Dynamic Pages" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button size="small" onClick={handleRefresh} sx={{ mt: 1 }}>
                Retry
              </Button>
            </Box>
          ) : pages && pages.length > 0 ? (
            pages.map((page) => (
              <ListItemButton
                key={page.id}
                onClick={() => handlePageClick(`/crud-pages/${page.id}`)}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <StorageIcon />
                </ListItemIcon>
                <ListItemText primary={page.name} />
              </ListItemButton>
            ))
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No pages found
              </Typography>
            </Box>
          )}

          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              variant="contained"
              size="small"
            >
              Create Page
            </Button>
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
        </List>
      </Collapse>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create CRUD Page</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Table Name"
                value={formData.tableName}
                onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                required
                helperText="Must start with a letter and contain only lowercase letters, numbers, and underscores"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Fields
              </Typography>
              {formData.fields.map((field, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Field Name"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, { type: e.target.value })}
                          label="Type"
                        >
                          {FIELD_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.required}
                            onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                          />
                        }
                        label="Required"
                      />
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
                    <Grid item xs={12} sm={1}>
                      <IconButton
                        onClick={() => handleRemoveField(index)}
                        disabled={formData.fields.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddField}>
                Add Field
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePage} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 