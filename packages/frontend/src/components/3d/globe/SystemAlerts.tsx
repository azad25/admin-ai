import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

export interface AlertData {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  position: [number, number, number];
  timestamp: number;
}

interface SystemAlertsProps {
  alerts: AlertData[];
  maxAge?: number; // Maximum age of alerts in milliseconds
}

// Individual alert component
const SystemAlert: React.FC<{ alert: AlertData }> = ({ alert }) => {
  const alertRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);
  const lifespan = 10000; // 10 seconds lifespan for alerts
  const age = Date.now() - alert.timestamp;
  const remainingLife = 1 - Math.min(age / lifespan, 1);
  
  useFrame(({ clock }) => {
    if (alertRef.current) {
      // Make the alert float and pulse
      alertRef.current.position.y = alert.position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.05;
      
      // Fade out as it gets older
      setOpacity(remainingLife);
      
      // Pulse effect
      setScale(0.9 + Math.sin(clock.getElapsedTime() * 4) * 0.1);
    }
  });
  
  // Get color based on alert type
  const getAlertColor = () => {
    switch (alert.type) {
      case 'error': return '#FF4444';
      case 'warning': return '#FFAA00';
      case 'success': return '#44FF44';
      default: return '#00FFFF';
    }
  };
  
  return (
    <group 
      ref={alertRef} 
      position={alert.position}
      scale={[scale, scale, scale]}
    >
      {/* Alert background */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.01]} />
        <meshBasicMaterial color={getAlertColor()} transparent opacity={opacity * 0.3} />
      </mesh>
      
      {/* Alert text */}
      <Text
        position={[0, 0, 0.02]}
        fontSize={0.08}
        color={getAlertColor()}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#000033"
      >
        {alert.message}
      </Text>
    </group>
  );
};

export const SystemAlerts: React.FC<SystemAlertsProps> = ({ 
  alerts,
  maxAge = 10000 // 10 seconds by default
}) => {
  // Filter out alerts that are too old
  const validAlerts = alerts.filter(alert => {
    const age = Date.now() - alert.timestamp;
    return age < maxAge;
  });
  
  return (
    <group>
      {validAlerts.map(alert => (
        <SystemAlert key={alert.id} alert={alert} />
      ))}
    </group>
  );
}; 