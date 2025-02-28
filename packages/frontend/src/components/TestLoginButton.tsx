import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface TestLoginButtonProps extends Omit<ButtonProps, 'onClick'> {
  onFillCredentials?: (email: string, password: string) => void;
  autoLogin?: boolean;
}

export const TestLoginButton: React.FC<TestLoginButtonProps> = ({ 
  onFillCredentials,
  autoLogin = false,
  sx,
  ...buttonProps
}) => {
  const { login } = useAuth();
  const testCredentials = {
    email: 'admin@admin.ai',
    password: 'admin123'
  };

  const handleTestLogin = async () => {
    if (onFillCredentials) {
      onFillCredentials(testCredentials.email, testCredentials.password);
    }
    
    if (autoLogin) {
      try {
        await login(testCredentials.email, testCredentials.password);
        console.log('Test login successful');
      } catch (error) {
        console.error('Test login failed:', error);
      }
    }
  };

  return (
    <Button
      variant="text"
      color="primary"
      onClick={handleTestLogin}
      sx={sx}
      {...buttonProps}
    >
      {autoLogin ? 'Auto Login' : 'Fill Test Credentials'}
    </Button>
  );
}; 