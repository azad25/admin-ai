import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSocket } from '../../hooks';
import { wsService } from '../../services/websocket.service';

import {
  GlobeBase,
  CountryOutlines,
  LatLongGrid,
  HolographicRing,
  DataPoints,
  DataFlows,
  SystemAlerts,
  GlobePoint,
  AlertData
} from './globe';

interface AIGlobeProps {
  data: GlobePoint[];
  size?: number;
  showCountries?: boolean;
  showGrid?: boolean;
  showRing?: boolean;
  showOuterGrid?: boolean;
}

export const AIGlobe: React.FC<AIGlobeProps> = ({ 
  data, 
  size = 350,
  showCountries = true,
  showGrid = true,
  showRing = true,
  showOuterGrid = false // Default to false to match reference image
}) => {
  const { isConnected } = useSocket();
  const [activePoints, setActivePoints] = useState<GlobePoint[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);

  // Handle real-time system metrics updates
  useEffect(() => {
    if (!isConnected) {
      // If not connected, start simulation mode
      setSimulationActive(true);
      return;
    }

    setSimulationActive(false);
    
    const handleMetricsUpdate = (data: any) => {
      setSystemMetrics(data);
      
      // Generate points from location stats if available
      if (data.locationStats) {
        const newPoints = data.locationStats.map((stat: any) => ({
          latitude: stat.latitude,
          longitude: stat.longitude,
          intensity: Math.min(1, stat.count / 100),
          city: stat.city,
          country: stat.country
        }));
        setActivePoints(prev => [...prev, ...newPoints].slice(-50)); // Keep last 50 points
      }
    };

    const handleRequestEvent = (data: any) => {
      // Add new point for the request
      const newPoint: GlobePoint = {
        latitude: data.location?.latitude || (Math.random() * 180 - 90),
        longitude: data.location?.longitude || (Math.random() * 360 - 180),
        intensity: 0.8,
        city: data.location?.city || 'Unknown',
        country: data.location?.country || 'Unknown'
      };
      setActivePoints(prev => [...prev, newPoint].slice(-50));
    };

    const handleErrorEvent = (data: any) => {
      // Create error alert
      const newAlert: AlertData = {
        id: `error-${Date.now()}`,
        type: 'error',
        message: `Error: ${data.message || 'System Error'}`,
        position: generateRandomPosition(),
        timestamp: Date.now()
      };
      setAlerts(prev => [...prev, newAlert].slice(-10));
    };

    // Subscribe to WebSocket events
    wsService.on('metrics:update', handleMetricsUpdate);
    wsService.on('request:new', handleRequestEvent);
    wsService.on('error:new', handleErrorEvent);

    // Request initial data
    wsService.send('metrics:request', {});

    return () => {
      wsService.off('metrics:update', handleMetricsUpdate);
      wsService.off('request:new', handleRequestEvent);
      wsService.off('error:new', handleErrorEvent);
    };
  }, [isConnected]);

  // Simulation mode - generate fake data when not connected
  useEffect(() => {
    if (!simulationActive) return;
    
    // Generate random points
    const simulationInterval = setInterval(() => {
      // Generate points with more concentration in populated areas
      const regions = [
        // North America
        { minLat: 25, maxLat: 50, minLng: -130, maxLng: -60, weight: 0.3 },
        // Europe
        { minLat: 35, maxLat: 60, minLng: -10, maxLng: 30, weight: 0.3 },
        // Asia
        { minLat: 10, maxLat: 50, minLng: 60, maxLng: 140, weight: 0.3 },
        // Random global
        { minLat: -60, maxLat: 70, minLng: -180, maxLng: 180, weight: 0.1 }
      ];
      
      // Select a region based on weights
      let selectedRegion;
      const rand = Math.random();
      let cumulativeWeight = 0;
      
      for (const region of regions) {
        cumulativeWeight += region.weight;
        if (rand <= cumulativeWeight) {
          selectedRegion = region;
          break;
        }
      }
      
      // Generate point in selected region
      const newPoint: GlobePoint = {
        latitude: selectedRegion!.minLat + Math.random() * (selectedRegion!.maxLat - selectedRegion!.minLat),
        longitude: selectedRegion!.minLng + Math.random() * (selectedRegion!.maxLng - selectedRegion!.minLng),
        intensity: 0.5 + Math.random() * 0.5,
        city: 'Simulated City',
        country: 'Simulated Country'
      };
      
      setActivePoints(prev => [...prev, newPoint].slice(-50));
      
      // Occasionally generate alerts
      if (Math.random() < 0.1) {
        const alertTypes: ('error' | 'warning' | 'info' | 'success')[] = ['error', 'warning', 'info', 'success'];
        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        
        const newAlert: AlertData = {
          id: `sim-${Date.now()}`,
          type: alertType,
          message: `${alertType.toUpperCase()}: Simulated system event`,
          position: generateRandomPosition(),
          timestamp: Date.now()
        };
        
        setAlerts(prev => [...prev, newAlert].slice(-10));
      }
    }, 300); // Even faster simulation for more activity
    
    return () => clearInterval(simulationInterval);
  }, [simulationActive]);

  // Generate a random position for alerts
  const generateRandomPosition = (): [number, number, number] => {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const radius = 2.6;
    return [
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(theta)
    ];
  };

  // Handle new data flow creation
  const handleFlowCreated = (flow: any, start: GlobePoint, end: GlobePoint) => {
    const message = flow.type === 'error' 
      ? `Error in ${start.city || 'Unknown'}`
      : flow.type === 'request'
      ? `Request to ${end.city || 'Unknown'}`
      : `Response: ${Math.floor(Math.random() * 200)}ms`;

    const newAlert: AlertData = {
      id: `alert-${Date.now()}`,
      type: flow.type === 'error' ? 'error' : flow.type === 'request' ? 'info' : 'success',
      message,
      position: [end.latitude, end.longitude, 2.6],
      timestamp: Date.now()
    };

    setAlerts(prev => {
      const newAlerts = [...prev, newAlert];
      return newAlerts.slice(-10); // Keep only last 10 alerts
    });
  };

  // Clean up old alerts
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setAlerts(prev => prev.filter(alert => now - alert.timestamp < 10000));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Format CPU and memory values with arrows
  const formatMetricValue = (value: number | undefined): string => {
    if (value === undefined) return '--';
    const arrow = value > 75 ? '↑' : value > 50 ? '→' : '↓';
    return `${arrow} ${value.toFixed(1)}%`;
  };

  // Generate initial sample data if none exists
  useEffect(() => {
    if (activePoints.length === 0 && !data.length) {
      // Generate some initial points in major population centers
      const initialPoints: GlobePoint[] = [
        { latitude: 40.7128, longitude: -74.0060, intensity: 0.9, city: "New York", country: "USA" },
        { latitude: 34.0522, longitude: -118.2437, intensity: 0.8, city: "Los Angeles", country: "USA" },
        { latitude: 51.5074, longitude: -0.1278, intensity: 0.9, city: "London", country: "UK" },
        { latitude: 48.8566, longitude: 2.3522, intensity: 0.8, city: "Paris", country: "France" },
        { latitude: 35.6762, longitude: 139.6503, intensity: 0.9, city: "Tokyo", country: "Japan" },
        { latitude: 39.9042, longitude: 116.4074, intensity: 0.9, city: "Beijing", country: "China" },
        { latitude: 19.4326, longitude: -99.1332, intensity: 0.7, city: "Mexico City", country: "Mexico" },
        { latitude: -33.8688, longitude: 151.2093, intensity: 0.7, city: "Sydney", country: "Australia" },
        { latitude: -23.5505, longitude: -46.6333, intensity: 0.8, city: "São Paulo", country: "Brazil" },
        { latitude: 28.6139, longitude: 77.2090, intensity: 0.9, city: "New Delhi", country: "India" },
      ];
      
      setActivePoints(initialPoints);
    }
  }, [activePoints.length, data.length]);

  // Combine provided data with active points
  const globeData = [...data, ...activePoints];

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: size,
      background: '#000033',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* HUD Overlay Elements - Top */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        color: '#00ffff', 
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10
      }}>
        <div>SYS: {formatMetricValue(systemMetrics?.resources?.cpu?.usage)} CPU</div>
        <div>MEM: {formatMetricValue(systemMetrics?.resources?.memory?.usage)}</div>
        <div>NET: {activePoints.length} CONN</div>
      </div>
      
      {/* HUD Overlay Elements - Right */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        color: '#00ffff', 
        fontSize: '12px',
        fontFamily: 'monospace',
        textAlign: 'right',
        zIndex: 10
      }}>
        <div>STATUS: {systemMetrics?.status?.toUpperCase() || 'UNKNOWN'}</div>
        <div>UPTIME: {systemMetrics?.uptime?.toFixed(1) || '--'}s</div>
        <div>SCORE: {systemMetrics?.score || '--'}/100</div>
      </div>
      
      {/* HUD Overlay Elements - Bottom */}
      <div style={{ 
        position: 'absolute', 
        bottom: 10, 
        left: 10, 
        color: '#00ffff', 
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10
      }}>
        <div>LAT: {activePoints[activePoints.length-1]?.latitude.toFixed(2) || '--'}</div>
        <div>LON: {activePoints[activePoints.length-1]?.longitude.toFixed(2) || '--'}</div>
        <div>CONN: {isConnected ? 'ACTIVE' : 'SIMULATING'}</div>
      </div>
      
      {/* 3D Globe Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ 
          width: '100%', 
          height: '100%'
        }}
      >
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <fog attach="fog" args={['#000033', 1, 25]} />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          minDistance={4}
          maxDistance={12}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.3}
        />
        
        <group>
          {/* Base globe with darker blue */}
          <GlobeBase size={2} rotationSpeed={0.1} />
          
          {/* Country outlines */}
          {showCountries && <CountryOutlines size={2.01} opacity={0.9} color="#00ffff" />}
          
          {/* Latitude/longitude grid */}
          {showGrid && <LatLongGrid size={2.01} opacity={0.4} color="#00ffff" />}
          
          {/* Holographic ring - slightly larger than in previous version */}
          {showRing && <HolographicRing size={2.3} width={0.05} color="#00ffff" />}
          
          {/* Data points - directly on the surface */}
          <DataPoints data={globeData} size={2.01} pointSize={0.08} color="#00ffff" />
          
          {/* Data flows - directly on the surface */}
          <DataFlows 
            data={globeData} 
            size={2.01} 
            maxFlows={30} 
            flowInterval={400}
            onFlowCreated={handleFlowCreated}
          />
          
          {/* System alerts */}
          <SystemAlerts alerts={alerts} maxAge={10000} />
        </group>
      </Canvas>
    </div>
  );
};