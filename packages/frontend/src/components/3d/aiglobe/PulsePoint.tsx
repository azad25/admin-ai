import React, { useRef } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { PulsePointProps } from './types';

/**
 * PulsePoint component that creates an animated pulsing effect at a specific location
 * 
 * @param position - 3D position coordinates [x, y, z]
 * @param color - Color of the pulse effect (default: '#4488ff')
 */
export const PulsePoint: React.FC<PulsePointProps> = ({ position, color = '#4488ff' }) => {
  const outerRef = useRef<THREE.Mesh>(null);
  const middleRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  
  // Use spring animations for smoother effects
  const { outerScale, outerOpacity } = useSpring({
    from: { outerScale: 0.1, outerOpacity: 1.0 },
    to: async (next) => {
      while (true) {
        await next({ outerScale: 1.8, outerOpacity: 0.0, config: { duration: 2000 } });
        await next({ outerScale: 0.1, outerOpacity: 1.0, config: { duration: 0 } });
      }
    },
  });
  
  const { middleScale, middleOpacity } = useSpring({
    from: { middleScale: 0.1, middleOpacity: 1.0 },
    to: async (next) => {
      while (true) {
        await next({ middleScale: 1.4, middleOpacity: 0.0, config: { duration: 1800 } });
        await next({ middleScale: 0.1, middleOpacity: 1.0, config: { duration: 0 } });
      }
    },
    delay: 400, // Stagger the animations
  });
  
  // Core point that pulses subtly
  const { innerScale } = useSpring({
    from: { innerScale: 0.8 },
    to: async (next) => {
      while (true) {
        await next({ innerScale: 1.2, config: { duration: 1000 } });
        await next({ innerScale: 0.8, config: { duration: 1000 } });
      }
    },
  });

  return (
    <group position={position}>
      {/* Outer pulse layer */}
      <animated.mesh
        ref={outerRef}
        scale={outerScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <animated.meshBasicMaterial 
          color={color} 
          transparent 
          opacity={outerOpacity} 
        />
      </animated.mesh>
      
      {/* Middle pulse layer */}
      <animated.mesh
        ref={middleRef}
        scale={middleScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.06, 16, 16]} />
        <animated.meshBasicMaterial 
          color={color} 
          transparent 
          opacity={middleOpacity} 
        />
      </animated.mesh>
      
      {/* Core point - always visible */}
      <animated.mesh
        ref={innerRef}
        scale={innerScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.9} 
        />
      </animated.mesh>
    </group>
  );
};