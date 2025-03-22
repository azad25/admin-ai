import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DataFlowProps {
  curve: THREE.CurvePath<THREE.Vector3> | THREE.Curve<THREE.Vector3>;
  color?: string;
  speed?: number;
  width?: number;
  pointCount?: number;
  pointSize?: number;
  animated?: boolean;
}

/**
 * DataFlow component for visualizing connections between points on the globe
 * 
 * Creates animated glowing lines that show data transfer or connections.
 * Features a gradient effect along the path and animated points traveling along the connection.
 */
export const DataFlow: React.FC<DataFlowProps> = ({
  curve,
  color = '#44ccff',
  speed = 0.5,
  width = 0.015,
  pointCount = 5,
  pointSize = 0.02,
  animated = true
}) => {
  // Create references for animations with proper THREE.js types
  const pointsRef = useRef<THREE.Points>(null);
  const lineRef = useRef(null);
  const glowLineRef = useRef(null);
  
  // Create curve points for rendering the flow line
  const { curvePoints, linePositions } = useMemo(() => {
    // Create points along the curve - more points = smoother curve
    const totalPoints = 100;
    const points: THREE.Vector3[] = [];
    const positions: number[] = [];
    
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const point = curve.getPoint(t);
      points.push(point);
      positions.push(point.x, point.y, point.z);
    }
    
    return {
      curvePoints: points,
      linePositions: positions
    };
  }, [curve]);
  
  // Create animated points that travel along the curve
  const { particlePositions, particleSizes } = useMemo(() => {
    const positions = new Float32Array(pointCount * 3);
    const sizes = new Float32Array(pointCount);
    
    // Initialize with random positions along the curve
    for (let i = 0; i < pointCount; i++) {
      const t = Math.random();
      const point = curve.getPoint(t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      
      // Vary the size of points for visual interest
      sizes[i] = (Math.random() * 0.5 + 0.5) * pointSize;
    }
    
    return { particlePositions: positions, particleSizes: sizes };
  }, [curve, pointCount, pointSize]);
  
  // Create shader material for glowing points
  const pointsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vPosition;
        
        void main() {
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        
        void main() {
          // Create circular point with soft edge
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.2, dist);
          
          // Add pulsating glow
          float pulse = 0.5 + 0.5 * sin(time * 5.0);
          vec3 finalColor = mix(color, vec3(1.0), pulse * 0.3);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color]);
  
  // Create line material with glowing effect
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.6, 
      blending: THREE.AdditiveBlending,
      linewidth: 1 // Note: linewidth only works in WebGLRenderer with WebGL1
    });
  }, [color]);
  
  // Create animated line material for glow effect
  const glowLineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        time: { value: 0 },
        dashOffset: { value: 0 }
      },
      vertexShader: `
        uniform float time;
        uniform float dashOffset;
        attribute float lineDistance;
        varying float vLineDistance;
        
        void main() {
          vLineDistance = lineDistance;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float dashOffset;
        varying float vLineDistance;
        
        void main() {
          // Create dashed line effect
          float dashSize = 0.1;
          float gapSize = 0.9;
          float pattern = fract((vLineDistance + dashOffset) * 1.0);
          float dash = step(pattern, dashSize);
          
          // Fade out the ends of each dash for smoother appearance
          float fadeEdge = smoothstep(0.0, 0.1, pattern) * (1.0 - smoothstep(dashSize - 0.1, dashSize, pattern));
          
          // Add glow and pulsing
          float pulse = 0.7 + 0.3 * sin(time * 3.0 + vLineDistance * 10.0);
          
          float alpha = fadeEdge * pulse * 0.7;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color]);
  
  // Animate particles and line effects
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    if (animated && pointsRef.current) {
      // Update point shader material
      if (pointsMaterial.uniforms) {
        pointsMaterial.uniforms.time.value = time;
      }
      
      // Move points along the curve with different speeds
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < pointCount; i++) {
        // Calculate position along curve with wrapping
        const curvePosition = (time * speed * (0.5 + i * 0.1)) % 1.0;
        const point = curve.getPoint(curvePosition);
        
        // Update position
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Animate glow effect
    if (glowLineMaterial.uniforms) {
      glowLineMaterial.uniforms.time.value = time;
      glowLineMaterial.uniforms.dashOffset.value = time * speed;
    }
  });
  
  return (
    <group>
      {/* Basic line using Object3D notation for proper typing */}
      <primitive object={
        new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            'position', 
            new THREE.BufferAttribute(new Float32Array(linePositions), 3)
          ),
          lineMaterial
        )
      } ref={lineRef} />
      
      {/* Glowing line effect using THREE.Line */}
      <primitive object={
        (() => {
          // Create geometry with line distance attribute
          const geometry = new THREE.BufferGeometry().setAttribute(
            'position', 
            new THREE.BufferAttribute(new Float32Array(linePositions), 3)
          );
          
          // Add line distance attribute
          const distances = new Float32Array(curvePoints.length);
          let totalDist = 0;
          for (let i = 0; i < curvePoints.length; i++) {
            if (i > 0) {
              totalDist += curvePoints[i].distanceTo(curvePoints[i-1]);
            }
            distances[i] = totalDist;
          }
          
          geometry.setAttribute('lineDistance', new THREE.BufferAttribute(distances, 1));
          
          return new THREE.Line(geometry, glowLineMaterial);
        })()
      } ref={glowLineRef} />
      
      {/* Animated points traveling along the line */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particlePositions}
            count={pointCount}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            array={particleSizes}
            count={pointCount}
            itemSize={1}
          />
        </bufferGeometry>
        <primitive object={pointsMaterial} />
      </points>
      
      {/* Add a point light that follows the flow to illuminate nearby objects */}
      <pointLight
        position={curve.getPoint(0.5).toArray()}
        color={color}
        intensity={0.2}
        distance={2}
        decay={2}
      />
    </group>
  );
};