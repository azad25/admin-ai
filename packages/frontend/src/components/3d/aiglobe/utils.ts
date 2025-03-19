import * as THREE from 'three';

/**
 * Convert latitude and longitude to 3D coordinates
 * 
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @param radius - Globe radius
 * @returns 3D vector position
 */
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

/**
 * Create a curved path between two points on the globe
 * 
 * @param startLat - Starting point latitude
 * @param startLng - Starting point longitude
 * @param endLat - Ending point latitude
 * @param endLng - Ending point longitude
 * @param globeRadius - Radius of the globe
 * @param height - Maximum height of the curve (default: 0.4)
 * @returns Curve path
 */
export function createCurve(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  globeRadius: number,
  height: number = 0.4
): THREE.CurvePath<THREE.Vector3> {
  // Convert lat/lng to 3D vectors
  const startVec = latLngToVector3(startLat, startLng, globeRadius);
  const endVec = latLngToVector3(endLat, endLng, globeRadius);
  
  // Calculate the arc height
  const arcHeight = globeRadius * height;
  
  // Calculate the mid point
  const midVec = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  
  // Normalize and scale to create arc
  const midLength = midVec.length();
  midVec.normalize();
  midVec.multiplyScalar(midLength + arcHeight);
  
  // Create curve path
  const path = new THREE.CurvePath<THREE.Vector3>();
  
  // Add a quadratic curve for smoother arcs
  const curve = new THREE.QuadraticBezierCurve3(
    startVec,
    midVec,
    endVec
  );
  
  path.add(curve);
  
  return path;
}

/**
 * Generate a random color in the blue spectrum
 * 
 * @returns Hex color string
 */
export function getRandomBlueColor(): string {
  // Generate a color in the blue spectrum
  const r = Math.floor(Math.random() * 50); // Low red
  const g = Math.floor(Math.random() * 100 + 50); // Medium green
  const b = Math.floor(Math.random() * 100 + 155); // High blue
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Load a texture with error handling
 * 
 * @param url - URL of the texture
 * @returns Promise resolving to the texture
 */
export function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.anisotropy = 16;
        resolve(texture);
      },
      undefined,
      (error) => reject(error)
    );
  });
}

/**
 * Apply a color filter to a texture
 * 
 * @param texture - Original texture
 * @param filter - Filter function to apply to each pixel
 * @returns Modified texture
 */
export function applyFilterToTexture(
  texture: THREE.Texture,
  filter: (r: number, g: number, b: number, a: number) => [number, number, number, number]
): THREE.Texture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    console.error('Could not get 2D context for texture filtering');
    return texture;
  }
  
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  context.drawImage(texture.image, 0, 0);
  
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = filter(data[i], data[i + 1], data[i + 2], data[i + 3]);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  
  context.putImageData(imageData, 0, 0);
  
  const newTexture = new THREE.Texture(canvas);
  newTexture.needsUpdate = true;
  
  return newTexture;
}