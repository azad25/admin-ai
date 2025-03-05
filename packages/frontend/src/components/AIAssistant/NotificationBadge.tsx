import React from 'react';
import { Badge } from '@mui/material';
import { NotificationsOutlined } from '@mui/icons-material';

interface NotificationBadgeProps {
  count: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  return (
    <Badge 
      badgeContent={count} 
      color="error"
      sx={{
        '& .MuiBadge-badge': {
          animation: count > 0 ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 0, 0, 0.7)' },
            '50%': { transform: 'scale(1.2)', boxShadow: '0 0 0 5px rgba(255, 0, 0, 0)' },
            '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 0, 0, 0)' },
          },
        },
      }}
    >
      <NotificationsOutlined />
    </Badge>
  );
}; 