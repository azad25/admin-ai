import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { WidgetType } from '@admin-ai/shared';

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
}

const widgetTypes: WidgetType[] = [
  'CHART',
  'TABLE',
  'METRIC',
  'MAP',
  'WEATHER',
  'STATUS',
];

export default function AddWidgetDialog({ open, onClose }: AddWidgetDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WidgetType>('CHART');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/widgets', {
        name,
        type,
        config: getDefaultConfig(type),
        position: {
          x: 0,
          y: 0,
          width: 4,
          height: 4,
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      onClose();
      setName('');
      setType('CHART');
    },
  });

  const getDefaultConfig = (type: WidgetType) => {
    switch (type) {
      case 'CHART':
        return {
          title: '',
          endpoint: 'metrics/chart',
          dataKey: 'value',
          xAxisKey: 'timestamp',
        };
      case 'TABLE':
        return {
          endpoint: 'data/table',
          columns: [],
        };
      case 'METRIC':
        return {
          title: '',
          endpoint: 'metrics/single',
          format: 'number',
        };
      case 'MAP':
        return {
          center: { lat: 0, lng: 0 },
          zoom: 2,
        };
      case 'WEATHER':
        return {
          location: '',
          unit: 'celsius',
        };
      case 'STATUS':
        return {
          endpoint: 'status',
          refreshInterval: 30000,
        };
      default:
        return {};
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add Widget</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Widget Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              select
              label="Widget Type"
              fullWidth
              value={type}
              onChange={(e) => setType(e.target.value as WidgetType)}
              required
            >
              {widgetTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? 'Adding...' : 'Add Widget'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 