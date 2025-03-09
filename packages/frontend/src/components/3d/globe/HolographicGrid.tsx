import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HolographicGridProps {
  size: number;
  color?: string;
  opacity?: number;
  segments?: number;
}

export const HolographicGrid: React.FC<HolographicGridProps> = ({ 
  size, 
  color = '#00FFFF', 
  opacity = 0.2,
  segments = 20
}) => {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (gridRef.current) {
      // Rotate the grid slowly
      gridRef.current.rotation.y = clock.getElapsedTime() * 0.05;
      gridRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.1;
    }
  });
  
  // Create a custom shader material for the holographic grid
  const gridMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        // Grid pattern
        float lineWidth = 0.02;
        float gridX = step(1.0 - lineWidth, fract(vUv.x * ${segments}.0)) * step(lineWidth, fract(vUv.x * ${segments}.0));
        float gridY = step(1.0 - lineWidth, fract(vUv.y * ${segments}.0)) * step(lineWidth, fract(vUv.y * ${segments}.0));
        
        // Pulse effect
        float pulse = 0.5 + 0.5 * sin(time * 0.5);
        
        // Final color
        vec3 finalColor = color * (1.0 - (gridX + gridY));
        float finalOpacity = opacity * (1.0 - (gridX + gridY)) * (0.8 + 0.2 * pulse);
        
        gl_FragColor = vec4(finalColor, finalOpacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  
  // Update the time uniform
  useFrame(({ clock }) => {
    if (gridMaterial) {
      gridMaterial.uniforms.time.value = clock.getElapsedTime();
    }
  });
  
  return (
    <group ref={gridRef}>
      {/* Outer grid sphere */}
      <mesh>
        <sphereGeometry args={[size * 1.4, 32, 32]} />
        <primitive object={gridMaterial} attach="material" />
      </mesh>
    </group>
  );
}; 