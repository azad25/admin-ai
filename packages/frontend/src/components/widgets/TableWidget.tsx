import { Box, Typography, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface TableWidgetProps {
  config: {
    endpoint: string;
    columns: GridColDef[];
    title?: string;
    pageSize?: number;
  };
}

export default function TableWidget({ config }: TableWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['table-data', config.endpoint],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/${config.endpoint}`
      );
      return data;
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography color="error">Failed to load table data</Typography>
      </Box>
    );
  }

  return (
    <Box height={400}>
      {config.title && (
        <Typography variant="h6" gutterBottom>
          {config.title}
        </Typography>
      )}
      <DataGrid
        rows={data}
        columns={config.columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: config.pageSize || 5,
            },
          },
        }}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
        autoHeight
      />
    </Box>
  );
} 