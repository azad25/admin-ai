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

// Enhanced animated data flow along a curve with trail effect
const DataFlow: React.FC<DataFlowProps> = ({ curve, color = '#4488ff', speed = 0.5 }) => {
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
      {/* Animated particle - brighter and larger */}
      <animated.mesh ref={ref} scale={scale}>
        <sphereGeometry args={[0.06, 16, 16]} /> {/* Larger particle */}
        <meshBasicMaterial color={color} transparent opacity={1.0} /> {/* Full opacity */}
      </animated.mesh>
      
      {/* Trail effect - brighter and more visible */}
      {trailPoints.length > 1 && (
        <primitive object={new THREE.Line()} ref={trailRef}>
          <bufferGeometry />
          <lineBasicMaterial color={color} transparent opacity={0.7} linewidth={2} /> {/* Increased opacity and width */}
        </primitive>
      )}
    </>
  );
};

// Enhanced animated pulse effect at a point with multiple layers
const PulsePoint: React.FC<PulsePointProps> = ({ position, color = '#4488ff' }) => { // Default to blue color to match reference
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

const Globe: React.FC<GlobeProps> = ({ data, size = 2 }) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const [activeFlows, setActiveFlows] = useState<any[]>([]);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);
  const [cloudsTexture, setCloudsTexture] = useState<THREE.Texture | null>(null);
  const [bumpTexture, setBumpTexture] = useState<THREE.Texture | null>(null);
  const [specularTexture, setSpecularTexture] = useState<THREE.Texture | null>(null);
  const [nightLightsTexture, setNightLightsTexture] = useState<THREE.Texture | null>(null);
  const [pulsePoints, setPulsePoints] = useState<PulsePointData[]>([]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Smooth rotation for the globe - slower rotation to match reference
    if (globeRef.current) {
      // Rotate slightly on both Y and X axes for a more natural movement
      globeRef.current.rotation.y = time * 0.05; // Slower rotation to match reference
      globeRef.current.rotation.x = Math.sin(time * 0.03) * 0.01; // More subtle tilt oscillation
      // We're not using globeRotation currently, so we don't need to update it
      // setGlobeRotation(time * 0.05);
    }
    
    // Rotate clouds slightly faster than the globe
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = time * 0.12; // Slightly faster than the globe
      cloudsRef.current.rotation.x = Math.sin(time * 0.05) * 0.01; // Subtle tilt oscillation
    }
    
    // Update glow shader time uniform for animated effect
    if (glowMaterial.uniforms) {
      glowMaterial.uniforms.time.value = time;
      glowMaterial.uniforms.viewVector.value = new THREE.Vector3(0, 0, 5).applyQuaternion(camera.quaternion);
    }
  });
  
  const { scene, camera } = useThree();
  const cloudsRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    // Load Earth textures with better error handling and loading indicators
    const textureLoader = new THREE.TextureLoader();
    
    // Higher resolution Earth texture for better visual quality
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_4k.jpg',
      (texture) => {
        texture.anisotropy = 16; // Improve texture quality
        setEarthTexture(texture);
      },
      undefined, // onProgress not needed
      (error) => console.error('Error loading earth texture:', error)
    );
    
    // Enhanced clouds texture with better opacity
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_2048.png',
      (texture) => {
        texture.anisotropy = 16;
        setCloudsTexture(texture);
      },
      undefined,
      (error) => console.error('Error loading clouds texture:', error)
    );
    
    // Higher detail bump map for terrain
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
      (texture) => {
        texture.anisotropy = 16;
        setBumpTexture(texture);
      },
      undefined,
      (error) => console.error('Error loading bump texture:', error)
    );
    
    // Enhanced specular map for realistic ocean reflections
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
      (texture) => {
        texture.anisotropy = 16;
        setSpecularTexture(texture);
      },
      undefined,
      (error) => console.error('Error loading specular texture:', error)
    );
    
    // Add night lights texture for enhanced realism
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png',
      (texture) => {
        texture.anisotropy = 16;
        setNightLightsTexture(texture);
      },
      undefined,
      (error) => console.error('Error loading night lights texture:', error)
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
            color: Math.random() > 0.7 ? '#f50057' : '#4488ff', // More blue connections to match reference
            speed: 0.3 + Math.random() * 1.2 // Slightly slower for better visibility
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

  // Create an enhanced atmospheric glow effect for the globe
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      c: { value: 0.2 }, // Lower core value for stronger outer glow
      p: { value: 2.8 }, // Adjusted power for softer falloff
      glowColor: { value: new THREE.Color(0x0a4da8) }, // Darker blue for atmospheric glow to match reference
      viewVector: { value: new THREE.Vector3(0, 0, 0) },
      time: { value: 0.0 } // Time uniform for animated glow
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float c;
      uniform float p;
      uniform float time;
      varying float intensity;
      varying vec3 vPosition;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(c - dot(vNormal, vNormel), p);
        
        // Add subtle wave effect to the glow
        float displacement = sin(position.x * 10.0 + time) * sin(position.y * 10.0 + time) * 0.01;
        vec3 newPosition = position + normal * displacement;
        
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float time;
      varying float intensity;
      varying vec3 vPosition;
      void main() {
        // Add subtle color variation based on position
        vec3 adjustedColor = glowColor + vec3(sin(vPosition.x * 5.0 + time * 0.5) * 0.1, 
                                             sin(vPosition.y * 5.0 + time * 0.5) * 0.1, 
                                             sin(vPosition.z * 5.0 + time * 0.5) * 0.2);
        
        vec3 glow = adjustedColor * intensity;
        gl_FragColor = vec4(glow, intensity * 0.8); // Adjusted alpha for better blending
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false // Prevents z-fighting with other elements
  });

  // Create enhanced Earth material with improved visual effects to match reference image
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.05, // Reduced bump scale for smoother appearance like reference
    specularMap: specularTexture,
    specular: new THREE.Color(0x555555), // Reduced specular highlights
    shininess: 20, // Reduced shininess for more matte appearance
    emissive: nightLightsTexture ? new THREE.Color(0x0a4da8) : new THREE.Color(0x0a4da8), // Dark blue emissive to match reference
    emissiveMap: nightLightsTexture, // Use night lights texture for emissive mapping
    emissiveIntensity: 1.2, // Increased intensity for better glow effect
    displacementScale: 0.05, // Reduced displacement for smoother appearance
  });

  // Create enhanced clouds material with better visual effects
  const cloudsMaterial = new THREE.MeshPhongMaterial({
    map: cloudsTexture,
    transparent: true,
    opacity: 0.85, // Slightly reduced opacity for better balance
    side: THREE.DoubleSide,
    depthWrite: false, // Prevents z-fighting with the globe surface
    color: new THREE.Color(0xffffff), // Bright white clouds
    emissive: new THREE.Color(0x222222), // Slight emissive for better visibility
    emissiveIntensity: 0.1,
    blending: THREE.CustomBlending, // Custom blending for better cloud appearance
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  // Create a basic material as fallback if textures aren't loaded yet - adjusted to match reference image
  const fallbackMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color('#0a4da8'), // Darker blue to match reference
    emissive: new THREE.Color('#0a4da8'),
    emissiveIntensity: 0.8, // Increased emissive intensity for better glow
    shininess: 15, // Reduced shininess for more matte appearance
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

    const color = new THREE.Color(Math.random() > 0.7 ? '#f50057' : '#4488ff'); // More blue points to match reference
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = point.intensity * 0.5;

    // Add pulse effect for each point
    if (Math.random() > 0.7) { // Only add pulse to some points
      newPulsePoints.push({
        id: i,
        position: [x, y, z],
        color: Math.random() > 0.7 ? '#f50057' : '#4488ff' // More blue pulses to match reference
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

  // Create enhanced point material with custom shaders for better visual appeal
  const pointsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      size: { value: 0.2 },
      time: { value: 0.0 },
      texture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png') }
    },
    vertexShader: `
      uniform float size;
      uniform float time;
      attribute vec3 color;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        // Pulsating size effect
        float scale = 1.0 + 0.3 * sin(time * 2.0 + position.x + position.y);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D texture;
      varying vec3 vColor;
      void main() {
        vec4 texColor = texture2D(texture, gl_PointCoord);
        gl_FragColor = vec4(vColor, 1.0) * texColor;
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    vertexColors: true
  });

  // Update point material time uniform in each frame
  useEffect(() => {
    const updatePointMaterial = () => {
      if (pointsMaterial.uniforms && pointsMaterial.uniforms.time) {
        pointsMaterial.uniforms.time.value = clock.getElapsedTime();
      }
    };
    
    const clock = new THREE.Clock();
    const interval = setInterval(updatePointMaterial, 16); // ~60fps
    
    return () => clearInterval(interval);
  }, [pointsMaterial]);

  return (
    <>
      {/* Enhanced lighting setup to match reference image */}
      <ambientLight intensity={0.4} /> {/* Reduced ambient light for darker appearance */}
      <directionalLight position={[5, 3, 5]} intensity={0.8} color={new THREE.Color(0xaaccff)} /> {/* Bluer light */}
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color={new THREE.Color(0x4488ff)} /> {/* Bluer fill light */}
      <pointLight position={[10, 10, 10]} intensity={0.7} distance={20} decay={2} color={new THREE.Color(0x4488ff)} /> {/* Bluer point light */}
      
      {/* Enhanced stars background to match reference image */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={5}
        saturation={0.3}
        fade
        speed={0.3}
      />
      
      {/* Atmospheric glow effect - increased scale for wider glow like reference */}
      <mesh geometry={globeGeometry} material={glowMaterial} scale={1.4} />
      
      {/* Earth globe with enhanced material */}
      <mesh ref={globeRef} geometry={globeGeometry} material={earthTexture ? earthMaterial : fallbackMaterial} />
      
      {/* Clouds layer with enhanced material */}
      {cloudsTexture && (
        <mesh ref={cloudsRef} geometry={cloudsGeometry} material={cloudsMaterial} />
      )}
      
      {/* Enhanced data points with custom shader material */}
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} />
      
      {/* Render active data flows with enhanced visuals */}
      {activeFlows.map(flow => (
        <DataFlow key={flow.id} curve={flow.curve} color={flow.color} speed={flow.speed} />
      ))}
      
      {/* Render pulse effects with enhanced visuals */}
      {pulsePoints.map(point => (
        <PulsePoint key={point.id} position={point.position} color={point.color} />
      ))}
      
      {/* Enhanced camera controls */}
      <OrbitControls
        enableZoom={true}
        zoomSpeed={0.6}
        enablePan={false}
        minDistance={size * 1.5}
        maxDistance={size * 6}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI - Math.PI / 4}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
};

interface AIGlobeProps {
  data: GlobePoint[];
  size?: number;
}

export const AIGlobe: React.FC<AIGlobeProps> = ({ data, size = 400 }) => { // Increased default size for better visibility
  // If no data is provided, generate more sample data with better global coverage to match reference
  const globeData = data.length > 0 ? data : [
    { latitude: 37.7749, longitude: -122.4194, intensity: 0.8, city: "San Francisco", country: "USA" },
    { latitude: 40.7128, longitude: -74.0060, intensity: 0.9, city: "New York", country: "USA" },
    { latitude: 51.5074, longitude: -0.1278, intensity: 0.7, city: "London", country: "UK" },
    { latitude: 35.6762, longitude: 139.6503, intensity: 0.6, city: "Tokyo", country: "Japan" },
    { latitude: -33.8688, longitude: 151.2093, intensity: 0.5, city: "Sydney", country: "Australia" },
    { latitude: 1.3521, longitude: 103.8198, intensity: 0.7, city: "Singapore", country: "Singapore" },
    { latitude: 55.7558, longitude: 37.6173, intensity: 0.6, city: "Moscow", country: "Russia" },
    { latitude: -23.5505, longitude: -46.6333, intensity: 0.5, city: "São Paulo", country: "Brazil" },
    { latitude: 48.8566, longitude: 2.3522, intensity: 0.7, city: "Paris", country: "France" },
    { latitude: 28.6139, longitude: 77.2090, intensity: 0.8, city: "New Delhi", country: "India" },
    { latitude: 39.9042, longitude: 116.4074, intensity: 0.9, city: "Beijing", country: "China" },
    { latitude: -34.6037, longitude: -58.3816, intensity: 0.6, city: "Buenos Aires", country: "Argentina" },
    { latitude: 19.4326, longitude: -99.1332, intensity: 0.7, city: "Mexico City", country: "Mexico" },
    { latitude: 30.0444, longitude: 31.2357, intensity: 0.6, city: "Cairo", country: "Egypt" },
    { latitude: 59.3293, longitude: 18.0686, intensity: 0.5, city: "Stockholm", country: "Sweden" },
    { latitude: -6.2088, longitude: 106.8456, intensity: 0.7, city: "Jakarta", country: "Indonesia" },
  ];

  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 40 }} /* Adjusted camera for better view angle */
      style={{ width: '100%', height: size }}
    >
      <Globe data={globeData} size={2} />
    </Canvas>
  );
};