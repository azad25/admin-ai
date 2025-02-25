import React, { useState, useEffect } from 'react';
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
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useCrudPages } from '../contexts/CrudPagesContext';
import { crudPageService } from '../services/crudPages';
import { useSnackbar } from '../contexts/SnackbarContext';

interface CrudField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
}

interface CrudRecord {
  id: string;
  [key: string]: any;
}

export const CrudPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pages, loading: pagesLoading, refreshPages } = useCrudPages();
  const { showSuccess, showError } = useSnackbar();
  const [page, setPage] = useState<any>(null);
  const [records, setRecords] = useState<CrudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrudRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadPageAndData();
  }, [id]);

  const loadPageAndData = async () => {
    if (!id) {
      setError('No page ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch the page directly from the API
      const currentPage = await crudPageService.getCrudPage(id);
      setPage(currentPage);
      
      // Load the records for this page
      const data = await crudPageService.getCrudPageData(id);
      setRecords(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError('Failed to load page. Please make sure the page exists and you have access to it.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({});
    setOpenDialog(true);
  };

  const handleEdit = (record: CrudRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setOpenDialog(true);
  };

  const handleDelete = async (record: CrudRecord) => {
    if (!id) return;
    
    try {
      await crudPageService.deleteCrudPageData(id, record.id);
      setRecords(records.filter(r => r.id !== record.id));
      showSuccess('Record deleted successfully');
    } catch (err) {
      console.error('Failed to delete record:', err);
      showError('Failed to delete record');
    }
  };

  const handleSave = async () => {
    if (!id || !page) return;

    try {
      let savedRecord: CrudRecord;
      if (editingRecord) {
        savedRecord = await crudPageService.updateCrudPageData(id, editingRecord.id, formData);
        setRecords(records.map(r => r.id === editingRecord.id ? savedRecord : r));
        showSuccess('Record updated successfully');
      } else {
        savedRecord = await crudPageService.createCrudPageData(id, formData);
        setRecords([...records, savedRecord]);
        showSuccess('Record created successfully');
      }
      loadPageAndData();
      setOpenDialog(false);
    } catch (err) {
      console.error('Failed to save record:', err);
      showError('Failed to save record');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  if (loading || pagesLoading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          {loading ? 'Loading page data...' : 'Loading pages...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          action={
            <Box>
              <Button color="inherit" size="small" onClick={loadPageAndData} sx={{ mr: 1 }}>
                Retry
              </Button>
              <Button color="inherit" size="small" onClick={() => navigate('/crud-pages')}>
                Go Back
              </Button>
            </Box>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!page) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          CRUD page not found. This could happen if:
          <ul>
            <li>The page was recently deleted</li>
            <li>You don't have permission to access this page</li>
            <li>The URL is incorrect</li>
          </ul>
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/crud-pages')}
          sx={{ mt: 2 }}
        >
          Go to CRUD Pages
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">{page.name}</Typography>
        {page.config.allowCreate && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add Record
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {page.schema.fields.map((field: CrudField) => (
                    <TableCell key={field.name}>{field.name}</TableCell>
                  ))}
                  {(page.config.allowEdit || page.config.allowDelete) && (
                    <TableCell align="right">Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={page.schema.fields.length + 1} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      {page.schema.fields.map((field: CrudField) => (
                        <TableCell key={field.name}>
                          {field.type === 'boolean' ? (
                            record[field.name] ? 'Yes' : 'No'
                          ) : field.type === 'date' ? (
                            new Date(record[field.name]).toLocaleDateString()
                          ) : (
                            String(record[field.name] || '-')
                          )}
                        </TableCell>
                      ))}
                      {(page.config.allowEdit || page.config.allowDelete) && (
                        <TableCell align="right">
                          {page.config.allowEdit && (
                            <IconButton onClick={() => handleEdit(record)} size="small">
                              <EditIcon />
                            </IconButton>
                          )}
                          {page.config.allowDelete && (
                            <IconButton onClick={() => handleDelete(record)} size="small">
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRecord ? 'Edit Record' : 'Add New Record'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {page.schema.fields.map((field: CrudField) => (
              <FormControl key={field.name} fullWidth sx={{ mb: 2 }}>
                {field.type === 'select' ? (
                  <>
                    <InputLabel>{field.name}</InputLabel>
                    <Select
                      value={formData[field.name] || ''}
                      label={field.name}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      required={field.required}
                    >
                      <MenuItem value="">None</MenuItem>
                      {/* Add your select options here */}
                    </Select>
                  </>
                ) : field.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData[field.name] || false}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                      />
                    }
                    label={field.name}
                  />
                ) : (
                  <TextField
                    label={field.name}
                    type={
                      field.type === 'number' ? 'number' :
                      field.type === 'date' ? 'date' :
                      field.type === 'email' ? 'email' :
                      field.type === 'url' ? 'url' :
                      'text'
                    }
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                    fullWidth
                  />
                )}
              </FormControl>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 