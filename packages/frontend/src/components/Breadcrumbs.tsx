import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'api-keys': 'API Keys',
  'crud-pages': 'CRUD Pages',
  'crud': 'CRUD Page',
  'settings': 'Settings',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on the root path
  if (location.pathname === '/') {
    return null;
  }

  return (
    <Box mb={3}>
      <MuiBreadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
        <Link
          component={RouterLink}
          to="/"
          color="inherit"
          underline="hover"
        >
          Dashboard
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const label = routeLabels[value] || value;

          if (last) {
            return (
              <Typography color="text.primary" key={to}>
                {label}
              </Typography>
            );
          }

          return (
            <Link
              component={RouterLink}
              to={to}
              color="inherit"
              underline="hover"
              key={to}
            >
              {label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
} 