import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AIGlobeProps } from './types';
import { Globe } from './Globe';
import { InfoBox } from './InfoBox';

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
  // State for tracking which info box is active/expanded
  const [activeInfoBox, setActiveInfoBox] = useState<string | null>(null);
  
  // If no data is provided, generate sample data with global coverage (more points to match reference image)
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
    { latitude: 25.2048, longitude: 55.2708, intensity: 0.8, city: "Dubai", country: "UAE" },
    { latitude: 37.5665, longitude: 126.9780, intensity: 0.7, city: "Seoul", country: "South Korea" },
    { latitude: 41.9028, longitude: 12.4964, intensity: 0.6, city: "Rome", country: "Italy" },
    { latitude: 52.5200, longitude: 13.4050, intensity: 0.7, city: "Berlin", country: "Germany" },
    { latitude: 31.2304, longitude: 121.4737, intensity: 0.9, city: "Shanghai", country: "China" },
    { latitude: 22.3193, longitude: 114.1694, intensity: 0.8, city: "Hong Kong", country: "China" },
    { latitude: 19.0760, longitude: 72.8777, intensity: 0.8, city: "Mumbai", country: "India" },
    { latitude: -34.9285, longitude: 138.6007, intensity: 0.5, city: "Adelaide", country: "Australia" },
    { latitude: 43.6532, longitude: -79.3832, intensity: 0.7, city: "Toronto", country: "Canada" },
    { latitude: 33.6844, longitude: -117.8265, intensity: 0.6, city: "Irvine", country: "USA" },
    { latitude: 45.5017, longitude: -73.5673, intensity: 0.6, city: "Montreal", country: "Canada" },
    { latitude: -22.9068, longitude: -43.1729, intensity: 0.7, city: "Rio de Janeiro", country: "Brazil" },
    { latitude: 55.6761, longitude: 12.5683, intensity: 0.5, city: "Copenhagen", country: "Denmark" },
    { latitude: 13.7563, longitude: 100.5018, intensity: 0.7, city: "Bangkok", country: "Thailand" },
  ];

  // Handle info box click
  const handleInfoBoxClick = (id: string) => {
    setActiveInfoBox(activeInfoBox === id ? null : id);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: size }}>
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
      
      <InfoBox
        title="Active Regions"
        content="North America, Europe, East Asia, Oceania"
        position="left"
        delay={800}
        onClick={() => handleInfoBoxClick('regions')}
        isActive={activeInfoBox === 'regions'}
      />
      
      <InfoBox
        title="Performance"
        content="Optimizing resource allocation..."
        position="right"
        type="typing"
        delay={1500}
        onClick={() => handleInfoBoxClick('performance')}
        isActive={activeInfoBox === 'performance'}
      />
      
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 38 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Only one circle (Earth) */}
        <Globe data={globeData} size={2} />
        <OrbitControls
          enableZoom={true}
          zoomSpeed={0.5}
          enablePan={false}
          minDistance={2 * 1.4}
          maxDistance={2 * 5}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI - Math.PI / 3.5}
          autoRotate
          autoRotateSpeed={0.25}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};