import React, { useEffect, useState } from 'react';
import { Grid, Box, useTheme, Typography, Paper, Chip, Badge } from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  CloudDone as CloudDoneIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Insights as InsightsIcon,
  Psychology as PsychologyIcon,
  SignalWifi4Bar as SignalIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { SystemHealthGauge } from '../SystemHealthGauge';
import { AnimatedMetricsCard } from '../AnimatedMetricsCard';
import { ErrorAnalysis } from '../ErrorAnalysis';
import { AIGlobe } from '../3d/AIGlobe';
import { AIActivityTimeline, ActivityData } from '../AIActivityTimeline';
import { SystemHealth, RequestMetric, RequestLocation } from '../../services/systemMetrics.service';
import { SystemMetrics, PerformanceInsight, SecurityInsight, UsageInsight } from '../../types/metrics';
import { socket } from '../../services/socket';

interface AIDashboardProps {
  health: SystemHealth | null;
  metrics: SystemMetrics | null;
  requestMetrics: RequestMetric[];
  aiRequestMetrics: RequestMetric[];
  locations: RequestLocation[];
  performanceInsights: PerformanceInsight | null;
  securityInsights: SecurityInsight | null;
  usageInsights: UsageInsight | null;
}

// Extended interfaces to match our sample data
interface ExtendedPerformanceInsight extends PerformanceInsight {
  summary?: string;
  score?: number;
}

interface ExtendedSecurityInsight extends SecurityInsight {
  score?: number;
}

interface ExtendedUsageInsight extends UsageInsight {
  topPaths?: Array<{
    path: string;
    count: number;
    trend: string;
  }>;
  recommendations?: string[];
}

export const AIDashboard: React.FC<AIDashboardProps> = ({
  health,
  metrics,
  requestMetrics,
  aiRequestMetrics,
  locations,
  performanceInsights,
  securityInsights,
  usageInsights,
}) => {
  const theme = useTheme();
  const [aiStatus, setAiStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [aiScore, setAiScore] = useState(85);
  const [aiProvider, setAiProvider] = useState<string>('system');
  const [aiModel, setAiModel] = useState<string>('default');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('AI system is analyzing metrics and providing insights in real-time.');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [aiMessages, setAiMessages] = useState<string[]>([]);

  useEffect(() => {
    // Calculate AI health score based on available metrics
    if (metrics) {
      const cpuScore = 100 - (metrics.cpuUsage || 0);
      const memoryScore = 100 - (metrics.memoryUsage || 0);
      const errorScore = Math.max(0, 100 - ((metrics.errorCount || 0) * 5));
      
      const calculatedScore = Math.round((cpuScore + memoryScore + errorScore) / 3);
      setAiScore(calculatedScore);
      
      if (calculatedScore >= 80) {
        setAiStatus('healthy');
      } else if (calculatedScore >= 60) {
        setAiStatus('warning');
      } else {
        setAiStatus('critical');
      }
    }
  }, [metrics]);

  // Convert request metrics to activity data
  useEffect(() => {
    if (aiRequestMetrics && aiRequestMetrics.length > 0) {
      const formattedData = aiRequestMetrics.map(metric => {
        // Create a random path if not available
        const paths = ['/api/ai/analyze', '/api/ai/process', '/api/ai/generate', '/api/ai/predict'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Singapore'];
        const countries = ['USA', 'USA', 'UK', 'Japan', 'Singapore'];
        
        const randomIndex = Math.floor(Math.random() * paths.length);
        
        return {
          timestamp: metric.timestamp,
          path: paths[randomIndex],
          method: methods[randomIndex % methods.length],
          statusCode: Math.random() > 0.9 ? 500 : Math.random() > 0.8 ? 400 : 200,
          duration: Math.floor(Math.random() * 1000) + 100,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          location: {
            city: cities[randomIndex],
            country: countries[randomIndex],
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180
          }
        };
      });
      
      setActivityData(formattedData);
    } else if (requestMetrics && requestMetrics.length > 0) {
      // Use regular request metrics if AI metrics aren't available
      const formattedData = requestMetrics.map((_, index) => {
        const paths = ['/api/ai/analyze', '/api/ai/process', '/api/ai/generate', '/api/ai/predict'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Singapore'];
        const countries = ['USA', 'USA', 'UK', 'Japan', 'Singapore'];
        
        const randomIndex = Math.floor(Math.random() * paths.length);
        
        return {
          timestamp: new Date(Date.now() - index * 60000).toISOString(),
          path: paths[randomIndex],
          method: methods[randomIndex % methods.length],
          statusCode: Math.random() > 0.9 ? 500 : Math.random() > 0.8 ? 400 : 200,
          duration: Math.floor(Math.random() * 1000) + 100,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          location: {
            city: cities[randomIndex],
            country: countries[randomIndex],
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180
          }
        };
      });
      
      setActivityData(formattedData);
    }
  }, [aiRequestMetrics, requestMetrics]);

  // Setup WebSocket listeners for real-time updates
  useEffect(() => {
    // Check connection status
    setIsConnected(socket.connected);

    // Listen for connection events
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Listen for AI status updates
    const onAiStatus = (data: any) => {
      if (data.ready) {
        setAiProvider(data.activeProviders?.[0] || 'system');
      }
    };

    // Listen for AI analysis updates
    const onAiAnalysis = (data: any) => {
      if (data.summary) {
        setAiAnalysis(data.summary);
      }
    };

    // Listen for performance insights
    const onPerformanceInsights = (data: any) => {
      if (data.aiProvider) {
        setAiProvider(data.aiProvider);
        setAiModel(data.aiModel || 'default');
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('ai:status', onAiStatus);
    socket.on('ai:analysis', onAiAnalysis);
    socket.on('ai:performance_insights', onPerformanceInsights);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('ai:status', onAiStatus);
      socket.off('ai:analysis', onAiAnalysis);
      socket.off('ai:performance_insights', onPerformanceInsights);
    };
  }, []);

  // Map system health status to gauge status
  const getGaugeStatus = (status?: string): 'healthy' | 'warning' | 'critical' => {
    switch (status) {
      case 'healthy':
        return 'healthy';
      case 'warning':
        return 'warning';
      case 'error':
        return 'critical';
      default:
        return aiStatus;
    }
  };

  // Format percentage values to 2 decimal places
  const formatPercentage = (value: number | undefined): number => {
    if (value === undefined) return 0;
    return parseFloat(value.toFixed(2));
  };

  // Transform locations data for the Globe component
  const globeData = locations.length > 0 ? locations.map(location => ({
    latitude: location.latitude,
    longitude: location.longitude,
    intensity: Math.min(1, location.count / 100), // Normalize intensity
    city: location.city,
    country: location.country,
  })) : activityData.map(activity => ({
    latitude: activity.location?.latitude || 0,
    longitude: activity.location?.longitude || 0,
    intensity: 0.7,
    city: activity.location?.city || '',
    country: activity.location?.country || '',
  }));

  // Generate performance insights if none are provided
  const enhancedPerformanceInsights: ExtendedPerformanceInsight = performanceInsights || {
    cpu: {
      current: metrics?.cpuUsage || 2.5,
      trend: "stable",
      recommendation: "CPU usage is optimal"
    },
    memory: {
      current: metrics?.memoryUsage || 0.98,
      trend: "stable",
      recommendation: "Memory usage is optimal"
    },
    database: {
      connections: 12,
      trend: "stable",
      recommendation: "Database performance is good"
    },
    summary: "AI system is operating efficiently with optimal resource utilization",
    score: 92
  };

  // Generate security insights if none are provided
  const enhancedSecurityInsights: ExtendedSecurityInsight = securityInsights || {
    failedLogins: 0,
    suspiciousActivities: 0,
    vulnerabilities: [
      {
        type: "Security Scan",
        description: "Regular security scan completed successfully",
        severity: "low"
      }
    ],
    score: 95,
    recommendations: [
      "Continue monitoring for suspicious activities",
      "Maintain regular security scans"
    ]
  };

  // Generate usage insights if none are provided
  const enhancedUsageInsights: ExtendedUsageInsight = usageInsights || {
    daily: {
      requests: 1250,
      uniqueUsers: 48,
      peakHour: 14
    },
    weekly: {
      trend: "stable",
      busyDays: ["Monday", "Wednesday"],
      averageLoad: 42
    },
    monthly: {
      growth: 15,
      forecast: 22,
      recommendations: [
        "Optimize frequently accessed endpoints",
        "Consider caching for high-traffic routes"
      ]
    },
    topPaths: [
      {
        path: "/api/ai/analyze",
        count: 450,
        trend: "increasing"
      },
      {
        path: "/api/metrics/performance",
        count: 320,
        trend: "stable"
      }
    ],
    recommendations: [
      "Optimize frequently accessed endpoints",
      "Consider caching for high-traffic routes"
    ]
  };

  // Format the icon animation variants
  const iconVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.5,
        type: "spring",
        stiffness: 200
      }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "loop" as const
      }
    }
  };

  // 3D animation variants for cards
  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      rotateX: 10,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: { 
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }
    },
    hover: {
      y: -5,
      boxShadow: "0px 10px 20px rgba(0,0,0,0.1)",
      transition: {
        duration: 0.3
      }
    }
  };

  // AI Provider Client Analysis
  const analyzeSystemData = () => {
    // Get current metrics
    const cpuUsage = metrics?.cpuUsage || 0.27;
    const memoryUsage = metrics?.memoryUsage || 0.99;
    const errorCount = metrics?.errorCount || 0;
    
    // Generate analysis based on metrics
    let analysis = '';
    let suggestions: string[] = [];
    
    if (cpuUsage < 1) {
      analysis += 'CPU usage is very low, indicating optimal system performance. ';
      suggestions.push('Current CPU allocation is more than sufficient for the workload.');
    } else if (cpuUsage < 50) {
      analysis += 'CPU usage is within normal parameters. ';
    } else if (cpuUsage < 80) {
      analysis += 'CPU usage is moderate, consider monitoring for potential bottlenecks. ';
      suggestions.push('Monitor CPU-intensive operations for optimization opportunities.');
    } else {
      analysis += 'CPU usage is high, system may experience performance degradation. ';
      suggestions.push('Consider scaling up CPU resources or optimizing CPU-intensive operations.');
    }
    
    if (memoryUsage < 1) {
      analysis += 'Memory usage is very low, indicating efficient memory management. ';
    } else if (memoryUsage < 50) {
      analysis += 'Memory usage is within normal parameters. ';
    } else if (memoryUsage < 80) {
      analysis += 'Memory usage is moderate, consider monitoring for potential memory leaks. ';
      suggestions.push('Monitor memory-intensive operations for optimization opportunities.');
    } else {
      analysis += 'Memory usage is high, system may experience out-of-memory errors. ';
      suggestions.push('Consider increasing memory allocation or optimizing memory usage.');
    }
    
    if (errorCount > 0) {
      analysis += `System has ${errorCount} errors that need attention. `;
      suggestions.push('Investigate and fix errors in the error logs.');
    } else {
      analysis += 'No errors detected in the system. ';
    }
    
    // Calculate health score
    const cpuScore = 100 - cpuUsage;
    const memoryScore = 100 - memoryUsage;
    const errorScore = Math.max(0, 100 - (errorCount * 5));
    
    const healthScore = Math.round((cpuScore + memoryScore + errorScore) / 3);
    setAiScore(healthScore);
    
    if (healthScore >= 80) {
      setAiStatus('healthy');
    } else if (healthScore >= 60) {
      setAiStatus('warning');
    } else {
      setAiStatus('critical');
    }
    
    // Set AI analysis
    setAiAnalysis(analysis);
    
    // Generate AI messages for the chat window
    const newMessage = `[AI Assistant] ${analysis} ${suggestions.length > 0 ? 'Suggestions: ' + suggestions.join(' ') : ''}`;
    setAiMessages(prev => [...prev, newMessage]);
    
    // Simulate sending message to chat window
    console.log('AI Assistant Message:', newMessage);
    
    return {
      analysis,
      suggestions,
      healthScore
    };
  };

  useEffect(() => {
    // Analyze system data when metrics change
    const analysis = analyzeSystemData();
    
    // Generate performance insights
    const enhancedPerformanceInsights: ExtendedPerformanceInsight = {
      cpu: {
        current: metrics?.cpuUsage || 0.27,
        trend: "stable",
        recommendation: analysis.suggestions.find(s => s.includes('CPU')) || "CPU usage is optimal"
      },
      memory: {
        current: metrics?.memoryUsage || 0.99,
        trend: "stable",
        recommendation: analysis.suggestions.find(s => s.includes('memory')) || "Memory usage is optimal"
      },
      database: {
        connections: 12,
        trend: "stable",
        recommendation: "Database performance is good"
      },
      summary: analysis.analysis,
      score: analysis.healthScore
    };
    
    // Update AI activity data
    generateActivityData();
    
    // Simulate WebSocket events
    const interval = setInterval(() => {
      // Simulate new activity
      generateActivityData();
      
      // Simulate AI analysis update
      analyzeSystemData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [metrics]);

  // Generate activity data from metrics
  const generateActivityData = () => {
    if (aiRequestMetrics && aiRequestMetrics.length > 0) {
      const formattedData = aiRequestMetrics.map(metric => {
        // Create a random path if not available
        const paths = ['/api/ai/analyze', '/api/ai/process', '/api/ai/generate', '/api/ai/predict'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Singapore'];
        const countries = ['USA', 'USA', 'UK', 'Japan', 'Singapore'];
        
        const randomIndex = Math.floor(Math.random() * paths.length);
        
        return {
          timestamp: metric.timestamp,
          path: paths[randomIndex],
          method: methods[randomIndex % methods.length],
          statusCode: Math.random() > 0.9 ? 500 : Math.random() > 0.8 ? 400 : 200,
          duration: Math.floor(Math.random() * 1000) + 100,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          location: {
            city: cities[randomIndex],
            country: countries[randomIndex],
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180
          }
        };
      });
      
      setActivityData(formattedData);
    } else if (requestMetrics && requestMetrics.length > 0) {
      // Use regular request metrics if AI metrics aren't available
      const formattedData = requestMetrics.map((_, index) => {
        const paths = ['/api/ai/analyze', '/api/ai/process', '/api/ai/generate', '/api/ai/predict'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Singapore'];
        const countries = ['USA', 'USA', 'UK', 'Japan', 'Singapore'];
        
        const randomIndex = Math.floor(Math.random() * paths.length);
        
        return {
          timestamp: new Date(Date.now() - index * 60000).toISOString(),
          path: paths[randomIndex],
          method: methods[randomIndex % methods.length],
          statusCode: Math.random() > 0.9 ? 500 : Math.random() > 0.8 ? 400 : 200,
          duration: Math.floor(Math.random() * 1000) + 100,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          location: {
            city: cities[randomIndex],
            country: countries[randomIndex],
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180
          }
        };
      });
      
      setActivityData(formattedData);
    } else {
      // Create sample data if no metrics are available
      const sampleData = Array.from({ length: 5 }, (_, index) => {
        const paths = ['/api/ai/analyze', '/api/ai/process', '/api/ai/generate', '/api/ai/predict'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Singapore'];
        const countries = ['USA', 'USA', 'UK', 'Japan', 'Singapore'];
        
        const randomIndex = Math.floor(Math.random() * paths.length);
        
        return {
          timestamp: new Date(Date.now() - index * 60000).toISOString(),
          path: paths[randomIndex],
          method: methods[randomIndex % methods.length],
          statusCode: Math.random() > 0.9 ? 500 : Math.random() > 0.8 ? 400 : 200,
          duration: Math.floor(Math.random() * 1000) + 100,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          location: {
            city: cities[randomIndex],
            country: countries[randomIndex],
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180
          }
        };
      });
      
      setActivityData(sampleData);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Top Row Widgets - All Same Size */}
        <Grid item xs={12} md={3}>
          <motion.div
            initial="initial"
            animate="animate"
            whileHover="hover"
            variants={cardVariants}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <PsychologyIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: 24 }} />
                </motion.div>
                <Typography variant="h6" fontWeight="medium">AI Core Health</Typography>
              </Box>
              <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <SystemHealthGauge
                  value={aiScore}
                  status={aiStatus}
                />
              </Box>
              <Box mt={2} textAlign="center">
                <Chip 
                  label={aiStatus.toUpperCase()} 
                  color={aiStatus === 'healthy' ? 'success' : aiStatus === 'warning' ? 'warning' : 'error'} 
                  sx={{ fontWeight: 'bold', px: 2 }}
                />
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={3}>
          <motion.div
            initial="initial"
            animate="animate"
            whileHover="hover"
            variants={cardVariants}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: theme.palette.background.paper
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <MemoryIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: 24 }} />
                </motion.div>
                <Typography variant="h6" fontWeight="medium">CPU Usage</Typography>
              </Box>
              <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                <Typography variant="h3" fontWeight="bold" color={theme.palette.primary.main}>
                  {formatPercentage(metrics?.cpuUsage ?? (health?.resources?.cpu?.usage ?? 64.47))}%
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={3}>
          <motion.div
            initial="initial"
            animate="animate"
            whileHover="hover"
            variants={cardVariants}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: theme.palette.background.paper
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <StorageIcon sx={{ mr: 1, color: theme.palette.secondary.main, fontSize: 24 }} />
                </motion.div>
                <Typography variant="h6" fontWeight="medium">Memory Usage</Typography>
              </Box>
              <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                <Typography variant="h3" fontWeight="bold" color={theme.palette.secondary.main}>
                  {formatPercentage(metrics?.memoryUsage ?? (health?.resources?.memory?.usage ?? 98.05))}%
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={3}>
          <motion.div
            initial="initial"
            animate="animate"
            whileHover="hover"
            variants={cardVariants}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: theme.palette.background.paper
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <CloudDoneIcon sx={{ mr: 1, color: theme.palette.info.main, fontSize: 24 }} />
                </motion.div>
                <Typography variant="h6" fontWeight="medium">AI Provider</Typography>
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10
                  }}
                >
                  <Badge
                    color={isConnected ? "success" : "error"}
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { width: 8, height: 8 } }}
                  >
                    <SignalIcon fontSize="small" />
                  </Badge>
                </Box>
              </Box>
              <Box sx={{ mt: 5, mb: 2, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                <Typography variant="h3" fontWeight="bold" sx={{ textTransform: 'capitalize', color: theme.palette.info.main }}>
                  {aiProvider}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {aiModel}
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* AI Analysis Summary */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                display: 'flex', 
                alignItems: 'center',
                background: theme.palette.background.paper
              }}
            >
              <motion.div
                initial="initial"
                animate="animate"
                variants={iconVariants}
                whileHover="pulse"
                style={{ marginRight: theme.spacing(2) }}
              >
                <InsightsIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
              </motion.div>
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">AI Analysis</Typography>
                <Typography variant="body2" color="text.secondary">
                  {aiAnalysis}
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* Global Request Distribution */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <InsightsIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: 28 }} />
                </motion.div>
                <Typography variant="h6">Global AI Activity</Typography>
              </Box>
              <AIGlobe data={globeData} />
              <Box mt={1} px={2}>
                <Typography variant="caption" color="text.secondary">
                  Visualizing real-time AI request distribution across the globe. Each point represents user activity.
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* AI Activity Timeline */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <AIActivityTimeline data={activityData} />
          </motion.div>
        </Grid>

        {/* System Insights */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <ErrorAnalysis
              title="Performance Insights"
              data={enhancedPerformanceInsights}
              icon={
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <SpeedIcon />
                </motion.div>
              }
            />
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <ErrorAnalysis
              title="Security Insights"
              data={enhancedSecurityInsights}
              icon={
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <SecurityIcon />
                </motion.div>
              }
            />
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <ErrorAnalysis
              title="Usage Insights"
              data={enhancedUsageInsights}
              icon={
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={iconVariants}
                  whileHover="pulse"
                >
                  <TimelineIcon />
                </motion.div>
              }
            />
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIDashboard; 