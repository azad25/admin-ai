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
  
  // Enhanced spring animations for more dynamic effects to match reference image
  const { outerScale, outerOpacity } = useSpring({
    from: { outerScale: 0.1, outerOpacity: 1.0 },
    to: async (next) => {
      while (true) {
        await next({ outerScale: 2.5, outerOpacity: 0.0, config: { duration: 2000 } }); // Larger scale, faster animation
        await next({ outerScale: 0.1, outerOpacity: 1.0, config: { duration: 0 } });
      }
    },
  });
  
  const { middleScale, middleOpacity } = useSpring({
    from: { middleScale: 0.1, middleOpacity: 1.0 },
    to: async (next) => {
      while (true) {
        await next({ middleScale: 1.8, middleOpacity: 0.0, config: { duration: 1700 } }); // Larger scale, faster animation
        await next({ middleScale: 0.1, middleOpacity: 1.0, config: { duration: 0 } });
      }
    },
    delay: 200, // Shorter delay for more overlapping animations
  });
  
  // Enhanced core point with more pronounced pulsing to match reference image
  const { innerScale, innerOpacity } = useSpring({
    from: { innerScale: 0.8, innerOpacity: 0.8 },
    to: async (next) => {
      while (true) {
        await next({ innerScale: 1.5, innerOpacity: 1.0, config: { duration: 700 } }); // Faster, more pronounced pulse
        await next({ innerScale: 0.8, innerOpacity: 0.8, config: { duration: 700 } });
      }
    },
  });
  
  // Add a fourth layer for enhanced glow effect to match reference image
  const { glowScale, glowOpacity } = useSpring({
    from: { glowScale: 0.5, glowOpacity: 0.0 },
    to: async (next) => {
      while (true) {
        await next({ glowScale: 3.5, glowOpacity: 0.4, config: { duration: 2200 } }); // Larger, brighter glow
        await next({ glowScale: 0.5, glowOpacity: 0.0, config: { duration: 0 } });
      }
    },
    delay: 50, // Start almost immediately
  });

  return (
    <group position={position}>
      {/* Enhanced outer glow layer */}
      <animated.mesh
        scale={glowScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.08, 24, 24]} />
        <animated.shaderMaterial
          uniforms={{
            color: { value: new THREE.Color(color) },
            opacity: { value: 0 }
          }}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
              vUv = uv;
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 color;
            uniform float opacity;
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
              float dist = length(vUv - vec2(0.5));
              float alpha = smoothstep(0.5, 0.0, dist) * opacity;
              vec3 glowColor = color * (1.0 - dist * 1.8);
              gl_FragColor = vec4(glowColor, alpha * 0.4);
            }
          `}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          uniforms-opacity-value={glowOpacity}
        />
      </animated.mesh>
      
      {/* Outer pulse layer */}
      <animated.mesh
        ref={outerRef}
        scale={outerScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.09, 24, 24]} /> {/* Larger, smoother geometry */}
        <animated.meshBasicMaterial 
          color={color} 
          transparent 
          opacity={outerOpacity} 
          blending={THREE.AdditiveBlending} 
          {...{/* Enhanced blending */}}
        />
      </animated.mesh>
      
      {/* Middle pulse layer */}
      <animated.mesh
        ref={middleRef}
        scale={middleScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.07, 24, 24]} /> {/* Larger, smoother geometry */}
        <animated.meshBasicMaterial 
          color={color} 
          transparent 
          opacity={middleOpacity} 
          blending={THREE.AdditiveBlending} 
          {...{/* Enhanced blending */}}
        />
      </animated.mesh>
      
      {/* Core point - enhanced with opacity animation */}
      <animated.mesh
        ref={innerRef}
        scale={innerScale.to(s => [s, s, s])}
      >
        <sphereGeometry args={[0.05, 24, 24]} /> {/* Larger, smoother geometry */}
        <animated.meshBasicMaterial 
          color={color} 
          transparent 
          opacity={innerOpacity} 
          blending={THREE.AdditiveBlending} 
          {...{/* Enhanced blending */}}
        />
      </animated.mesh>
    </group>
  );
};