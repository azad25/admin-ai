import React from 'react';
import { Box, Grid, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import MetricsWidget from '../../widgets/MetricsWidget';
import { motion } from 'framer-motion';

const SystemWidgets = () => {
  const theme = useTheme();
  
  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  // Item animation variants
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={3}>
          
          {/* Circular Progress Charts */}
          <Grid item xs={12} md={3}>
            <motion.div variants={itemVariants}>
              <MetricsWidget
                title="Server CPU"
                type="circular"
                value={85}
                subtitle="Current Usage"
                icon={<SpeedIcon />}
                color={theme.palette.primary.main}
              />
            </motion.div>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <motion.div variants={itemVariants}>
              <MetricsWidget
                title="Memory Usage"
                type="circular"
                value={64}
                subtitle="8GB of 12GB"
                icon={<MemoryIcon />}
                color={theme.palette.secondary.main}
              />
            </motion.div>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <motion.div variants={itemVariants}>
              <MetricsWidget
                title="Disk Space"
                type="circular"
                value={72}
                subtitle="3.6TB of 5TB"
                icon={<StorageIcon />}
                color={theme.palette.success.main}
              />
            </motion.div>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <motion.div variants={itemVariants}>
              <MetricsWidget
                title="Network Load"
                type="circular"
                value={37}
                subtitle="Optimal Performance"
                icon={<TrendingUpIcon />}
                color={theme.palette.info.main}
              />
            </motion.div>
          </Grid>
          
        </Grid>
      </motion.div>
    </Box>
  );
};

export default SystemWidgets; 