import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

interface GlobePoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

interface GlobeProps {
  data: GlobePoint[];
  size?: number;
}

const Globe: React.FC<GlobeProps> = ({ data, size = 2 }) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.Fog(0x000000, 1, 1000);
  }, [scene]);

  const globeGeometry = new THREE.SphereGeometry(size, 64, 64);
  const globeMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1a237e'),
    transparent: true,
    opacity: 0.8,
    metalness: 0.2,
    roughness: 0.5,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    wireframe: true,
  });

  const pointsGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(data.length * 3);
  const colors = new Float32Array(data.length * 3);
  const sizes = new Float32Array(data.length);

  data.forEach((point, i) => {
    const phi = (90 - point.latitude) * (Math.PI / 180);
    const theta = (point.longitude + 180) * (Math.PI / 180);

    const x = -(size * Math.sin(phi) * Math.cos(theta));
    const z = size * Math.sin(phi) * Math.sin(theta);
    const y = size * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const color = new THREE.Color('#f50057');
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = point.intensity * 0.5;
  });

  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: true,
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <mesh ref={globeRef} geometry={globeGeometry} material={globeMaterial} />
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI - Math.PI / 4}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
};

interface AIGlobeProps {
  data: GlobePoint[];
  size?: number;
}

export const AIGlobe: React.FC<AIGlobeProps> = ({ data, size = 350 }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      style={{ width: '100%', height: size }}
    >
      <Globe data={data} size={2} />
    </Canvas>
  );
}; 