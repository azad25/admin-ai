import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const TabPanel = styled(Box)(({ theme }) => ({
  padding: 0,
  flex: 1,
  overflowY: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  height: 'calc(100% - 48px)'
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  isNotificationPanel?: boolean;
}

export const TabPanelComponent: React.FC<TabPanelProps> = ({ 
  children, 
  value, 
  index,
  isNotificationPanel = false
}) => {
  return (
    <TabPanel
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tab-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      sx={{ 
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
        ...(isNotificationPanel && {
          '& > div': {
            display: 'flex',
            flexDirection: 'column',
            '& > div': {
              marginBottom: 2
            }
          }
        })
      }}
    >
      {value === index && children}
    </TabPanel>
  );
}; 