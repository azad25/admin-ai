import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { Vector3 } from 'three';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { wsService } from '../services/websocket.service';
import { SystemHealth, SystemMetrics } from '@admin-ai/shared/types/metrics';
import { ErrorLog } from '@admin-ai/shared/types/error';
import { AIAnalysis } from '@admin-ai/shared/types/ai';

// Define additional interfaces needed for the component
interface AIInsight {
  type: 'critical' | 'warning' | 'info';
  message: string;
  recommendation?: string;
  autoFix?: {
    description: string;
  };
}

interface TrendData {
  current: number;
  change: number;
  status: 'improving' | 'degrading' | 'stable';
}

// Extended AIAnalysis interface to match what's used in the component
interface ExtendedAIAnalysis {
  performance: {
    cpuAnalysis: {
      status: string;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    };
    memoryAnalysis: {
      status: string;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    };
    recommendations: string[];
  };
  trends: Record<string, any>; // Using any to avoid complex type issues
  insights: AIInsight[];
  errors?: Record<string, any>;
}

interface ErrorNode {
  position: [number, number, number];
  color: string;
  size: number;
  error: ErrorLog;
}

const AnimatedSphere = animated((props: any) => {
  const { position, color, size, onClick } = props;
  return (
    <mesh position={position} onClick={onClick}>
      <sphereGeometry args={[size, 32, 32]} />
      <animated.meshStandardMaterial color={color} />
    </mesh>
  );
});

const ErrorNode = ({ error, position, onHover }: { error: ErrorLog; position: [number, number, number]; onHover: (error: ErrorLog | null) => void }) => {
  const [hovered, setHovered] = useState(false);
  const { scale } = useSpring({
    scale: hovered ? 1.5 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <animated.mesh
      position={position}
      scale={scale}
      onPointerOver={() => {
        setHovered(true);
        onHover(error);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
    >
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={
        error.metadata.severity === 'high' ? '#ff0000' : 
        error.metadata.severity === 'medium' ? '#ffa500' : 
        '#ffff00'
      } />
    </animated.mesh>
  );
};

const AIMonitoringDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [analysis, setAnalysis] = useState<ExtendedAIAnalysis | null>(null);
  const [hoveredError, setHoveredError] = useState<ErrorLog | null>(null);
  const [errorNodes, setErrorNodes] = useState<ErrorNode[]>([]);

  useEffect(() => {
    // Request initial metrics
    wsService.emit('metrics:request');

    // Listen for metric updates
    const handleMetricsUpdate = (data: any) => {
      if (data.health) setHealth(data.health);
      if (data.metrics) setMetrics(data.metrics);
      if (data.aiAnalysis) setAnalysis(data.aiAnalysis as ExtendedAIAnalysis);
    };

    // Listen for new errors
    const handleNewError = (error: ErrorLog) => {
      setErrors(prev => [error, ...prev].slice(0, 100));
    };

    // Listen for error analysis
    const handleErrorAnalysis = (data: { error: ErrorLog, analysis: any }) => {
      setAnalysis(prev => {
        if (!prev) return null;
        return {
          ...prev,
          errors: {
            ...(prev.errors || {}),
            [data.error.id]: data.analysis
          }
        };
      });
    };

    // Listen for metric analysis
    const handleMetricsAnalysis = (analysis: ExtendedAIAnalysis) => {
      setAnalysis(analysis);
    };

    wsService.on('metrics:update', handleMetricsUpdate);
    wsService.on('error:new', handleNewError);
    wsService.on('error:analysis', handleErrorAnalysis);
    wsService.on('metrics:analysis', handleMetricsAnalysis);

    return () => {
      wsService.off('metrics:update', handleMetricsUpdate);
      wsService.off('error:new', handleNewError);
      wsService.off('error:analysis', handleErrorAnalysis);
      wsService.off('metrics:analysis', handleMetricsAnalysis);
    };
  }, []);

  useEffect(() => {
    // Update error nodes positions
    const nodes = errors.map((error, i) => {
      const angle = (i / errors.length) * Math.PI * 2;
      const radius = 5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = error.metadata.severity === 'high' ? 2 : error.metadata.severity === 'medium' ? 1 : 0;

      return {
        position: [x, y, z] as [number, number, number],
        color: error.metadata.severity === 'high' ? '#ff0000' : error.metadata.severity === 'medium' ? '#ffa500' : '#ffff00',
        size: error.metadata.severity === 'high' ? 0.8 : error.metadata.severity === 'medium' ? 0.6 : 0.4,
        error
      };
    });

    setErrorNodes(nodes);
  }, [errors]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ height: '70vh', position: 'relative' }}>
          <Canvas camera={{ position: [0, 5, 10] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <OrbitControls />
            
            {/* System Health Indicator */}
            {health && (
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[3, 3, 0.1, 32]} />
                <meshStandardMaterial 
                  color={
                    health.services && Object.values(health.services).some(s => s.status === 'down') 
                      ? '#ff0000' 
                      : health.services && Object.values(health.services).some(s => s.status === 'degraded') 
                        ? '#ffa500' 
                        : '#00ff00'
                  } 
                  opacity={0.3} 
                  transparent 
                />
              </mesh>
            )}

            {/* Error Nodes */}
            {errorNodes.map((node, i) => (
              <ErrorNode
                key={i}
                error={node.error}
                position={node.position}
                onHover={setHoveredError}
              />
            ))}

            {/* Metrics Visualization */}
            {metrics && (
              <group position={[0, -2, 0]}>
                <Text
                  position={[0, 3, 0]}
                  fontSize={0.5}
                  color="#ffffff"
                >
                  {`Requests: ${metrics.totalRequests} | Errors: ${metrics.errorCount}`}
                </Text>
              </group>
            )}
          </Canvas>

          {/* Hover Information */}
          {hoveredError && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                p: 2,
                borderRadius: 1,
                maxWidth: 300
              }}
            >
              <Typography variant="h6">Error Details</Typography>
              <Typography>Severity: {hoveredError.metadata.severity}</Typography>
              <Typography>Message: {hoveredError.message}</Typography>
              <Typography>Time: {new Date(hoveredError.timestamp).toLocaleString()}</Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
          <Typography variant="h6">AI Analysis</Typography>
          {analysis?.insights && analysis.insights.map((insight: AIInsight, i: number) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Typography color={
                insight.type === 'critical' ? 'error' : 
                insight.type === 'warning' ? 'warning.main' : 
                'info.main'
              }>
                {insight.message}
              </Typography>
              {insight.recommendation && (
                <Typography variant="body2" color="text.secondary">
                  Recommendation: {insight.recommendation}
                </Typography>
              )}
              {insight.autoFix && (
                <Typography variant="body2" color="text.secondary">
                  Auto-fix available: {insight.autoFix.description}
                </Typography>
              )}
            </Box>
          ))}

          {analysis?.trends && (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>Trends</Typography>
              {Object.entries(analysis.trends).map(([key, trend]) => {
                // Ensure trend is treated as an array of numbers
                if (Array.isArray(trend)) {
                  return (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography>
                        {key}: {trend.length > 0 ? trend[trend.length - 1] : 'N/A'}
                      </Typography>
                    </Box>
                  );
                }
                
                // If trend is an object with current, change, and status properties
                if (typeof trend === 'object' && trend !== null && 'current' in trend && 'change' in trend && 'status' in trend) {
                  return (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography>
                        {key}: {trend.current} ({trend.change > 0 ? '+' : ''}{trend.change}%)
                      </Typography>
                      <Typography variant="body2" color={
                        trend.status === 'improving' ? 'success.main' :
                        trend.status === 'degrading' ? 'error.main' :
                        'text.secondary'
                      }>
                        Status: {trend.status}
                      </Typography>
                    </Box>
                  );
                }
                
                return null;
              })}
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AIMonitoringDashboard; 