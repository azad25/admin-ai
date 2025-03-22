import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';

interface PulsePointProps {
  position: [number, number, number];
  color?: string;
  size?: number;
  pulseSpeed?: number;
  isActive?: boolean;
  data?: any;
  onClick?: (data: any) => void;
}

/**
 * PulsePoint component for showing glowing points on the globe
 * 
 * Creates an animated, pulsing point with hover and click interactivity.
 * Used to represent locations or data points on the globe with a glowing effect.
 */
export const PulsePoint: React.FC<PulsePointProps> = ({
  position,
  color = '#44ccff',
  size = 0.05,
  pulseSpeed = 1,
  isActive = false,
  data,
  onClick
}) => {
  // References for animation
  const pointRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<any>(null);
  
  // State for hover and animation
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [timeOffset] = useState(() => Math.random() * Math.PI * 2);
  
  // Calculate colors for various states
  const baseColor = new THREE.Color(color);
  const activeColor = new THREE.Color(0xffffff);
  const hoverColor = new THREE.Color('#66eeff');
  
  // Create pulse material with time-based animations
  const pulseMaterial = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        time: { value: 0 },
        activeState: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float activeState;
        
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          // Calculate distance from center
          vec2 center = vUv - 0.5;
          float dist = length(center);
          
          // Create pulse wave
          float wave = sin(time * 3.0 - dist * 10.0) * 0.5 + 0.5;
          wave = smoothstep(0.0, 1.0, wave);
          
          // Edge glow with time-based pulse
          float edge = smoothstep(0.5, 0.0, dist) * (0.5 + 0.5 * wave);
          
          // Boost for active/hover states
          float boost = activeState * 0.7;
          
          // Combine effects
          float alpha = edge * (1.0 + boost);
          
          // Brighter core for active state
          vec3 finalColor = color;
          if (dist < 0.2) {
            finalColor = mix(color, vec3(1.0, 1.0, 1.0), activeState * 0.7);
          }
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  
  // Setup click handler
  const handleClick = (event: any) => {
    event.stopPropagation();
    setClicked(!clicked);
    if (onClick && data) {
      onClick(data);
    }
  };
  
  // Handle animation and appearance changes based on state
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() + timeOffset;
    
    if (pulseMaterial.current) {
      pulseMaterial.current.uniforms.time.value = time;
      pulseMaterial.current.uniforms.activeState.value = (isActive || hovered) ? 1.0 : 0.0;
    }
    
    if (pointRef.current) {
      // Core point animations
      const scale = 1 + 0.2 * Math.sin(time * pulseSpeed * 2);
      pointRef.current.scale.set(scale, scale, scale);
      
      // Set color based on state
      if (pointRef.current.material instanceof THREE.MeshBasicMaterial) {
        if (isActive) {
          pointRef.current.material.color.copy(activeColor);
          pointRef.current.material.opacity = 1;
        } else if (hovered) {
          pointRef.current.material.color.copy(hoverColor);
          pointRef.current.material.opacity = 0.9;
        } else {
          pointRef.current.material.color.copy(baseColor);
          pointRef.current.material.opacity = 0.7 + 0.3 * Math.sin(time * pulseSpeed * 3);
        }
      }
    }
    
    if (glowRef.current) {
      // Glow effect animations
      const glowScale = 1.5 + 0.5 * Math.sin(time * pulseSpeed);
      glowRef.current.scale.set(glowScale, glowScale, glowScale);
      
      if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        glowRef.current.material.opacity = 0.3 + 0.2 * Math.sin(time * pulseSpeed * 2);
      }
    }
    
    if (pulseRef.current) {
      // Outer pulse ring animations
      const pulseScale = 1 + 0.6 * Math.sin(time * pulseSpeed * 1.5);
      pulseRef.current.scale.set(pulseScale, pulseScale, pulseScale);
    }
    
    // Update label if active
    if (labelRef.current) {
      labelRef.current.visible = isActive || hovered;
      if (labelRef.current.visible) {
        const labelScale = 1 + 0.1 * Math.sin(time * 2);
        labelRef.current.scale.set(labelScale, labelScale, labelScale);
      }
    }
  });
  
  // Get label text from data
  const getLabelText = () => {
    if (!data) return '';
    return data.city || data.label || data.id?.toString() || '';
  };
  
  return (
    <group 
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Core point */}
      <mesh ref={pointRef}>
        <sphereGeometry args={[size * 0.6, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.2, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer pulse effect */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <primitive object={pulseMaterial.current} />
      </mesh>
      
      {/* Label that shows on hover or when active */}
      {getLabelText() && (
        <group position={[0, size * 3, 0]}>
          <Text
            ref={labelRef}
            fontSize={size * 1.5}
            color={isActive ? "#ffffff" : color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
            visible={isActive || hovered}
          >
            {getLabelText()}
          </Text>
        </group>
      )}
      
      {/* Add a small light source at each point to illuminate the globe surface */}
      <pointLight
        color={color}
        intensity={0.2}
        distance={1}
        decay={2}
      />
    </group>
  );
};