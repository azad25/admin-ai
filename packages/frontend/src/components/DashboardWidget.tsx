import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../services/api';

interface DashboardWidgetProps {
  crudPage: {
    id: string;
    name: string;
    endpoint: string;
    schema: {
      fields: Array<{
        name: string;
        type: string;
      }>;
    };
  };
}

export default function DashboardWidget({ crudPage }: DashboardWidgetProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['crudData', crudPage.id],
    queryFn: async () => {
      const response = await api.get(crudPage.endpoint);
      return response.data;
    },
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Typography color="error">
          Error loading data. Please try again.
        </Typography>
      );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <Typography color="text.secondary">
          No data available.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {crudPage.schema.fields.map((field) => (
                <TableCell key={field.name}>{field.name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(0, 5).map((row: Record<string, any>, index: number) => (
              <TableRow key={index}>
                {crudPage.schema.fields.map((field) => (
                  <TableCell key={field.name}>
                    {row[field.name]?.toString() || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Card>
      <CardHeader
        title={crudPage.name}
        action={
          <>
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </>
        }
      />
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
} 