import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface LatLongGridProps {
  size: number;
  color?: string;
  opacity?: number;
  latStep?: number;
  lngStep?: number;
}

export const LatLongGrid: React.FC<LatLongGridProps> = ({ 
  size, 
  color = '#00FFFF', 
  opacity = 0.2,
  latStep = 30,
  lngStep = 30
}) => {
  const gridRef = useRef<THREE.LineSegments>(null);
  const [gridLines, setGridLines] = useState<THREE.BufferGeometry | null>(null);
  
  useEffect(() => {
    // Create latitude and longitude lines
    const createLatLongGrid = () => {
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      // Latitude lines
      for (let lat = -60; lat <= 60; lat += latStep) {
        const phi = (90 - lat) * (Math.PI / 180);
        
        for (let lng = -180; lng < 180; lng += 5) {
          const theta1 = (lng + 180) * (Math.PI / 180);
          const theta2 = (lng + 5 + 180) * (Math.PI / 180);
          
          const x1 = -(size * Math.sin(phi) * Math.cos(theta1));
          const z1 = size * Math.sin(phi) * Math.sin(theta1);
          const y1 = size * Math.cos(phi);
          
          const x2 = -(size * Math.sin(phi) * Math.cos(theta2));
          const z2 = size * Math.sin(phi) * Math.sin(theta2);
          const y2 = size * Math.cos(phi);
          
          positions.push(x1, y1, z1);
          positions.push(x2, y2, z2);
        }
      }
      
      // Longitude lines
      for (let lng = -180; lng < 180; lng += lngStep) {
        const theta = (lng + 180) * (Math.PI / 180);
        
        for (let lat = -60; lat <= 60; lat += 5) {
          const phi1 = (90 - lat) * (Math.PI / 180);
          const phi2 = (90 - (lat + 5)) * (Math.PI / 180);
          
          const x1 = -(size * Math.sin(phi1) * Math.cos(theta));
          const z1 = size * Math.sin(phi1) * Math.sin(theta);
          const y1 = size * Math.cos(phi1);
          
          const x2 = -(size * Math.sin(phi2) * Math.cos(theta));
          const z2 = size * Math.sin(phi2) * Math.sin(theta);
          const y2 = size * Math.cos(phi2);
          
          positions.push(x1, y1, z1);
          positions.push(x2, y2, z2);
        }
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      setGridLines(geometry);
    };
    
    createLatLongGrid();
  }, [size, latStep, lngStep]);
  
  if (!gridLines) return null;
  
  return (
    <lineSegments ref={gridRef} geometry={gridLines}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}; 