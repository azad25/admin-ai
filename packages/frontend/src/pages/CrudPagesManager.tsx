import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';
import { useCrud } from '../contexts/CrudContext';

interface Field {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface FormData {
  name: string;
  description: string;
  endpoint: string;
  fields: Field[];
  schema: Record<string, any>;
  config: Record<string, any>;
}

interface CrudPage {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  fields: Field[];
  schema: {
    type: string;
    properties: Record<string, any>;
  };
  config: Record<string, any>;
}

export const CrudPagesManager: React.FC = () => {
  const navigate = useNavigate();
  const { pages, createPage, updatePage, deletePage } = useCrud();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<CrudPage | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    endpoint: '',
    fields: [],
    schema: {},
    config: {}
  });
  const [openFieldDialog, setOpenFieldDialog] = useState(false);
  const [fieldData, setFieldData] = useState<Field>({
    name: '',
    label: '',
    type: 'text',
    required: false
  });

  const handleAdd = () => {
    setEditingPage(null);
    setFormData({
      name: '',
      description: '',
      endpoint: '',
      fields: [],
      schema: {},
      config: {}
    });
    setOpenDialog(true);
  };

  const handleEdit = (page: CrudPage) => {
    if (!page.id) return;
    setEditingPage(page);
    setFormData({
      name: page.name,
      description: page.description,
      endpoint: page.endpoint,
      fields: page.fields,
      schema: page.schema,
      config: page.config
    });
    setOpenDialog(true);
  };

  const handleDelete = async (page: CrudPage) => {
    if (!page.id) return;
    await deletePage(page.id);
  };

  const handleSubmit = async () => {
    try {
      const pageData = {
        ...formData,
        schema: {
          type: 'object',
          properties: formData.fields.reduce((acc, field) => ({
            ...acc,
            [field.name]: {
              type: field.type === 'number' ? 'number' : 'string',
              title: field.label,
              required: field.required
            }
          }), {})
        }
      };

      if (editingPage) {
        await updatePage(editingPage.id, pageData);
      } else {
        await createPage(pageData);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleAddField = () => {
    setFieldData({
      name: '',
      label: '',
      type: 'text',
      required: false
    });
    setOpenFieldDialog(true);
  };

  const handleFieldSubmit = () => {
    if (fieldData.name && fieldData.label) {
      setFormData({
        ...formData,
        fields: [...formData.fields, fieldData]
      });
      setOpenFieldDialog(false);
    }
  };

  const handleDeleteField = (index: number) => {
    const newFields = [...formData.fields];
    newFields.splice(index, 1);
    setFormData({
      ...formData,
      fields: newFields
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(formData.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData({
      ...formData,
      fields: items
    });
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">CRUD Pages</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Create Page
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Fields</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell>{page.name}</TableCell>
                <TableCell>{page.description}</TableCell>
                <TableCell>{(page.fields || []).length} fields</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleEdit(page)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(page)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPage ? 'Edit CRUD Page' : 'Create CRUD Page'}
        </DialogTitle>
        <DialogContent>
          <Box py={1}>
            <TextField
              fullWidth
              label="Page Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="API Endpoint"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              margin="normal"
              helperText="The base endpoint for CRUD operations (e.g., /api/users)"
            />
            <Box mt={2}>
              <Typography variant="subtitle1">Fields</Typography>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="fields">
                  {(provided: DroppableProvided) => (
                    <List {...provided.droppableProps} ref={provided.innerRef}>
                      {formData.fields.map((field, index) => (
                        <Draggable key={field.name} draggableId={field.name} index={index}>
                          {(provided: DraggableProvided) => (
                            <ListItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <DragIcon sx={{ mr: 2, color: 'text.secondary' }} />
                              <ListItemText
                                primary={field.label}
                                secondary={`${field.type}${field.required ? ' (required)' : ''}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  aria-label="delete"
                                  onClick={() => handleDeleteField(index)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddField}
                sx={{ mt: 1 }}
              >
                Add Field
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            disabled={!formData.name || formData.fields.length === 0 || !formData.endpoint}
          >
            {editingPage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openFieldDialog} onClose={() => setOpenFieldDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Field</DialogTitle>
        <DialogContent>
          <Box py={1}>
            <TextField
              fullWidth
              label="Field Name"
              value={fieldData.name}
              onChange={(e) => setFieldData({ ...fieldData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              margin="normal"
              helperText="This will be used as the database column name"
            />
            <TextField
              fullWidth
              label="Field Label"
              value={fieldData.label}
              onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
              margin="normal"
              helperText="This will be displayed in the form"
            />
            <TextField
              fullWidth
              select
              label="Field Type"
              value={fieldData.type}
              onChange={(e) => setFieldData({ ...fieldData, type: e.target.value })}
              margin="normal"
              SelectProps={{
                native: true
              }}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
              <option value="date">Date</option>
              <option value="textarea">Text Area</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFieldDialog(false)}>Cancel</Button>
          <Button
            onClick={handleFieldSubmit}
            color="primary"
            disabled={!fieldData.name || !fieldData.label}
          >
            Add Field
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 