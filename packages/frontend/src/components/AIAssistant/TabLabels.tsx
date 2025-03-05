import React from 'react';
import { Box, styled } from '@mui/material';

interface TabLabelProps {
  count: number;
}

// Create styled components to avoid complex union types
const TabLabelContainer = styled(Box)({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center'
});

const CountBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -10,
  right: -16,
  backgroundColor: theme.palette.error.main,
  color: 'white',
  borderRadius: '50%',
  width: 20,
  height: 20,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  animation: 'pulse 1.5s infinite',
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 0, 0, 0.7)' },
    '50%': { transform: 'scale(1.2)', boxShadow: '0 0 0 5px rgba(255, 0, 0, 0)' },
    '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 0, 0, 0)' },
  },
}));

export const ChatTabLabel: React.FC<TabLabelProps> = ({ count }) => (
  <TabLabelContainer>
    Chat
    {count > 0 && (
      <CountBadge>
        {count}
      </CountBadge>
    )}
  </TabLabelContainer>
);

export const NotificationsTabLabel: React.FC<TabLabelProps> = ({ count }) => (
  <TabLabelContainer>
    Notifications
    {count > 0 && (
      <CountBadge>
        {count}
      </CountBadge>
    )}
  </TabLabelContainer>
); 