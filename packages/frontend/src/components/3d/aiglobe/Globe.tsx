import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GlobeProps, PulsePointData, GlobePoint } from './types';
import { PulsePoint } from './PulsePoint';
import { DataFlow } from './DataFlow';
import { useTexture } from '@react-three/drei';

/**
 * Enhanced 3D Globe component with holographic effect
 * Improved visual appearance with cloud layer and glow effects
 */
export const Globe: React.FC<GlobeProps> = ({
  data = [],
  size = 1,
  activePoint = null,
  onPointClick
}) => {
  const rotationSpeed = 0.001;
  const radius = size;
  const { scene } = useThree();
  
  // References for animation
  const globeRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  
  // State for animated elements
  const [pulsePoints, setPulsePoints] = useState<PulsePointData[]>([]);
  const [activeFlows, setActiveFlows] = useState<Array<{
    id: number;
    curve: THREE.CurvePath<THREE.Vector3>;
    color: string;
    speed: number;
  }>>([]);
  
  // Function to create a random flow from a source point to another random point
  const createRandomFlow = (sourcePosition: [number, number, number]) => {
    if (pulsePoints.length < 2) return; // Need at least 2 points to create a flow
    
    // Find a random destination point (different from source)
    let destPoint: PulsePointData | null = null;
    
    // Find a destination that's not the source
    while (!destPoint) {
      const randomPoint = pulsePoints[Math.floor(Math.random() * pulsePoints.length)];
      if (randomPoint.position !== sourcePosition) {
        destPoint = randomPoint;
      }
    }
    
    // Create a curved path between the two points
    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    
    // Convert positions to Vector3
    const start = new THREE.Vector3(...sourcePosition);
    const end = new THREE.Vector3(...destPoint.position);
    
    // Calculate a midpoint that's pushed outward from the globe center
    const midPoint = new THREE.Vector3().addVectors(start, end).divideScalar(2);
    midPoint.normalize().multiplyScalar(radius * 1.3); // Push out 30% from surface
    
    // Create a quadratic curve
    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    curvePath.add(curve);
    
    // Add to active flows
    const newFlow = {
      id: Date.now(), // Use timestamp as unique ID
      curve: curvePath,
      color: '#44ccff',
      speed: 0.8 + Math.random() * 0.4
    };
    
    setActiveFlows(prev => [...prev, newFlow]);
    
    // Remove the flow after some time
    setTimeout(() => {
      setActiveFlows(prev => prev.filter(flow => flow.id !== newFlow.id));
    }, 10000);
  };
  
  // Main texture loading function
  const textures = useMemo(() => {
    // Create a logger for texture loading
    const logTextureLoad = (name: string, success: boolean, error?: unknown) => {
      if (success) {
        console.log(`✅ Successfully loaded texture: ${name}`);
      } else {
        console.error(`❌ Failed to load texture: ${name}`, error);
      }
    };

    // Helper function to load texture with proper error handling
    const loadTexture = (path: string): THREE.Texture => {
      // Make sure path is absolute 
      const absolutePath = path.startsWith('/') ? path : `/${path}`;
      
      try {
        const texture = new THREE.TextureLoader().load(
          absolutePath,
          (loaded) => logTextureLoad(path, true),
          undefined,
          (error) => logTextureLoad(path, false, error)
        );
        // Set anisotropy for better quality at angles
        texture.anisotropy = 16;
        return texture;
      } catch (err) {
        logTextureLoad(path, false, err);
        // Return a blank texture as fallback
        return new THREE.Texture();
      }
    };

    // Create colored fallback texture
    const createFallbackTexture = (color: string): THREE.Texture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 512, 256);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // Load all textures
    try {
      return {
        earthDayMap: loadTexture('/assets/textures/earth_daymap.jpg') || createFallbackTexture('#1976d2'),
        earthNightMap: loadTexture('/assets/textures/earth_nightmap.jpg') || createFallbackTexture('#0a1420'),
        earthBumpMap: loadTexture('/assets/textures/earth_bumpmap.jpg') || createFallbackTexture('#888888'),
        cloudsMap: loadTexture('/assets/textures/earth_clouds.jpg') || createFallbackTexture('#ffffff'),
        earthSpecularMap: loadTexture('/assets/textures/earth_specular.jpg') || createFallbackTexture('#444444'),
        atmosphereMap: loadTexture('/assets/textures/earth_atmos_4k.jpg') || createFallbackTexture('#0066cc'),
        nightLightsMap: loadTexture('/assets/textures/earth_lights_2048.png') || createFallbackTexture('#00264d'),
      };
    } catch (err) {
      console.error('Error loading textures:', err);
      // Return fallback textures
      return {
        earthDayMap: createFallbackTexture('#1976d2'),
        earthNightMap: createFallbackTexture('#0a1420'),
        earthBumpMap: createFallbackTexture('#888888'),
        cloudsMap: createFallbackTexture('#ffffff'),
        earthSpecularMap: createFallbackTexture('#444444'),
        atmosphereMap: createFallbackTexture('#0066cc'),
        nightLightsMap: createFallbackTexture('#00264d'),
      };
    }
  }, []);
  
  // Configure texture settings
  useEffect(() => {
    // Enhance texture quality
    Object.values(textures).forEach(texture => {
      if (texture) {
        texture.anisotropy = 16;
        // Replace deprecated encoding with colorSpace
        texture.colorSpace = THREE.SRGBColorSpace;
      }
    });
  }, [textures]);
  
  // Create shader material for Earth with day/night blending
  const earthShaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: textures.earthDayMap },
        nightTexture: { value: textures.earthNightMap },
        bumpTexture: { value: textures.earthBumpMap },
        specularTexture: { value: textures.earthSpecularMap },
        lightDirection: { value: new THREE.Vector3(1, 0, 1).normalize() },
        bumpScale: { value: 0.15 },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D bumpTexture;
        uniform sampler2D specularTexture;
        uniform vec3 lightDirection;
        uniform float bumpScale;
        uniform float time;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Apply bump mapping for more detailed surface
          vec3 normal = normalize(vNormal);
          vec4 bumpData = texture2D(bumpTexture, vUv);
          normal = normalize(normal + bumpScale * vec3(bumpData.r - 0.5, bumpData.g - 0.5, 0.0));
          
          // Calculate light intensity based on normal and light direction
          float intensity = 1.1 * max(0.0, dot(normal, lightDirection));
          intensity = smoothstep(0.0, 1.0, intensity);
          
          // Sample day and night textures
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          
          // Enhanced blue holographic tint
          dayColor.rgb = mix(dayColor.rgb, vec3(0.2, 0.5, 1.0), 0.5);
          nightColor.rgb = mix(nightColor.rgb, vec3(0.0, 0.3, 0.9), 0.6);
          
          // Add blue glow to oceans - use specular map to identify water
          vec4 specularData = texture2D(specularTexture, vUv);
          float isWater = smoothstep(0.1, 0.3, specularData.r);
          dayColor.rgb = mix(dayColor.rgb, vec3(0.1, 0.4, 0.9), isWater * 0.8);
          
          // Mix between day and night based on light intensity
          vec4 color = mix(nightColor, dayColor, intensity);
          
          // Add specular highlight for water and ice
          float specular = pow(max(0.0, dot(reflect(-lightDirection, normal), normalize(-vPosition))), 20.0);
          color.rgb += specularData.r * specular * vec3(0.3, 0.6, 1.0) * 1.5;
          
          // Add subtle color variations based on time for a "living" effect
          float timeEffect = sin(time * 0.5 + vUv.x * 10.0) * 0.5 + 0.5;
          color.rgb += vec3(0.0, 0.05, 0.1) * timeEffect * (1.0 - intensity);
          
          // Stronger edge glow effect
          float edge = 1.0 - max(0.0, dot(normal, normalize(-vPosition)));
          color.rgb += vec3(0.2, 0.6, 1.0) * pow(edge, 1.5) * 1.5;
          
          // Add subtle grid pattern to the texture
          float latLine = abs(sin(vUv.y * 50.0)) < 0.98 ? 0.0 : 0.1;
          float lonLine = abs(sin(vUv.x * 50.0)) < 0.98 ? 0.0 : 0.1;
          float gridEffect = max(latLine, lonLine) * edge;
          color.rgb += vec3(0.2, 0.6, 1.0) * gridEffect;
          
          gl_FragColor = color;
        }
      `,
      transparent: true,
      depthWrite: true
    });
  }, [textures.earthDayMap, textures.earthNightMap, textures.earthBumpMap, textures.earthSpecularMap]);
  
  // Create atmosphere effect
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color("#44ccff") },
        coefficient: { value: 0.5 },
        power: { value: 3.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float time;
        uniform float coefficient;
        uniform float power;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Calculate the vector from vertex to camera
          vec3 viewVector = normalize(vCameraWorldPosition - vVertexWorldPosition);
          
          // Calculate rim lighting effect - brighter at edges
          float intensity = pow(coefficient + dot(vNormal, viewVector), power);
          
          // Apply color and intensity for glow effect
          float glow = smoothstep(0.0, 1.0, intensity);
          
          // Apply stronger intensity at the edges for a sharp, holographic look
          vec3 finalColor = glowColor * 1.5;
          
          // Create a bright edge with a smooth falloff toward the center
          float alpha = smoothstep(0.3, 1.0, glow) * 0.6;
          
          // Output final color and alpha
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
  }, []);
  
  // Initialize data points and flows
  useEffect(() => {
    // Create pulse points at data locations
    const newPulsePoints: PulsePointData[] = [];
    
    // Create geometries for data points
    data.forEach((point, index) => {
      // Convert lat/long to 3D coordinates
      const phi = (90 - point.latitude) * (Math.PI / 180);
      const theta = (point.longitude + 180) * (Math.PI / 180);
      
      const x = -size * Math.sin(phi) * Math.cos(theta);
      const y = size * Math.cos(phi);
      const z = size * Math.sin(phi) * Math.sin(theta);
      
      // Add pulse point
      newPulsePoints.push({
        id: index,
        position: [x, y, z],
        color: '#44ccff'
      });
    });
    
    setPulsePoints(newPulsePoints);
    
    // Set up interval to generate flows between points
    const interval = setInterval(() => {
      if (data.length >= 2) {
        // Create flows between random points
        const newFlows: Array<{
          id: number;
          curve: THREE.CurvePath<THREE.Vector3>;
          color: string;
          speed: number;
        }> = [];
        
        // Create connections between random points
        const connectionsCount = Math.min(data.length / 2, 3);
        
        for (let i = 0; i < connectionsCount; i++) {
          // Select random start and end points
          const startIdx = Math.floor(Math.random() * data.length);
          let endIdx;
          
          do {
            endIdx = Math.floor(Math.random() * data.length);
          } while (endIdx === startIdx);
          
          const startPoint = data[startIdx];
          const endPoint = data[endIdx];
          
          // Convert lat/long to 3D coordinates
          const startPhi = (90 - startPoint.latitude) * (Math.PI / 180);
          const startTheta = (startPoint.longitude + 180) * (Math.PI / 180);
          
          const startX = -size * Math.sin(startPhi) * Math.cos(startTheta);
          const startY = size * Math.cos(startPhi);
          const startZ = size * Math.sin(startPhi) * Math.sin(startTheta);
          
          const endPhi = (90 - endPoint.latitude) * (Math.PI / 180);
          const endTheta = (endPoint.longitude + 180) * (Math.PI / 180);
          
          const endX = -size * Math.sin(endPhi) * Math.cos(endTheta);
          const endY = size * Math.cos(endPhi);
          const endZ = size * Math.sin(endPhi) * Math.sin(endTheta);
          
          // Create a curve between points with a slight arc
          const midPoint = new THREE.Vector3(
            (startX + endX) / 2,
            (startY + endY) / 2,
            (startZ + endZ) / 2
          );
          
          // Move midpoint outward from center for arc effect
          const midPointLength = midPoint.length();
          midPoint.normalize().multiplyScalar(midPointLength * 1.3);
          
          // Create curve
          const curve = new THREE.CurvePath<THREE.Vector3>();
          
          // Add curve segments
          const curve1 = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(startX, startY, startZ),
            midPoint,
            new THREE.Vector3(endX, endY, endZ)
          );
          
          curve.add(curve1);
          
          // Vary the color slightly for visual interest
          const blueShade = 0.8 + Math.random() * 0.2;
          const color = `rgba(68, ${Math.floor(204 * blueShade)}, 255, 1.0)`;
          
          // Add flow with random speed
          newFlows.push({
            id: Date.now() + i,
            curve,
            color,
            speed: 0.5 + Math.random() * 0.5
          });
        }
        
        // Update active flows
        setActiveFlows(prev => {
          const combined = [...prev, ...newFlows];
          const maxFlows = 12; // Maximum number of flows for performance
          return combined.length > maxFlows ? combined.slice(combined.length - maxFlows) : combined;
        });
      }
    }, 2000); // Generate new flows every 2 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [data, size]);
  
  // Rotate the globe and update time uniforms
  useFrame(({ clock }) => {
    // Get elapsed time for animations
    const elapsedTime = clock.getElapsedTime();
    
    // Rotate the globe group - basic rotation even if there are issues
    if (globeRef.current) {
      globeRef.current.rotation.y += rotationSpeed;
    }

    // Update shader time uniforms - make sure to check if objects exist
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = elapsedTime;
    }

    // Rotate clouds slightly faster than the globe
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += rotationSpeed * 1.1;
    }

    // Update atmosphere shader if it exists
    if (atmosphereRef.current && atmosphereRef.current.material instanceof THREE.ShaderMaterial) {
      if (atmosphereRef.current.material.uniforms.time) {
        atmosphereRef.current.material.uniforms.time.value = elapsedTime;
      }
    }
    
    // Find the grid mesh and update its time uniform if it exists
    if (globeRef.current) {
      // Find a mesh that might be the grid
      const gridMesh = globeRef.current.children.find(
        child => child instanceof THREE.Mesh && 
                 child.material instanceof THREE.ShaderMaterial && 
                 'uniforms' in child.material && 
                 child.material.uniforms.time !== undefined
      ) as THREE.Mesh | undefined;
      
      // Only update if we found a valid mesh
      if (gridMesh && gridMesh.material instanceof THREE.ShaderMaterial) {
        gridMesh.material.uniforms.time.value = elapsedTime;
      }
    }
  });
  
  return (
    <group ref={globeRef}>
      {/* Main Earth sphere with custom shader */}
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive object={earthShaderMaterial} ref={shaderRef} />
      </mesh>
      
      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.01, 32, 32]} />
        <meshStandardMaterial 
          map={textures.cloudsMap} 
          transparent 
          opacity={0.4} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      
      {/* Atmosphere glow - closer to surface */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[radius * 1.03, 32, 32]} />
        <primitive object={atmosphereMaterial} />
      </mesh>
      
      {/* Grid overlay (thin latitude/longitude lines) */}
      <mesh>
        <sphereGeometry args={[radius * 1.001, 64, 64]} />
        <shaderMaterial 
          uniforms={{
            color: { value: new THREE.Color('#44ccff') },
            time: { value: 0.0 }
          }}
          vertexShader={`
            varying vec3 vPosition;
            
            void main() {
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 color;
            uniform float time;
            varying vec3 vPosition;
            
            float grid(vec3 pos) {
              // Convert to spherical coordinates
              float r = length(pos);
              float theta = acos(pos.y / r);
              float phi = atan(pos.z, pos.x);
              
              // Grid density
              float latDensity = 18.0;
              float lonDensity = 36.0;
              
              // Calculate grid lines
              float latLine = abs(fract(theta * latDensity / 3.14159) - 0.5);
              float lonLine = abs(fract(phi * lonDensity / 3.14159) - 0.5);
              
              // Threshold and combine
              float latGrid = smoothstep(0.95, 0.98, 1.0 - latLine * 2.0);
              float lonGrid = smoothstep(0.95, 0.98, 1.0 - lonLine * 2.0);
              
              // Combine with animation
              float grid = max(latGrid, lonGrid);
              return grid * (0.7 + 0.3 * sin(time * 0.5)); // Subtle pulsing
            }
            
            void main() {
              float gridOpacity = grid(vPosition);
              gl_FragColor = vec4(color, gridOpacity * 0.2); // Very subtle grid
            }
          `}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Data points on the globe */}
      {pulsePoints.map((point) => (
        <PulsePoint
          key={point.id}
          position={point.position}
          color={point.color}
          size={0.08}
          pulseSpeed={1 + Math.random() * 0.5}
          isActive={activePoint !== null && point.id.toString() === activePoint.toString()}
          data={point}
          onClick={(pointData) => {
            // Call the provided onPointClick if available
            if (onPointClick) {
              onPointClick(pointData);
            }
            // Also create a visual flow effect
            createRandomFlow(pointData.position);
          }}
        />
      ))}
      
      {/* Animated data flows */}
      {activeFlows.map((flow) => (
        <DataFlow
          key={flow.id}
          curve={flow.curve}
          color={flow.color}
          speed={flow.speed}
          width={0.04}
        />
      ))}
      
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#88ccff" />
      <directionalLight position={[1, 0.5, 2]} intensity={0.8} color="#ffffff" />
    </group>
  );
}; 