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
      {/* Enhanced animated particle with glow effect */}
      <animated.mesh ref={ref} scale={scale}>
        <sphereGeometry args={[0.1, 32, 32]} /> {/* Larger, smoother particle */}
        <meshBasicMaterial color={color} transparent opacity={1.0} /> {/* Full opacity */}
      </animated.mesh>
      
      {/* Add glow effect around the particle */}
      <animated.mesh scale={scale.to(s => [s * 1.8, s * 1.8, s * 1.8])} position={ref.current ? ref.current.position : [0, 0, 0]}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <shaderMaterial
          uniforms={{
            color: { value: new THREE.Color(color) },
            time: { value: 0 }
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 color;
            uniform float time;
            varying vec2 vUv;
            void main() {
              float dist = length(vUv - vec2(0.5));
              float alpha = smoothstep(0.5, 0.1, dist); // Sharper falloff
              vec3 glowColor = color * (1.0 - dist * 1.2); // Brighter glow
              // Add pulsing effect
              float pulse = 0.85 + 0.15 * sin(time * 2.0);
              gl_FragColor = vec4(glowColor, alpha * 0.9 * pulse); // Higher opacity
            }
          `}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </animated.mesh>
      
      {/* Trail effect - enhanced with gradient and glow to match reference image */}
      {trailPoints.length > 1 && (
        <primitive object={new THREE.Line()} ref={trailRef}>
          <bufferGeometry />
          <lineBasicMaterial color={color} transparent opacity={0.9} linewidth={4} /> {/* Further increased opacity and width to match reference */}
        </primitive>
      )}
      
      {/* Add second trail with additive blending for enhanced glow effect */}
      {trailPoints.length > 1 && (
        <primitive object={new THREE.Line()} >
          <bufferGeometry attributes={{
            position: trailRef.current?.geometry.attributes.position.clone() || new THREE.BufferAttribute(new Float32Array(0), 3)
          }} />
          <lineBasicMaterial 
            color={color} 
            transparent 
            opacity={0.5} 
            linewidth={6}
            blending={THREE.AdditiveBlending}
          />
        </primitive>
      )}
    </>
  );
};