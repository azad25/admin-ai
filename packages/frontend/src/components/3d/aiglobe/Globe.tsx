import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GlobeProps, PulsePointData } from './types';
import { createCurve } from './utils';
import { DataFlow } from './DataFlow';
import { PulsePoint } from './PulsePoint';

/**
 * Globe component that renders a 3D globe with data points, flows, and animations
 * to match the reference holographic UI style
 *
 * @param data - Array of geographical points to display on the globe
 * @param size - Size of the globe (default: 2)
 */
export const Globe: React.FC<GlobeProps> = ({ data, size = 2 }) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const [activeFlows, setActiveFlows] = useState<Array<{
    id: number;
    curve: THREE.CurvePath<THREE.Vector3>;
    color: string;
    speed: number;
  }>>([]);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);
  // Fix: Remove unused state variables or use them properly
  const [bumpTexture] = useState<THREE.Texture | null>(null);
  const [specularTexture] = useState<THREE.Texture | null>(null);
  const [nightLightsTexture, setNightLightsTexture] = useState<THREE.Texture | null>(null);
  const [pulsePoints, setPulsePoints] = useState<PulsePointData[]>([]);
  const [uiElements, setUiElements] = useState<Array<{
    id: number;
    ref: React.RefObject<THREE.Group>;
    position: [number, number, number];
    size: number;
    speed: number;
    offset: number;
  }>>([]);
  const { scene, camera } = useThree();
  const cloudsRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    // Very slow rotation for the globe - matches reference image
    if (globeRef.current) {
      globeRef.current.rotation.y = time * 0.03;
      // Almost no tilt to match flat appearance in reference
      globeRef.current.rotation.x = Math.sin(time * 0.02) * 0.005;
    }
    // Rotate clouds slightly faster
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = time * 0.05;
      cloudsRef.current.rotation.x = Math.sin(time * 0.03) * 0.005;
    }
    // Animate glow
    if (glowRef.current && glowRef.current.material) {
      const material = glowRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = time;
        material.uniforms.viewVector.value = new THREE.Vector3(0, 0, 5).applyQuaternion(camera.quaternion);
      }
    }
    // Animate UI elements
    uiElements.forEach((element) => {
      if (element.ref.current) {
        element.ref.current.position.x = element.position[0] + Math.sin(time * element.speed + element.offset) * 0.02;
        element.ref.current.position.y = element.position[1] + Math.cos(time * element.speed + element.offset) * 0.01;
      }
    });
  });

  useEffect(() => {
    // Set background to black
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 5, 30);

    // Load darker Earth texture to match reference
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_4k.jpg',
      (texture) => {
        texture.anisotropy = 16;
        // Apply darker filter to match reference image
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = texture.image.width;
          canvas.height = texture.image.height;
          context.drawImage(texture.image, 0, 0);
          // Apply blue tint and darken
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Increase blue channel, reduce red and green
            data[i] *= 0.3; // red
            data[i + 1] *= 0.3; // green
            data[i + 2] = Math.min(255, data[i + 2] * 1.2); // blue
            // Darken overall
            data[i] = data[i] * 0.5;
            data[i + 1] = data[i + 1] * 0.5;
            data[i + 2] = data[i + 2] * 0.8;
          }
          context.putImageData(imageData, 0, 0);
          const darkTexture = new THREE.Texture(canvas);
          darkTexture.needsUpdate = true;
          setEarthTexture(darkTexture);
        } else {
          setEarthTexture(texture);
        }
      },
      undefined,
      (error) => console.error('Error loading earth texture:', error)
    );

    // Load night lights texture with higher prominence
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png',
      (texture) => {
        texture.anisotropy = 16;
        // Enhance brightness of lights
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = texture.image.width;
          canvas.height = texture.image.height;
          context.drawImage(texture.image, 0, 0);
          // Enhance brightness
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Increase brightness and add blue tint to lights
            data[i] = Math.min(255, data[i] * 1.2); // red
            data[i + 1] = Math.min(255, data[i + 1] * 1.2); // green
            data[i + 2] = Math.min(255, data[i + 2] * 1.5); // blue - enhance more
          }
          context.putImageData(imageData, 0, 0);
          const enhancedTexture = new THREE.Texture(canvas);
          enhancedTexture.needsUpdate = true;
          setNightLightsTexture(enhancedTexture);
        } else {
          setNightLightsTexture(texture);
        }
      },
      undefined,
      (error) => console.error('Error loading night lights texture:', error)
    );

    // Generate random data flows with higher frequency for holographic appearance
    const interval = setInterval(() => {
      if (data.length >= 2) {
        // Create more flows at once to match dense network in reference
        for (let i = 0; i < 3; i++) {
          const startIdx = Math.floor(Math.random() * data.length);
          let endIdx;
          do {
            endIdx = Math.floor(Math.random() * data.length);
          } while (endIdx === startIdx);
          const start = data[startIdx];
          const end = data[endIdx];
          
          // Fix: Make sure createCurve returns a CurvePath<Vector3>
          const curve = createCurve(
            start.latitude,
            start.longitude,
            end.latitude,
            end.longitude,
            size
          ) as THREE.CurvePath<THREE.Vector3>; // Cast to ensure type safety
          
          // Fix: Ensure consistent types in the state update
          setActiveFlows(prev => {
            // Keep more flows to match reference density
            const newFlows = [...prev, {
              id: Date.now() + i,
              curve,
              color: '#4488ff', // All blue connections to match reference
              speed: 0.2 + Math.random() * 0.8 // Slower for better visibility
            }];
            if (newFlows.length > 30) { // Keep more flows visible
              return newFlows.slice(newFlows.length - 30);
            }
            return newFlows;
          });
        }
      }
    }, 800); // More frequent generation

    // Generate holographic UI elements around the globe
    const newUiElements = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distanceFromGlobe = size * 2.2 + Math.random() * 1.5;
      const x = Math.cos(angle) * distanceFromGlobe;
      const y = (Math.random() - 0.5) * 3;
      const z = Math.sin(angle) * distanceFromGlobe;
      newUiElements.push({
        id: i,
        ref: React.createRef<THREE.Group>(),
        position: [x, y, z] as [number, number, number],
        size: 0.5 + Math.random() * 0.7,
        speed: 0.3 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2
      });
    }
    setUiElements(newUiElements);

    return () => clearInterval(interval);
  }, [data, size, scene]);

  // Updated glow material with stronger blue emission to match reference
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      c: { value: 0.1 }, // Lower core value for stronger outer glow
      p: { value: 2.5 }, // Adjusted power for softer falloff
      glowColor: { value: new THREE.Color(0x0a75ff) }, // Brighter blue for atmospheric glow
      viewVector: { value: new THREE.Vector3(0, 0, 0) },
      time: { value: 0.0 }
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
        float displacement = sin(position.x * 5.0 + time) * sin(position.y * 5.0 + time) * 0.01;
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
        vec3 adjustedColor = glowColor + vec3(sin(vPosition.x * 5.0 + time * 0.5) * 0.05,
                                             sin(vPosition.y * 5.0 + time * 0.5) * 0.05,
                                             sin(vPosition.z * 5.0 + time * 0.5) * 0.1);
        vec3 glow = adjustedColor * intensity;
        gl_FragColor = vec4(glow, intensity * 0.9); // Higher alpha for stronger glow
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  // Create darker Earth material with visible grid lines to match reference
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.03, // Reduced bump scale for smoother appearance
    specularMap: specularTexture,
    specular: new THREE.Color(0x333333), // Reduced specular highlights
    shininess: 10, // Reduced shininess for darker appearance
    emissive: new THREE.Color(0x0550c0), // Stronger blue emissive to match reference
    emissiveMap: nightLightsTexture,
    emissiveIntensity: 2.0, // Increased intensity for stronger glow effect
  });

  // Darker fallback material
  const fallbackMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color('#052456'), // Darker blue to match reference
    emissive: new THREE.Color('#0a4da8'),
    emissiveIntensity: 1.2,
    shininess: 10,
  });

  // Updated points material for brighter data points
  const pointsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      size: { value: 0.3 }, // Larger size for better visibility
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
        float scale = 0.8 + 0.4 * sin(time * 1.5 + position.x * 5.0);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale * (400.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D texture;
      uniform float time;
      varying vec3 vColor;
      void main() {
        // Softer point edges with texture
        vec4 texColor = texture2D(texture, gl_PointCoord);
        // Brighter glow
        float opacity = 0.8 + 0.2 * sin(time * 2.0);
        gl_FragColor = vec4(vColor, opacity) * texColor;
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  // Create geometries
  const globeGeometry = new THREE.SphereGeometry(size, 64, 64);
  const gridGeometry = new THREE.SphereGeometry(size * 1.001, 36, 36);

  // Create grid material for latitude/longitude lines
  const gridMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x0a75ff) },
      time: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      varying vec3 vPosition;
      float grid(vec3 pos, float scale) {
        // Convert to spherical coordinates
        float r = length(pos);
        float theta = acos(pos.y / r);
        float phi = atan(pos.z, pos.x);
        // Grid lines
        float lat = abs(fract(theta * 8.0 / 3.14159) - 0.5);
        float lon = abs(fract(phi * 8.0 / 3.14159) - 0.5);
        float latLine = smoothstep(0.98, 0.99, lat);
        float lonLine = smoothstep(0.98, 0.99, lon);
        return max(latLine, lonLine);
      }
      void main() {
        float gridOpacity = grid(vPosition, 10.0) * 0.3;
        // Pulse effect on grid
        gridOpacity *= 0.7 + 0.3 * sin(time * 0.5);
        gl_FragColor = vec4(color, gridOpacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // Setup data point positions
  const positions = new Float32Array(data.length * 3);
  const colors = new Float32Array(data.length * 3);
  const sizes = new Float32Array(data.length);
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

    // All blue data points to match reference
    const color = new THREE.Color('#4488ff');
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = point.intensity * 0.6; // Larger points

    // Add more pulse points to match reference density
    if (Math.random() > 0.5) {
      newPulsePoints.push({
        id: i,
        position: [x, y, z],
        color: '#4488ff' // All blue to match reference
      });
    }
  });

  // Update pulse points
  useEffect(() => {
    setPulsePoints(newPulsePoints);
  }, [data]);

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Update animations
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (pointsRef.current && pointsRef.current.material) {
      (pointsRef.current.material as THREE.ShaderMaterial).uniforms.time.value = time;
    }

    // Fix: Properly type cast the material
    const gridMesh = scene.getObjectByName('grid');
    if (gridMesh && (gridMesh as THREE.Mesh).material) {
      const material = (gridMesh as THREE.Mesh).material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = time;
      }
    }
  });

  // Create UI element component
  const UiElement = ({ element }: { element: { 
    id: number;
    ref: React.RefObject<THREE.Group>;
    position: [number, number, number];
    size: number;
    speed: number;
    offset: number;
  } }) => {
    return (
      <group ref={element.ref} position={element.position}>
        <mesh>
          <planeGeometry args={[element.size, element.size * 0.6]} />
          <shaderMaterial
            uniforms={{
              time: { value: 0 },
              color: { value: new THREE.Color(0x4488ff) }
            }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform float time;
              uniform vec3 color;
              varying vec2 vUv;
              float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
              }
              void main() {
                // Grid pattern
                float lineWidth = 0.03;
                float gridX = step(lineWidth, fract(vUv.x * 5.0));
                float gridY = step(lineWidth, fract(vUv.y * 5.0));
                float grid = gridX * gridY;
                // Random data appearance
                float r = random(vec2(floor(vUv.x * 10.0), floor(vUv.y * 10.0)) + time * 0.1);
                // Header bar
                float header = step(vUv.y, 0.2);
                // Border
                float border = step(vUv.x, lineWidth) + step(1.0 - lineWidth, vUv.x) +
                               step(vUv.y, lineWidth) + step(1.0 - lineWidth, vUv.y);
                border = min(1.0, border);
                // Combine effects
                float alpha = max(1.0 - grid * 0.7, 0.0);
                alpha = max(alpha, border);
                alpha = max(alpha, header);
                // Add some random data points
                if (r > 0.7 && grid > 0.5 && vUv.y > 0.2) {
                  alpha = 0.9;
                }
                // Pulsing effect
                alpha *= 0.7 + 0.3 * sin(time + vUv.x * 5.0);
                gl_FragColor = vec4(color, alpha * 0.7);
              }
            `}
            transparent={true}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* Darker stars background */}
      <Stars radius={100} depth={50} count={3000} factor={2} saturation={0} fade speed={0.5} />
      {/* Main globe with dark blue appearance */}
      <mesh ref={globeRef} geometry={globeGeometry} material={earthTexture ? earthMaterial : fallbackMaterial} />
      {/* Grid overlay for latitude/longitude lines */}
      <mesh name="grid" geometry={gridGeometry} material={gridMaterial} />
      {/* Atmospheric glow effect */}
      <mesh ref={glowRef} geometry={new THREE.SphereGeometry(size * 1.3, 32, 32)} material={glowMaterial} />
      {/* Data points */}
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} />
      {/* Data flows with higher density */}
      {activeFlows.map(flow => (
        <DataFlow
          key={flow.id}
          curve={flow.curve}
          color={flow.color}
          speed={flow.speed}
          // Fix: Make sure DataFlow component accepts width prop
          // Either remove width prop or update DataFlowProps interface
        />
      ))}
      {/* Pulse effects with higher density */}
      {pulsePoints.map(point => (
        <PulsePoint
          key={`pulse-${point.id}`}
          position={point.position}
          color={point.color}
          // Fix: Make sure PulsePoint component accepts size and speed props
          // Either remove these props or update PulsePointProps interface
        />
      ))}
      {/* UI elements around the globe */}
      {uiElements.map(element => (
        <UiElement key={`ui-${element.id}`} element={element} />
      ))}
      {/* Blue-tinted lighting */}
      <ambientLight intensity={0.3} color="#8ca9ff" />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 0, 0]} intensity={0.6} distance={10} decay={2} color="#4488ff" />
    </group>
  );
};