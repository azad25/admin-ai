import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AIGlobeProps } from './types';
import { Globe } from './Globe';

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
  // If no data is provided, generate sample data with global coverage
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
      <OrbitControls
        enableZoom={true}
        zoomSpeed={0.6}
        enablePan={false}
        minDistance={2 * 1.5}
        maxDistance={2 * 6}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI - Math.PI / 4}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
};