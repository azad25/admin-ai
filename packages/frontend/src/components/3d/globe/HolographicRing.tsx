import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HolographicRingProps {
  size: number;
  color?: string;
  width?: number;
  rotationSpeed?: number;
}

export const HolographicRing: React.FC<HolographicRingProps> = ({ 
  size, 
  color = '#00FFFF', 
  width = 0.1,
  rotationSpeed = 0.05
}) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (ringRef.current) {
      // Rotate in the opposite direction of the globe
      ringRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
      ringRef.current.rotation.y = clock.getElapsedTime() * -rotationSpeed;
    }
  });
  
  // Create a custom shader material for the holographic ring
  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
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
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        float intensity = 0.3 + 0.3 * sin(vUv.x * 30.0 + time);
        vec3 glow = color * intensity;
        float alpha = 0.2 + 0.1 * sin(vUv.x * 40.0 - time * 2.0);
        gl_FragColor = vec4(glow, alpha);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  
  // Update the time uniform
  useFrame(({ clock }) => {
    if (ringMaterial) {
      ringMaterial.uniforms.time.value = clock.getElapsedTime();
    }
  });
  
  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size - width/2, size + width/2, 128]} />
      <primitive object={ringMaterial} attach="material" />
    </mesh>
  );
}; 