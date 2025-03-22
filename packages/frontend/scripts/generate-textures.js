import fs from 'fs';
import { createCanvas } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the directory if it doesn't exist
const texturesDir = path.join(__dirname, '../public/assets/textures');
if (!fs.existsSync(texturesDir)) {
  fs.mkdirSync(texturesDir, { recursive: true });
}

// Function to generate a simple Earth texture with continent outlines
function generateEarthTexture(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // Simplified continent outlines - just for visualization purposes
  const continents = [
    // North America
    [
      [0.15, 0.2], [0.3, 0.15], [0.28, 0.35], [0.2, 0.45], [0.15, 0.35]
    ],
    // South America
    [
      [0.3, 0.5], [0.33, 0.7], [0.27, 0.8], [0.2, 0.65]
    ],
    // Europe
    [
      [0.45, 0.2], [0.5, 0.15], [0.55, 0.2], [0.5, 0.3], [0.4, 0.3]
    ],
    // Africa
    [
      [0.45, 0.35], [0.55, 0.35], [0.52, 0.6], [0.45, 0.6], [0.4, 0.45]
    ],
    // Asia
    [
      [0.55, 0.22], [0.75, 0.15], [0.8, 0.3], [0.7, 0.45], [0.55, 0.35]
    ],
    // Australia
    [
      [0.8, 0.55], [0.85, 0.65], [0.75, 0.7], [0.7, 0.65]
    ],
    // Antarctica
    [
      [0.3, 0.9], [0.6, 0.9], [0.7, 0.85], [0.2, 0.85]
    ]
  ];
  
  // Draw continent outlines with glowing blue effect
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#44ccff';
  ctx.lineJoin = 'round';
  
  // Add a subtle glow effect
  ctx.shadowColor = '#44ccff';
  ctx.shadowBlur = 10;
  
  continents.forEach(continent => {
    ctx.beginPath();
    continent.forEach((point, i) => {
      const x = point[0] * width;
      const y = point[1] * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  });
  
  // Add some grid lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(68, 204, 255, 0.3)';
  ctx.shadowBlur = 5;
  
  // Latitude lines
  for (let i = 1; i < 10; i++) {
    const y = height * (i / 10);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Longitude lines
  for (let i = 1; i < 20; i++) {
    const x = width * (i / 20);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Save the texture
  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync(path.join(texturesDir, filename), buffer);
  
  console.log(`Generated ${filename}`);
}

// Function to generate a lights texture
function generateLightsTexture(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill with black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // Add glowing lights
  ctx.fillStyle = '#44ccff';
  ctx.shadowColor = '#44ccff';
  ctx.shadowBlur = 15;
  
  // Draw lights based on continents - simplified version of world cities
  const lights = [
    // North America
    { x: 0.22, y: 0.25, size: 3 }, // New York
    { x: 0.18, y: 0.3, size: 2 },  // Chicago
    { x: 0.15, y: 0.25, size: 3 }, // West Coast US
    { x: 0.23, y: 0.2, size: 2 },  // Canada
    
    // South America
    { x: 0.3, y: 0.6, size: 3 },   // Brazil
    { x: 0.25, y: 0.7, size: 2 },  // Argentina
    
    // Europe
    { x: 0.45, y: 0.22, size: 2.5 }, // Western Europe
    { x: 0.5, y: 0.2, size: 2 },   // Central Europe
    { x: 0.53, y: 0.23, size: 2 }, // Eastern Europe
    
    // Africa
    { x: 0.47, y: 0.4, size: 2 },  // Northern Africa
    { x: 0.5, y: 0.5, size: 1.5 }, // Central Africa
    
    // Asia
    { x: 0.6, y: 0.25, size: 3 },  // Russia
    { x: 0.7, y: 0.3, size: 3 },   // China
    { x: 0.75, y: 0.35, size: 2.5 }, // Japan
    { x: 0.65, y: 0.4, size: 2 },  // India
    
    // Australia
    { x: 0.8, y: 0.65, size: 2 }   // Australia
  ];
  
  // Add many smaller lights 
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 1.5 + 0.5;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  
  // Add larger city lights
  lights.forEach(light => {
    ctx.beginPath();
    ctx.arc(light.x * width, light.y * height, light.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  });
  
  // Save the texture
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(texturesDir, filename), buffer);
  
  console.log(`Generated ${filename}`);
}

// Function to generate a normal map texture
function generateNormalMapTexture(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill with a neutral gray (represents flat surface in normal maps)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);
  
  // Add some noise for the normal map
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Add some random variation to simulate terrain
    const noise = Math.random() * 30 - 15;
    
    // RGB values for normal map
    data[i] = 128 + noise; // Red (X direction)
    data[i + 1] = 128 + noise; // Green (Y direction)
    data[i + 2] = 128 + Math.abs(noise); // Blue (Z direction)
    data[i + 3] = 255; // Alpha (fully opaque)
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Save the texture
  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync(path.join(texturesDir, filename), buffer);
  
  console.log(`Generated ${filename}`);
}

// Function to generate a disc texture for particle effects
function generateDiscTexture(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Transparent background
  ctx.clearRect(0, 0, size, size);
  
  // Create radial gradient for glowing disc
  const gradient = ctx.createRadialGradient(
    size/2, size/2, 0,
    size/2, size/2, size/2
  );
  
  // Bright center fading to transparent edges
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(160, 200, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(68, 136, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 64, 128, 0.0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Save the texture
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(texturesDir, filename), buffer);
  
  console.log(`Generated ${filename}`);
}

// Generate the textures
generateEarthTexture(2048, 1024, 'earth_atmos_4k.jpg');
generateLightsTexture(2048, 1024, 'earth_lights_2048.png');
generateNormalMapTexture(2048, 1024, 'earth_normal_2k.jpg');
generateDiscTexture(64, 'disc.png');

console.log('All textures generated successfully!'); 