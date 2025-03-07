import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

interface GlobePoint {
  latitude: number;
  longitude: number;
  intensity: number;
  city?: string;
  country?: string;
}

interface GlobeProps {
  data: GlobePoint[];
  size?: number;
}

interface CurveType {
  getPoint: (t: number) => THREE.Vector3;
}

interface DataFlowProps {
  curve: CurveType;
  color?: string;
  speed?: number;
}

interface PulsePointProps {
  position: [number, number, number];
  color?: string;
}

interface PulsePointData {
  id: number;
  position: [number, number, number];
  color: string;
}

// Create a curve between two points on the globe
const createCurve = (startLat: number, startLng: number, endLat: number, endLng: number, size: number): CurveType => {
  const startPhi = (90 - startLat) * (Math.PI / 180);
  const startTheta = (startLng + 180) * (Math.PI / 180);
  const endPhi = (90 - endLat) * (Math.PI / 180);
  const endTheta = (endLng + 180) * (Math.PI / 180);

  const startX = -(size * Math.sin(startPhi) * Math.cos(startTheta));
  const startZ = size * Math.sin(startPhi) * Math.sin(startTheta);
  const startY = size * Math.cos(startPhi);

  const endX = -(size * Math.sin(endPhi) * Math.cos(endTheta));
  const endZ = size * Math.sin(endPhi) * Math.sin(endTheta);
  const endY = size * Math.cos(endPhi);

  // Create a control point for the curve (to make it arc outward)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const midZ = (startZ + endZ) / 2;
  
  // Normalize the mid point and push it outward
  const midLength = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
  const controlPoint = new THREE.Vector3(
    midX / midLength * (size * 1.3),
    midY / midLength * (size * 1.3),
    midZ / midLength * (size * 1.3)
  );

  // Create a quadratic bezier curve
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(startX, startY, startZ),
    controlPoint,
    new THREE.Vector3(endX, endY, endZ)
  );

  return curve;
};

// Animated data flow along a curve
const DataFlow: React.FC<DataFlowProps> = ({ curve, color = '#f50057', speed = 0.5 }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);

  useFrame(() => {
    setProgress((prev) => (prev >= 1 ? 0 : prev + speed * 0.01));
    if (ref.current) {
      const point = curve.getPoint(progress);
      ref.current.position.set(point.x, point.y, point.z);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
};

// Animated pulse effect at a point
const PulsePoint: React.FC<PulsePointProps> = ({ position, color = '#f50057' }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0.1);
  const [opacity, setOpacity] = useState(1);

  useFrame(() => {
    setScale((prev) => (prev >= 1.5 ? 0.1 : prev + 0.03));
    setOpacity((prev) => (scale >= 1.5 ? 1 : 1 - scale / 1.5));
    if (ref.current) {
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};

const Globe: React.FC<GlobeProps> = ({ data, size = 2 }) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const [activeFlows, setActiveFlows] = useState<any[]>([]);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);
  const [cloudsTexture, setCloudsTexture] = useState<THREE.Texture | null>(null);
  const [bumpTexture, setBumpTexture] = useState<THREE.Texture | null>(null);
  const [specularTexture, setSpecularTexture] = useState<THREE.Texture | null>(null);
  const [pulsePoints, setPulsePoints] = useState<PulsePointData[]>([]);

  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
    
    // Also rotate clouds if they exist
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = clock.getElapsedTime() * 0.12; // Slightly faster than the globe
    }
  });

  const { scene } = useThree();
  const cloudsRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    // Load Earth textures
    const textureLoader = new THREE.TextureLoader();
    
    // Earth texture - using a brighter, more visible texture
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_4k.jpg',
      (texture) => {
        setEarthTexture(texture);
      }
    );
    
    // Clouds texture
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_2048.png',
      (texture) => {
        setCloudsTexture(texture);
      }
    );
    
    // Bump map for terrain
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
      (texture) => {
        setBumpTexture(texture);
      }
    );
    
    // Specular map for oceans
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
      (texture) => {
        setSpecularTexture(texture);
      }
    );

    scene.fog = new THREE.Fog(0x000000, 1, 1000);

    // Generate random data flows every few seconds
    const interval = setInterval(() => {
      if (data.length >= 2) {
        const startIdx = Math.floor(Math.random() * data.length);
        let endIdx;
        do {
          endIdx = Math.floor(Math.random() * data.length);
        } while (endIdx === startIdx);

        const start = data[startIdx];
        const end = data[endIdx];
        
        const curve = createCurve(
          start.latitude, 
          start.longitude, 
          end.latitude, 
          end.longitude, 
          size
        );

        setActiveFlows(prev => {
          // Keep only the last 10 flows to avoid performance issues
          const newFlows = [...prev, { 
            id: Date.now(), 
            curve, 
            color: Math.random() > 0.5 ? '#f50057' : '#2196f3',
            speed: 0.5 + Math.random() * 1.5
          }];
          if (newFlows.length > 10) {
            return newFlows.slice(newFlows.length - 10);
          }
          return newFlows;
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [data, size, scene]);

  // Create a glowing effect for the globe
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      c: { value: 0.2 },
      p: { value: 4.0 },
      glowColor: { value: new THREE.Color(0x3f51b5) },
      viewVector: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float c;
      uniform float p;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(c - dot(vNormal, vNormel), p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, 1.0);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  // Create Earth material with textures - increased brightness
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.05,
    specularMap: specularTexture,
    specular: new THREE.Color(0x666666), // Brighter specular highlights
    shininess: 25, // Increased shininess
    emissive: new THREE.Color(0x112244), // Slight emissive glow
    emissiveIntensity: 0.2,
  });

  // Create clouds material with increased opacity
  const cloudsMaterial = new THREE.MeshPhongMaterial({
    map: cloudsTexture,
    transparent: true,
    opacity: 0.9, // Increased opacity
    side: THREE.DoubleSide,
  });

  // Create a basic material as fallback if textures aren't loaded yet
  const fallbackMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color('#2196f3'),
    emissive: new THREE.Color('#144a7c'),
    emissiveIntensity: 0.3, // Increased emissive intensity
    shininess: 25,
  });

  const globeGeometry = new THREE.SphereGeometry(size, 64, 64);
  const cloudsGeometry = new THREE.SphereGeometry(size * 1.01, 32, 32);

  // Create points for locations
  const pointsGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(data.length * 3);
  const colors = new Float32Array(data.length * 3);
  const sizes = new Float32Array(data.length);

  // Create pulse points array
  const newPulsePoints: PulsePointData[] = [];

  data.forEach((point, i) => {
    const phi = (90 - point.latitude) * (Math.PI / 180);
    const theta = (point.longitude + 180) * (Math.PI / 180);

    const x = -(size * Math.sin(phi) * Math.cos(theta));
    const z = size * Math.sin(phi) * Math.sin(theta);
    const y = size * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const color = new THREE.Color(Math.random() > 0.5 ? '#f50057' : '#2196f3');
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = point.intensity * 0.5;

    // Add pulse effect for each point
    if (Math.random() > 0.7) { // Only add pulse to some points
      newPulsePoints.push({
        id: i,
        position: [x, y, z],
        color: Math.random() > 0.5 ? '#f50057' : '#2196f3'
      });
    }
  });

  // Update pulse points
  useEffect(() => {
    setPulsePoints(newPulsePoints);
  }, [data]);

  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.15, // Increased point size
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: true,
  });

  return (
    <>
      {/* Increased ambient light intensity */}
      <ambientLight intensity={0.8} />
      {/* Added directional light for better illumination */}
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      {/* Glow effect */}
      <mesh geometry={globeGeometry} material={glowMaterial} scale={1.2} />
      
      {/* Earth globe */}
      <mesh ref={globeRef} geometry={globeGeometry} material={earthTexture ? earthMaterial : fallbackMaterial} />
      
      {/* Clouds layer */}
      {cloudsTexture && (
        <mesh ref={cloudsRef} geometry={cloudsGeometry} material={cloudsMaterial} />
      )}
      
      {/* Data points */}
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} />
      
      {/* Render active data flows */}
      {activeFlows.map(flow => (
        <DataFlow key={flow.id} curve={flow.curve} color={flow.color} speed={flow.speed} />
      ))}
      
      {/* Render pulse effects */}
      {pulsePoints.map(point => (
        <PulsePoint key={point.id} position={point.position} color={point.color} />
      ))}
      
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
  // If no data is provided, generate some sample data
  const globeData = data.length > 0 ? data : [
    { latitude: 37.7749, longitude: -122.4194, intensity: 0.8, city: "San Francisco", country: "USA" },
    { latitude: 40.7128, longitude: -74.0060, intensity: 0.9, city: "New York", country: "USA" },
    { latitude: 51.5074, longitude: -0.1278, intensity: 0.7, city: "London", country: "UK" },
    { latitude: 35.6762, longitude: 139.6503, intensity: 0.6, city: "Tokyo", country: "Japan" },
    { latitude: -33.8688, longitude: 151.2093, intensity: 0.5, city: "Sydney", country: "Australia" },
    { latitude: 1.3521, longitude: 103.8198, intensity: 0.7, city: "Singapore", country: "Singapore" },
    { latitude: 55.7558, longitude: 37.6173, intensity: 0.6, city: "Moscow", country: "Russia" },
    { latitude: -23.5505, longitude: -46.6333, intensity: 0.5, city: "São Paulo", country: "Brazil" },
  ];

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      style={{ width: '100%', height: size }}
    >
      <Globe data={globeData} size={2} />
    </Canvas>
  );
}; 