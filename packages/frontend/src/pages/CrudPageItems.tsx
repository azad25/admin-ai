import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useCrudPages } from '../contexts/CrudPagesContext';
import { crudPageService } from '../services';
import { useSnackbar } from '../contexts/SnackbarContext';

interface CrudField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
}

export default function CrudPageItems() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { pages } = useCrudPages();
  const { showSuccess, showError } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const page = pages.find(p => p.id === pageId);
  const fields = page?.schema.fields || [];

  useEffect(() => {
    if (pageId) {
      loadItems();
    }
  }, [pageId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await crudPageService.getCrudPageData(pageId!);
      setItems(data);
    } catch (error) {
      showError('Failed to load items');
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      await crudPageService.createCrudPageData(pageId!, formData);
      showSuccess('Item created successfully');
      setOpenDialog(false);
      resetForm();
      loadItems();
    } catch (error) {
      showError('Failed to create item');
      console.error('Error creating item:', error);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      await crudPageService.updateCrudPageData(pageId!, editingItem.id, formData);
      showSuccess('Item updated successfully');
      setOpenDialog(false);
      setEditingItem(null);
      resetForm();
      loadItems();
    } catch (error) {
      showError('Failed to update item');
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await crudPageService.deleteCrudPageData(pageId!, itemId);
      showSuccess('Item deleted successfully');
      loadItems();
    } catch (error) {
      showError('Failed to delete item');
      console.error('Error deleting item:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    resetForm();
    setOpenDialog(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setOpenDialog(true);
  };

  const resetForm = () => {
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      switch (field.type) {
        case 'boolean':
          initialData[field.name] = false;
          break;
        case 'number':
        case 'integer':
          initialData[field.name] = 0;
          break;
        case 'date':
          initialData[field.name] = new Date().toISOString().split('T')[0];
          break;
        case 'select':
        case 'string':
        case 'text':
        case 'email':
        default:
          initialData[field.name] = '';
          break;
      }
    });
    setFormData(initialData);
  };

  const renderFieldInput = (field: CrudField) => {
    const value = formData[field.name] ?? (field.type === 'boolean' ? false : field.type === 'number' ? 0 : '');
    const handleChange = (newValue: any) => {
      const processedValue = !field.required && newValue === '' ? null : newValue;
      setFormData(prev => ({ ...prev, [field.name]: processedValue }));
    };

    switch (field.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => handleChange(e.target.checked)}
              />
            }
            label={field.name}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={value ?? ''}
              label={field.name}
              onChange={(e) => handleChange(e.target.value)}
              required={field.required}
            >
              {!field.required && <MenuItem value="">None</MenuItem>}
              {/* Add your select options here */}
            </Select>
          </FormControl>
        );

      case 'number':
      case 'integer':
        return (
          <TextField
            fullWidth
            label={field.name}
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              handleChange(val);
            }}
            required={field.required}
          />
        );

      case 'date':
        return (
          <TextField
            fullWidth
            label={field.name}
            type="date"
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            label={field.name}
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            type={field.type === 'email' ? 'email' : 'text'}
            multiline={field.type === 'text'}
            rows={field.type === 'text' ? 4 : 1}
          />
        );
    }
  };

  if (!page) {
    return (
      <Box>
        <Typography color="error">CRUD page not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{page.name}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Add Item
        </Button>
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    {fields.map((field) => (
                      <TableCell key={field.name}>{field.name}</TableCell>
                    ))}
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      {fields.map((field) => (
                        <TableCell key={field.name}>
                          {field.type === 'boolean'
                            ? item[field.name] ? 'Yes' : 'No'
                            : String(item[field.name] || '-')}
                        </TableCell>
                      ))}
                      <TableCell align="right">
                        <IconButton onClick={() => openEditDialog(item)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteItem(item.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={fields.length + 1} align="center">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Edit Item' : 'Add New Item'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {fields.map((field) => (
              <Box key={field.name}>
                {renderFieldInput(field)}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={editingItem ? handleUpdateItem : handleCreateItem}
            variant="contained"
            color="primary"
          >
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 