import React from 'react';
import { Typography, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  SignalWifiOff as DisconnectedIcon,
  SignalWifi4Bar as ConnectedIcon,
  SignalWifiStatusbarConnectedNoInternet4 as ConnectingIcon,
  Check as ReadyIcon
} from '@mui/icons-material';

const Header = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTopLeftRadius: theme.spacing(2),
  borderTopRightRadius: theme.spacing(2)
}));

interface PanelHeaderProps {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  onClose: () => void;
  hasMessages?: boolean;
  hasVerifiedProvider?: boolean;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ 
  connectionStatus, 
  onClose,
  hasMessages = false,
  hasVerifiedProvider = false
}) => {
  // If we have a verified provider, always show as "ready" regardless of actual connection status
  // Force 'ready' status when hasVerifiedProvider is true
  const effectiveStatus = hasVerifiedProvider 
    ? 'ready' 
    : connectionStatus;

  const getStatusColor = () => {
    // Always return green when hasVerifiedProvider is true
    if (hasVerifiedProvider) {
      return '#4caf50'; // green
    }
    
    switch (effectiveStatus) {
      case 'ready':
        return '#4caf50'; // green
      case 'connected':
        return '#4caf50'; // green
      case 'connecting':
        return '#ff9800'; // orange
      case 'disconnected':
      default:
        return '#f44336'; // red
    }
  };

  const getStatusText = () => {
    // Always show "Ready" when hasVerifiedProvider is true
    if (hasVerifiedProvider) {
      return 'Ready';
    }
    
    switch (effectiveStatus) {
      case 'ready':
        return 'Ready';
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    // Always show ReadyIcon when hasVerifiedProvider is true
    if (hasVerifiedProvider) {
      return <ReadyIcon style={{ color: '#4caf50' }} />;
    }
    
    switch (effectiveStatus) {
      case 'ready':
        return <ReadyIcon style={{ color: getStatusColor() }} />;
      case 'connected':
        return <ConnectedIcon style={{ color: getStatusColor() }} />;
      case 'connecting':
        return <ConnectingIcon style={{ color: getStatusColor() }} />;
      case 'disconnected':
      default:
        return <DisconnectedIcon style={{ color: getStatusColor() }} />;
    }
  };

  return (
    <Header>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" style={{ marginRight: '8px' }}>
          AI Assistant
        </Typography>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          border: `1px solid ${getStatusColor()}`,
          borderRadius: '16px',
          padding: '0 8px',
          fontSize: '0.75rem',
          color: getStatusColor()
        }}>
          {getStatusIcon()}
          <span style={{ marginLeft: '4px' }}>{getStatusText()}</span>
        </div>
      </div>
      <IconButton
        size="small"
        onClick={onClose}
        style={{ color: 'white' }}
      >
        <CloseIcon />
      </IconButton>
    </Header>
  );
}; 