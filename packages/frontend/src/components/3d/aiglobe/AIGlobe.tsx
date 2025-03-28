import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AIGlobeProps } from './types';
import { Globe } from './Globe';
import { InfoBox } from './InfoBox';
import styled from 'styled-components';

// Static WebGL context tracker (shared across all instances)
const WebGLContextTracker = {
  activeInstances: 0,
  maxInstances: 1, // Limit the number of concurrent WebGL contexts
  register: () => {
    WebGLContextTracker.activeInstances++;
    return WebGLContextTracker.activeInstances;
  },
  unregister: () => {
    WebGLContextTracker.activeInstances = Math.max(0, WebGLContextTracker.activeInstances - 1);
  },
  canCreate: () => WebGLContextTracker.activeInstances < WebGLContextTracker.maxInstances,
};

// Error boundary to handle WebGL rendering issues
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode, fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('WebGL rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * AIGlobe component - Main entry point for the 3D globe visualization
 * 
 * This component renders a 3D interactive globe with data points, animated flows,
 * and pulse effects. It serves as the container for the Globe component and sets up
 * the Three.js canvas and camera.
 * 
 * @param data - Array of geographical points to display on the globe
 * @param size - Size of the canvas in pixels (default: 400)
 */
export const AIGlobe: React.FC<AIGlobeProps> = ({ data, size = 400 }) => {
  // Component instance ID for tracking
  const instanceIdRef = useRef<number>(-1);
  
  // State for tracking which info box is active/expanded
  const [activeInfoBox, setActiveInfoBox] = useState<string | null>(null);
  // State to track WebGL support
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  // State to force remount of canvas on error
  const [canvasKey, setCanvasKey] = useState(0);
  // Track whether the component is mounted to prevent state updates after unmounting
  const mountedRef = useRef(true);
  // Whether this instance should render a WebGL context (based on the global tracker)
  const [shouldRenderWebGL, setShouldRenderWebGL] = useState(false);
  
  // Register this instance in the context tracker on mount
  useEffect(() => {
    // Only register and render WebGL if the browser supports it
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const isSupported = !!gl;
      setIsWebGLSupported(isSupported);
      
      if (isSupported && WebGLContextTracker.canCreate()) {
        instanceIdRef.current = WebGLContextTracker.register();
        setShouldRenderWebGL(true);
      } else {
        // Don't create a new context if we've hit the limit
        setShouldRenderWebGL(false);
      }
    } catch (e) {
      console.error('WebGL detection error:', e);
      setIsWebGLSupported(false);
      setShouldRenderWebGL(false);
    }

    // Set up error handler for WebGL context loss
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('WebGL') || event.message.includes('uniform') || 
          event.message.includes('too many active WebGL contexts')) {
        console.warn('WebGL error detected, attempting recovery by remounting canvas');
        if (mountedRef.current) {
          setCanvasKey(prev => prev + 1);
        }
      }
    };

    window.addEventListener('error', handleError);
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      window.removeEventListener('error', handleError);
      
      // Unregister this instance when unmounting
      if (instanceIdRef.current > 0) {
        WebGLContextTracker.unregister();
        instanceIdRef.current = -1;
      }
    };
  }, []);
  
  // If no data is provided, generate sample data with global coverage (more points to match reference image)
  const globeData = data.length > 0 ? data : [
    { latitude: 37.7749, longitude: -122.4194, intensity: 0.8, city: "San Francisco", country: "USA" },
    { latitude: 40.7128, longitude: -74.0060, intensity: 0.9, city: "New York", country: "USA" },
    { latitude: 51.5074, longitude: -0.1278, intensity: 0.7, city: "London", country: "UK" },
    // Reduced sample data to minimize performance impact
    { latitude: 35.6762, longitude: 139.6503, intensity: 0.6, city: "Tokyo", country: "Japan" },
    { latitude: -33.8688, longitude: 151.2093, intensity: 0.5, city: "Sydney", country: "Australia" },
    { latitude: 1.3521, longitude: 103.8198, intensity: 0.7, city: "Singapore", country: "Singapore" },
    { latitude: 19.4326, longitude: -99.1332, intensity: 0.7, city: "Mexico City", country: "Mexico" },
    { latitude: 31.2304, longitude: 121.4737, intensity: 0.9, city: "Shanghai", country: "China" },
  ];

  // Handle info box click
  const handleInfoBoxClick = (id: string) => {
    setActiveInfoBox(activeInfoBox === id ? null : id);
  };

  const Container = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #040c1e 0%, #0a1c3f 50%, #091632 100%);
    overflow: hidden;
  `;

  const ErrorMessage = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #44ccff;
    background: rgba(4, 12, 30, 0.8);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #44ccff;
    text-align: center;
    max-width: 80%;
    box-shadow: 0 0 20px rgba(68, 204, 255, 0.5);
  `;

  // Render a static image placeholder instead of WebGL when we've hit the context limit
  const StaticPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #040c1e 0%, #0a1c3f 50%, #091632 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
  `;

  const StaticImage = styled.img`
    width: 90%;
    height: 90%;
    object-fit: contain;
    opacity: 0.8;
  `;

  // Fallback UI when WebGL fails or is limited
  const renderFallback = () => (
    <ErrorMessage>
      <h3>3D Globe Visualization Unavailable</h3>
      <p>{!isWebGLSupported ? 
        "Your browser doesn't support WebGL or the WebGL context was lost." :
        "Maximum WebGL contexts reached. Try refreshing the page."}
      </p>
      <p>Please try refreshing the page or using a different browser.</p>
    </ErrorMessage>
  );

  // Render a static image placeholder instead of WebGL when we've hit the context limit
  const renderStaticPlaceholder = () => (
    <StaticPlaceholder>
      <StaticImage
        src="/globe-static.png" 
        alt="Global AI Activity" 
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </StaticPlaceholder>
  );

  return (
    <Container>
      {/* Information boxes around the globe */}
      <InfoBox
        title="Global Activity"
        content={[
          "Active connections: 1,248",
          "Data transfer: 2.8 TB/day",
          "Response time: 42ms"
        ]}
        position="top-left"
        type="list"
        onClick={() => handleInfoBoxClick('activity')}
        isActive={activeInfoBox === 'activity'}
      />
      
      <InfoBox
        title="System Status"
        content="All systems operational with 99.98% uptime in the last 30 days"
        position="top-right"
        onClick={() => handleInfoBoxClick('status')}
        isActive={activeInfoBox === 'status'}
      />
      
      <InfoBox
        title="AI Processing"
        content="Analyzing global data patterns..."
        position="bottom-left"
        type="typing"
        delay={1000}
        onClick={() => handleInfoBoxClick('ai')}
        isActive={activeInfoBox === 'ai'}
      />
      
      <InfoBox
        title="Network Security"
        content={[
          "Threat level: Low",
          "Protected endpoints: 1,842",
          "Last scan: 4 minutes ago"
        ]}
        position="bottom-right"
        type="list"
        delay={500}
        onClick={() => handleInfoBoxClick('security')}
        isActive={activeInfoBox === 'security'}
      />
      
      {!isWebGLSupported ? renderFallback() : !shouldRenderWebGL ? renderStaticPlaceholder() : (
        <WebGLErrorBoundary fallback={renderFallback()}>
          <Canvas
            key={canvasKey}
            camera={{ position: [0, 0, 5], fov: 40 }}
            style={{ 
              width: '100%', 
              height: '100%', 
              background: 'linear-gradient(180deg, #050d20 0%, #071630 100%)'
            }}
            gl={{ 
              antialias: true, 
              alpha: false,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
              // More aggressive performance optimization
              precision: 'lowp', // Use low precision for better performance
            }}
            frameloop="demand" // Only render when needed (reduces CPU/GPU usage)
            dpr={[1, 1.5]} // Limit resolution multiplier
            performance={{ min: 0.5 }} // Allow performance scaling
            onCreated={({ gl, scene }) => {
              // Set additional WebGL renderer attributes for improved performance
              gl.shadowMap.enabled = false; // Disable shadows for performance
              gl.pixelRatio = Math.min(window.devicePixelRatio, 1.5); // Cap pixel ratio for performance
              
              // Set background scene for better atmosphere
              scene.background = new THREE.Color('#030a1c');
              
              // Add handler for context loss/restoration
              const canvas = gl.domElement;
              
              canvas.addEventListener('webglcontextlost', (event) => {
                console.warn('WebGL context lost', event);
                event.preventDefault();
                
                // Force remount on next render cycle
                if (mountedRef.current) {
                  setTimeout(() => setCanvasKey(prev => prev + 1), 100);
                }
              }, false);
              
              canvas.addEventListener('webglcontextrestored', () => {
                console.log('WebGL context restored - reloading scene');
              }, false);
              
              // Clean up references for better memory management
              return () => {
                // Dispose of all textures, geometries, and materials
                scene.traverse((object) => {
                  if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    
                    if (object.material) {
                      if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                      } else {
                        object.material.dispose();
                      }
                    }
                  }
                });
                
                // Dispose of the renderer
                gl.dispose();
              };
            }}
          >
            {/* Only one circle (Earth) */}
            <Globe 
              data={globeData} 
              size={2} 
              activePoint={activeInfoBox}
              onPointClick={(pointData) => {
                // Handle point click by updating the active info box
                const pointId = pointData?.id || pointData?.city;
                if (pointId) {
                  handleInfoBoxClick(pointId.toString());
                }
              }}
            />
            <OrbitControls
              enableZoom={true}
              zoomSpeed={0.5}
              enablePan={false}
              minDistance={2 * 1.2}
              maxDistance={2 * 4}
              minPolarAngle={Math.PI / 3.5}
              maxPolarAngle={Math.PI - Math.PI / 3.5}
              autoRotate
              autoRotateSpeed={0.2}
              enableDamping
              dampingFactor={0.08}
            />
            {/* Add fog to create depth */}
            <fog attach="fog" args={['#030a1c', 7, 15]} />
            {/* Add ambient light for better visibility */}
            <ambientLight intensity={0.3} color="#4488ff" />
          </Canvas>
        </WebGLErrorBoundary>
      )}
    </Container>
  );
};