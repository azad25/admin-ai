import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

interface CrudField {
  name: string;
  type: string;
  required: boolean;
}

interface CrudItem {
  id: string;
  pageId: string;
  [key: string]: any;
}

interface CrudDialogProps {
  open: boolean;
  selectedItem: CrudItem | null;
  formData: Record<string, any>;
  fields: CrudField[];
  onClose: () => void;
  onSave: () => void;
  onFieldChange: (fieldName: string, value: any) => void;
}

export const CrudDialog: React.FC<CrudDialogProps> = ({
  open,
  selectedItem,
  formData,
  fields,
  onClose,
  onSave,
  onFieldChange,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {selectedItem ? 'Edit Item' : 'Add New Item'}
      </DialogTitle>
      <DialogContent>
        {fields.map((field) => (
          <FormControl
            key={field.name}
            fullWidth
            margin="normal"
            required={field.required}
          >
            {field.type === 'select' ? (
              <>
                <InputLabel id={`label-${field.name}`}>
                  {field.name}
                </InputLabel>
                <Select
                  labelId={`label-${field.name}`}
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    onFieldChange(field.name, e.target.value)
                  }
                  label={field.name}
                >
                  <MenuItem value="">None</MenuItem>
                  {/* Add options dynamically if needed */}
                </Select>
              </>
            ) : (
              <TextField
                label={field.name}
                type={
                  field.type === 'number'
                    ? 'number'
                    : field.type === 'date'
                    ? 'date'
                    : 'text'
                }
                value={formData[field.name] || ''}
                onChange={(e) =>
                  onFieldChange(
                    field.name,
                    field.type === 'number'
                      ? Number(e.target.value)
                      : e.target.value
                  )
                }
                required={field.required}
              />
            )}
          </FormControl>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrudDialog; 