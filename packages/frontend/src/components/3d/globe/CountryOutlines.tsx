import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CountryOutlinesProps {
  size: number;
  color?: string;
  opacity?: number;
}

export const CountryOutlines: React.FC<CountryOutlinesProps> = ({ 
  size, 
  color = '#00ffff',
  opacity = 0.9
}) => {
  const meshRef = useRef<THREE.LineSegments>(null);
  
  useEffect(() => {
    if (!meshRef.current) return;
    
    createCountryOutlines();
  }, [size, color]);
  
  const createCountryOutlines = () => {
    if (!meshRef.current) return;
    
    // Clear any existing geometry
    if (meshRef.current.geometry) {
      meshRef.current.geometry.dispose();
    }
    
    // Create a new geometry for the country outlines
    const geometry = new THREE.BufferGeometry();
    
    // Define major continents with more detailed outlines
    const majorOutlines = [
      // North America
      [[-125, 49], [-125, 30], [-100, 30], [-100, 49], [-125, 49]],
      [[-100, 49], [-100, 30], [-80, 30], [-80, 49], [-100, 49]],
      [[-80, 49], [-80, 30], [-60, 30], [-60, 49], [-80, 49]],
      [[-125, 30], [-125, 15], [-90, 15], [-90, 30], [-125, 30]],
      
      // South America
      [[-80, 10], [-80, -20], [-70, -20], [-70, 10], [-80, 10]],
      [[-80, -20], [-80, -55], [-70, -55], [-70, -20], [-80, -20]],
      [[-70, 10], [-70, -20], [-40, -20], [-40, 10], [-70, 10]],
      [[-70, -20], [-70, -55], [-40, -55], [-40, -20], [-70, -20]],
      
      // Europe
      [[-10, 60], [-10, 50], [0, 50], [0, 60], [-10, 60]],
      [[-10, 50], [-10, 35], [0, 35], [0, 50], [-10, 50]],
      [[0, 60], [0, 50], [20, 50], [20, 60], [0, 60]],
      [[0, 50], [0, 35], [20, 35], [20, 50], [0, 50]],
      [[20, 60], [20, 50], [40, 50], [40, 60], [20, 60]],
      [[20, 50], [20, 35], [40, 35], [40, 50], [20, 50]],
      
      // Africa
      [[-20, 35], [-20, 10], [0, 10], [0, 35], [-20, 35]],
      [[-20, 10], [-20, -15], [0, -15], [0, 10], [-20, 10]],
      [[-20, -15], [-20, -35], [0, -35], [0, -15], [-20, -15]],
      [[0, 35], [0, 10], [20, 10], [20, 35], [0, 35]],
      [[0, 10], [0, -15], [20, -15], [20, 10], [0, 10]],
      [[0, -15], [0, -35], [20, -35], [20, -15], [0, -15]],
      [[20, 35], [20, 10], [50, 10], [50, 35], [20, 35]],
      [[20, 10], [20, -15], [50, -15], [50, 10], [20, 10]],
      [[20, -15], [20, -35], [50, -35], [50, -15], [20, -15]],
      
      // Asia
      [[40, 60], [40, 50], [60, 50], [60, 60], [40, 60]],
      [[40, 50], [40, 35], [60, 35], [60, 50], [40, 50]],
      [[60, 60], [60, 50], [90, 50], [90, 60], [60, 60]],
      [[60, 50], [60, 35], [90, 35], [90, 50], [60, 50]],
      [[90, 60], [90, 50], [145, 50], [145, 60], [90, 60]],
      [[90, 50], [90, 35], [145, 35], [145, 50], [90, 50]],
      [[60, 35], [60, 20], [90, 20], [90, 35], [60, 35]],
      [[60, 20], [60, 0], [90, 0], [90, 20], [60, 20]],
      [[90, 35], [90, 20], [145, 20], [145, 35], [90, 35]],
      [[90, 20], [90, 0], [145, 0], [145, 20], [90, 20]],
      
      // Australia
      [[110, -10], [110, -25], [130, -25], [130, -10], [110, -10]],
      [[110, -25], [110, -40], [130, -40], [130, -25], [110, -25]],
      [[130, -10], [130, -25], [155, -25], [155, -10], [130, -10]],
      [[130, -25], [130, -40], [155, -40], [155, -25], [130, -25]],
    ];
    
    // Add fewer latitude lines (just major ones)
    const latLines = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const latLine = [];
      for (let lng = -180; lng <= 180; lng += 10) {
        latLine.push([lng, lat]);
      }
      latLines.push(latLine);
    }
    
    // Add fewer longitude lines (just major ones)
    const longLines = [];
    for (let lng = -180; lng <= 180; lng += 30) {
      const lngLine = [];
      for (let lat = -60; lat <= 60; lat += 10) {
        lngLine.push([lng, lat]);
      }
      longLines.push(lngLine);
    }
    
    // Combine all lines, with major outlines repeated for emphasis
    const allLines = [
      ...majorOutlines, 
      ...majorOutlines, // Duplicate for emphasis
      ...latLines,
      ...longLines
    ];
    
    // Convert to 3D points on a sphere
    const points: number[] = [];
    
    allLines.forEach(line => {
      for (let i = 0; i < line.length - 1; i++) {
        const [lon1, lat1] = line[i];
        const [lon2, lat2] = line[i + 1];
        
        // Convert to radians
        const phi1 = (90 - lat1) * (Math.PI / 180);
        const phi2 = (90 - lat2) * (Math.PI / 180);
        const theta1 = (lon1 + 180) * (Math.PI / 180);
        const theta2 = (lon2 + 180) * (Math.PI / 180);
        
        // Convert to 3D coordinates
        const x1 = -size * Math.sin(phi1) * Math.cos(theta1);
        const y1 = size * Math.cos(phi1);
        const z1 = size * Math.sin(phi1) * Math.sin(theta1);
        
        const x2 = -size * Math.sin(phi2) * Math.cos(theta2);
        const y2 = size * Math.cos(phi2);
        const z2 = size * Math.sin(phi2) * Math.sin(theta2);
        
        // Add line segment
        points.push(x1, y1, z1);
        points.push(x2, y2, z2);
      }
    });
    
    // Create buffer attributes
    const positionAttribute = new THREE.Float32BufferAttribute(points, 3);
    geometry.setAttribute('position', positionAttribute);
    
    // Set the new geometry
    meshRef.current.geometry = geometry;
  };
  
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material instanceof THREE.Material) {
      // Add subtle pulsing effect
      meshRef.current.material.opacity = opacity * (0.8 + 0.2 * Math.sin(state.clock.elapsedTime * 0.5));
    }
  });
  
  return (
    <lineSegments ref={meshRef}>
      <lineBasicMaterial 
        attach="material" 
        color={color} 
        opacity={opacity} 
        transparent={true} 
        linewidth={2}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}; 