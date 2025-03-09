import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GlobeBaseProps {
  size: number;
  rotationSpeed?: number;
}

export const GlobeBase: React.FC<GlobeBaseProps> = ({ 
  size, 
  rotationSpeed = 0.1 
}) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Rotate the globe
  useFrame((state, delta) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += rotationSpeed * delta;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y += rotationSpeed * delta;
      
      // Pulse the glow
      const scale = 1.0 + 0.02 * Math.sin(state.clock.elapsedTime * 2);
      glowRef.current.scale.set(scale, scale, scale);
    }
  });
  
  return (
    <group>
      {/* Main globe sphere - darker blue to match reference */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshPhongMaterial 
          color="#001a33"  // Very dark blue to match reference
          emissive="#003366"
          emissiveIntensity={0.2}
          transparent
          opacity={0.9}
          shininess={100}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 0.98, 32, 32]} />
        <meshBasicMaterial 
          color="#0066aa"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[size * 1.02, 32, 32]} />
        <meshBasicMaterial 
          color="#0088cc"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Atmosphere effect - thinner to match reference */}
      <mesh>
        <sphereGeometry args={[size * 1.03, 32, 32]} />
        <meshBasicMaterial 
          color="#00aaff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}; 