import React from 'react';
import { Fab, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { Chat as ChatIcon } from '@mui/icons-material';

export const FloatingButton = styled(motion(Fab))({
  position: 'fixed',
  bottom: 16,
  right: 16,
  zIndex: 1000
});

// Add a styled component for the notification badge
export const NotificationBadgeBox = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -5,
  right: -5,
  backgroundColor: theme.palette.error.main,
  color: 'white',
  borderRadius: '50%',
  minWidth: 20,
  height: 20,
  padding: '0 4px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '0.75rem',
  fontWeight: 'bold',
}));

interface AIFloatingButtonProps {
  unreadCount: number;
  onClick: () => void;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({ unreadCount, onClick }) => {
  return (
    <FloatingButton
      color="primary"
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <ChatIcon />
      {unreadCount > 0 && (
        <NotificationBadgeBox>
          {unreadCount > 99 ? '99+' : unreadCount}
        </NotificationBadgeBox>
      )}
    </FloatingButton>
  );
}; 