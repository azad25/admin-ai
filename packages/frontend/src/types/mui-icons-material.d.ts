declare module '@mui/icons-material' {
  import { SvgIconProps } from '@mui/material/SvgIcon';
  import * as React from 'react';

  export interface IconProps extends SvgIconProps {
    color?: 'inherit' | 'primary' | 'secondary' | 'action' | 'disabled' | 'error';
    fontSize?: 'default' | 'inherit' | 'large' | 'medium' | 'small';
  }

  // Add declarations for used icons
  export const BugReport: React.ComponentType<IconProps>;
  export const Speed: React.ComponentType<IconProps>;
  export const Security: React.ComponentType<IconProps>;
  export const Insights: React.ComponentType<IconProps>;
  // Add more icons as needed
} 