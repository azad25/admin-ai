import React from 'react';
import {
  Typography,
  Box,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { CrudItem } from '../../../types/crud';

// Extended CrudField interface with additional properties needed for this component
interface CrudField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  label: string;
}

interface DataManagementPanelProps {
  items: CrudItem[];
  fields: CrudField[];
  onAdd: () => void;
  onEdit: (item: CrudItem) => void;
  onDelete: (item: CrudItem) => void;
}

const DataManagementPanel: React.FC<DataManagementPanelProps> = ({
  items,
  fields,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Data Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
        >
          Add New
        </Button>
      </Box>
      {items && items.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {fields.map((field) => (
                  <TableCell key={field.id}>{field.label}</TableCell>
                ))}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  {fields.map((field) => (
                    <TableCell key={`${item.id}-${field.id}`}>
                      {field.type === 'boolean' ? (
                        item[field.id] ? (
                          <Chip
                            label="Yes"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="No"
                            color="error"
                            size="small"
                          />
                        )
                      ) : field.type === 'date' ? (
                        new Date(item[field.id]).toLocaleString()
                      ) : (
                        item[field.id]
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(item)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(item)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary">
          No items available. Click "Add New" to create one.
        </Typography>
      )}
    </Paper>
  );
};

export default DataManagementPanel;