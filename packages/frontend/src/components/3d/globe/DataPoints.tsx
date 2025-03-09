import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define GlobePoint interface directly in this file to avoid circular dependencies
interface GlobePoint {
  latitude: number;
  longitude: number;
  intensity: number;
  city?: string;
  country?: string;
}

interface DataPointsProps {
  data: GlobePoint[];
  size: number;
  pointSize?: number;
  color?: string;
}

export const DataPoints: React.FC<DataPointsProps> = ({ 
  data, 
  size, 
  pointSize = 0.05,
  color = '#00ffff'
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const pointsMaterialRef = useRef<THREE.PointsMaterial>(null);
  
  // Function to update positions
  const updatePositions = (geo: THREE.BufferGeometry, points: GlobePoint[], globeSize: number) => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    
    if (!points || points.length === 0) return;
    
    points.forEach(point => {
      // Convert lat/long to 3D coordinates
      const phi = (90 - point.latitude) * (Math.PI / 180);
      const theta = (point.longitude + 180) * (Math.PI / 180);
      
      const x = -(globeSize * 1.02 * Math.sin(phi) * Math.cos(theta));
      const y = globeSize * 1.02 * Math.cos(phi);
      const z = globeSize * 1.02 * Math.sin(phi) * Math.sin(theta);
      
      positions.push(x, y, z);
      
      // Set color based on intensity (cyan to white)
      const intensity = point.intensity || 0.5;
      const r = 0 + intensity * 1;
      const g = 1;
      const b = 1;
      colors.push(r, g, b);
      
      // Set size based on intensity
      sizes.push(pointSize * (0.5 + intensity * 1.5));
    });
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  };
  
  // Create and update geometry
  useEffect(() => {
    if (!pointsRef.current) return;
    
    const geometry = new THREE.BufferGeometry();
    
    // Initialize with empty arrays if no data
    if (!data || data.length === 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    } else {
      updatePositions(geometry, data, size);
    }
    
    pointsRef.current.geometry = geometry;
    
    return () => {
      geometry.dispose();
    };
  }, [data, size, pointSize]);
  
  // Animate points
  useFrame((state) => {
    if (pointsMaterialRef.current) {
      // Pulse effect
      pointsMaterialRef.current.size = pointSize * (1 + 0.2 * Math.sin(state.clock.elapsedTime * 2));
      
      // Update opacity for a glowing effect
      pointsMaterialRef.current.opacity = 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 3);
    }
  });
  
  // Don't render if no data
  if (!data || data.length === 0) return null;
  
  return (
    <points ref={pointsRef}>
      <pointsMaterial
        ref={pointsMaterialRef}
        size={pointSize}
        color={color}
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}; 