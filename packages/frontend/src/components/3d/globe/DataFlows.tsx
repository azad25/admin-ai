import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GlobePoint, DataFlow as DataFlowType } from './types';

interface CurveType {
  getPoint: (t: number) => THREE.Vector3;
}

interface DataFlowsProps {
  data: GlobePoint[];
  size: number;
  maxFlows?: number;
  flowInterval?: number;
  onFlowCreated?: (flow: any, start: GlobePoint, end: GlobePoint) => void;
}

// Create a curved path between two points on the globe
const createCurve = (startLat: number, startLng: number, endLat: number, endLng: number, size: number): THREE.QuadraticBezierCurve3 => {
  // Convert lat/lng to 3D points
  const phi1 = (90 - startLat) * (Math.PI / 180);
  const phi2 = (90 - endLat) * (Math.PI / 180);
  const theta1 = (startLng + 180) * (Math.PI / 180);
  const theta2 = (endLng + 180) * (Math.PI / 180);
  
  const start = new THREE.Vector3(
    -size * Math.sin(phi1) * Math.cos(theta1),
    size * Math.cos(phi1),
    size * Math.sin(phi1) * Math.sin(theta1)
  );
  
  const end = new THREE.Vector3(
    -size * Math.sin(phi2) * Math.cos(theta2),
    size * Math.cos(phi2),
    size * Math.sin(phi2) * Math.sin(theta2)
  );
  
  // Calculate distance between points
  const distance = start.distanceTo(end);
  
  // Calculate midpoint with elevation
  // For longer distances, make the arc higher
  const arcHeight = Math.min(1.5, 0.5 + distance * 0.3);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(size + arcHeight);
  
  // Create a quadratic bezier curve
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  
  return curve;
};

// Individual flow particle
const FlowParticle: React.FC<{ flow: DataFlowType }> = ({ flow }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Update progress
    setProgress(prev => {
      const newProgress = prev + delta * flow.speed;
      return newProgress > 1 ? 1 : newProgress;
    });
    
    // Update position along the curve
    const position = flow.curve.getPoint(progress);
    meshRef.current.position.copy(position);
    
    // Add pulsing effect
    const scale = 0.08 + 0.05 * Math.sin(state.clock.elapsedTime * 5);
    meshRef.current.scale.set(scale, scale, scale);
  });
  
  // Get color based on flow type
  const getColor = () => {
    switch (flow.type) {
      case 'error':
        return '#ff3333';
      case 'warning':
        return '#ffaa00';
      case 'success':
        return '#00ff99';
      case 'request':
        return '#00ccff';
      case 'response':
        return '#00ffff';
      default:
        return '#00ffff';
    }
  };
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshBasicMaterial 
        color={getColor()} 
        transparent 
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// Flow trail
const FlowTrail: React.FC<{ flow: DataFlowType }> = ({ flow }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Get color based on flow type
  const getColor = () => {
    switch (flow.type) {
      case 'error':
        return '#ff3333';
      case 'warning':
        return '#ffaa00';
      case 'success':
        return '#00ff99';
      case 'request':
        return '#00ccff';
      case 'response':
        return '#00ffff';
      default:
        return '#00ffff';
    }
  };
  
  // Create a tube geometry along the curve
  const tubeGeometry = useMemo(() => {
    const path = flow.curve;
    return new THREE.TubeGeometry(path as any, 64, 0.03, 8, false);
  }, [flow.curve]);
  
  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshBasicMaterial 
        color={getColor()} 
        transparent 
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// Glow effect at endpoints
const FlowEndpoint: React.FC<{ position: THREE.Vector3, color: string, size: number }> = ({ position, color, size }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Pulsing effect
    const scale = size * (1 + 0.3 * Math.sin(state.clock.elapsedTime * 3));
    meshRef.current.scale.set(scale, scale, scale);
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export const DataFlows: React.FC<DataFlowsProps> = ({ 
  data, 
  size,
  maxFlows = 15,
  flowInterval = 1000,
  onFlowCreated
}) => {
  const [flows, setFlows] = useState<DataFlowType[]>([]);
  
  // Create new flows at intervals
  useEffect(() => {
    if (data.length < 2) return;
    
    const createFlow = () => {
      if (flows.length >= maxFlows) return;
      
      // Select random start and end points
      const startIndex = Math.floor(Math.random() * data.length);
      let endIndex;
      
      // Make sure start and end are reasonably far apart
      do {
        endIndex = Math.floor(Math.random() * data.length);
      } while (
        endIndex === startIndex || 
        !data[startIndex] || 
        !data[endIndex] ||
        // Calculate distance to ensure points aren't too close
        Math.abs(data[startIndex].latitude - data[endIndex].latitude) < 20 ||
        Math.abs(data[startIndex].longitude - data[endIndex].longitude) < 20
      );
      
      const start = data[startIndex];
      const end = data[endIndex];
      
      // Create curve between points
      const curve = createCurve(
        start.latitude, 
        start.longitude, 
        end.latitude, 
        end.longitude, 
        size
      );
      
      // Determine flow type
      const flowTypes = ['request', 'response', 'success', 'warning', 'error'];
      const type = flowTypes[Math.floor(Math.random() * flowTypes.length)];
      
      // Create new flow
      const newFlow: DataFlowType = {
        id: `flow-${Date.now()}-${Math.random()}`,
        curve,
        progress: 0,
        speed: 0.3 + Math.random() * 0.3, // Randomize speed
        type: type as DataFlowType['type'],
        start,
        end,
        createdAt: Date.now()
      };
      
      setFlows(prev => [...prev, newFlow]);
      
      // Notify parent component
      if (onFlowCreated) {
        onFlowCreated(newFlow, start, end);
      }
    };
    
    // Create a flow immediately
    createFlow();
    
    // Create flows at intervals
    const interval = setInterval(createFlow, flowInterval);
    
    return () => clearInterval(interval);
  }, [data, size, maxFlows, flowInterval, onFlowCreated]);
  
  // Remove completed flows
  useFrame(() => {
    setFlows(prev => prev.filter(flow => flow.progress < 1));
  });
  
  return (
    <group>
      {flows.map(flow => {
        // Get start and end positions
        const startPos = flow.curve.getPoint(0);
        const endPos = flow.curve.getPoint(1);
        
        return (
          <group key={flow.id}>
            <FlowParticle flow={flow} />
            <FlowTrail flow={flow} />
            <FlowEndpoint 
              position={startPos} 
              color={flow.color || '#33ccff'} 
              size={1.0} 
            />
            <FlowEndpoint 
              position={endPos} 
              color={flow.color || '#33ccff'} 
              size={1.0} 
            />
          </group>
        );
      })}
    </group>
  );
}; 