import React from 'react';
import { Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

export const AssistantPanel = styled(motion(Paper))(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: 400,
  height: 600,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  zIndex: 1000,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[10]
})); 