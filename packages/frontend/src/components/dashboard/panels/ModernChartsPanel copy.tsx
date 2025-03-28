import React from 'react';
import { Box, Grid, Paper, Typography, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import MetricsWidget from '../../widgets/MetricsWidget';
import CircularProgressChart from '../../charts/CircularProgressChart';
import AreaChart from '../../charts/AreaChart';
import BarChart from '../../charts/BarChart';
import { motion } from 'framer-motion';

const ModernChartsPanel = () => {
  const theme = useTheme();
  
  // Sample data for area chart
  const areaChartData = [
    { x: 'Jan', y: 24, label: 'Jan' },
    { x: 'Feb', y: 33, label: 'Feb' },
    { x: 'Mar', y: 29, label: 'Mar' },
    { x: 'Apr', y: 42, label: 'Apr' },
    { x: 'May', y: 38, label: 'May' },
    { x: 'Jun', y: 54, label: 'Jun' },
    { x: 'Jul', y: 67, label: 'Jul' },
    { x: 'Aug', y: 72, label: 'Aug' },
    { x: 'Sep', y: 65, label: 'Sep' },
    { x: 'Oct', y: 80, label: 'Oct' },
    { x: 'Nov', y: 87, label: 'Nov' },
    { x: 'Dec', y: 95, label: 'Dec' },
  ];

  // Sample data for bar chart
  const barChartData = [
    { label: 'CPU', value: 85, color: theme.palette.primary.main },
    { label: 'Memory', value: 62, color: theme.palette.secondary.main },
    { label: 'Network', value: 43, color: theme.palette.success.main },
    { label: 'Storage', value: 70, color: theme.palette.info.main },
  ];
  
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
          {/* Section Title */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                mb: 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[1],
                borderRadius: 2
              }}
            >
              <Typography variant="h5" fontWeight="medium">Modern Chart Widgets</Typography>
              <Typography variant="body2" color="text.secondary">
                Interactive data visualizations with D3.js and Framer Motion
              </Typography>
            </Paper>
          </Grid>
          
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
          
          {/* Area Charts */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <MetricsWidget
                title="Monthly User Growth"
                type="area"
                data={areaChartData}
                icon={<TimelineIcon />}
                color={theme.palette.primary.main}
                height={350}
                xAxisLabel="Month"
                yAxisLabel="Users (k)"
              />
            </motion.div>
          </Grid>
          
          {/* Bar Charts */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <MetricsWidget
                title="System Resource Allocation"
                type="bar"
                data={barChartData}
                icon={<BarChartIcon />}
                height={350}
              />
            </motion.div>
          </Grid>
          
          {/* Direct usage of chart components for more customization */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[1],
                  borderRadius: 2
                }}
              >
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  Analytics Dashboard
                </Typography>
                
                <Box sx={{ height: 300, mt: 3 }}>
                  <AreaChart
                    data={[...areaChartData].map(d => ({ ...d, y: d.y * (1 + Math.random() * 0.5) }))}
                    width={600}
                    height={300}
                    title="Monthly Revenue"
                    xAxisLabel="Month"
                    yAxisLabel="Revenue ($K)"
                    color={theme.palette.success.main}
                    showGrid={true}
                    smooth={true}
                  />
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
};

export default ModernChartsPanel; 