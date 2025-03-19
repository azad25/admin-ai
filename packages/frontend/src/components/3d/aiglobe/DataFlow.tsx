import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { DataFlowProps } from './types';

/**
 * DataFlow component that creates an animated particle moving along a curve with a trail effect
 * 
 * @param curve - The curve path for the data flow
 * @param color - Color of the data flow (default: '#4488ff')
 * @param speed - Speed of the animation (default: 0.5)
 */
export const DataFlow: React.FC<DataFlowProps> = ({ curve, color = '#4488ff', speed = 0.5 }) => {
  const ref = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const [progress, setProgress] = useState(0);
  const [trailPoints, setTrailPoints] = useState<THREE.Vector3[]>([]);
  
  // Use spring animation for smoother movement
  const { scale } = useSpring({ 
    scale: 1.5, // Increased scale for better visibility
    from: { scale: 0 },
    config: { tension: 120, friction: 14 }
  });

  useFrame(() => {
    // Update progress along the curve
    setProgress((prev) => (prev >= 1 ? 0 : prev + speed * 0.01));
    
    if (ref.current) {
      // Get current position on the curve
      const point = curve.getPoint(progress);
      ref.current.position.set(point.x, point.y, point.z);
      
      // Add point to trail (limiting to 20 points to avoid performance issues)
      setTrailPoints(prev => {
        const newPoints = [...prev, new THREE.Vector3(point.x, point.y, point.z)];
        return newPoints.slice(Math.max(0, newPoints.length - 20));
      });
    }
    
    // Update trail geometry
    if (trailRef.current && trailPoints.length > 1) {
      const geometry = trailRef.current.geometry as THREE.BufferGeometry;
      const positions = new Float32Array(trailPoints.length * 3);
      
      trailPoints.forEach((point, i) => {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      });
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Animated particle - brighter and larger */}
      <animated.mesh ref={ref} scale={scale}>
        <sphereGeometry args={[0.06, 16, 16]} /> {/* Larger particle */}
        <meshBasicMaterial color={color} transparent opacity={1.0} /> {/* Full opacity */}
      </animated.mesh>
      
      {/* Trail effect - brighter and more visible */}
      {trailPoints.length > 1 && (
        <primitive object={new THREE.Line()} ref={trailRef}>
          <bufferGeometry />
          <lineBasicMaterial color={color} transparent opacity={0.7} linewidth={2} /> {/* Increased opacity and width */}
        </primitive>
      )}
    </>
  );
};