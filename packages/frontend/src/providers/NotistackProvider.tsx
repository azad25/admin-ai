import React from 'react';
import { SnackbarProvider as NotistackSnackbarProvider, SnackbarProviderProps } from 'notistack';
import { logger } from '../utils/logger';

type NotistackProviderProps = SnackbarProviderProps;

export const NotistackProvider: React.FC<NotistackProviderProps> = (props) => {
  logger.debug('Initializing NotistackProvider with props:', { ...props, maxSnack: props.maxSnack || 0 });
  
  // Always set maxSnack to 0 to disable global notifications
  // All notifications will be handled by the SnackbarContext and sent to the AI panel
  return (
    <NotistackSnackbarProvider 
      {...props} 
      maxSnack={0}
    />
  );
}; 