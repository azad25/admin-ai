import React, { useState, useEffect } from 'react';
import { AIGlobe } from './aiglobe/AIGlobe';
import { Box, Button, Typography, Paper, List, ListItem, CircularProgress, Alert } from '@mui/material';
import * as THREE from 'three';

export const TestGlobe: React.FC = () => {
  // Sample globe data
  const globeData = [
    { latitude: 37.7749, longitude: -122.4194, intensity: 0.8, city: "San Francisco", country: "USA" },
    { latitude: 40.7128, longitude: -74.0060, intensity: 0.9, city: "New York", country: "USA" },
    { latitude: 51.5074, longitude: -0.1278, intensity: 0.7, city: "London", country: "UK" },
    { latitude: 35.6762, longitude: 139.6503, intensity: 0.6, city: "Tokyo", country: "Japan" },
    { latitude: -33.8688, longitude: 151.2093, intensity: 0.5, city: "Sydney", country: "Australia" }
  ];

  const [textureStatus, setTextureStatus] = useState<Record<string, { loaded: boolean, error: string | null }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);

  // Test texture loading
  useEffect(() => {
    const texturePaths = [
      '/assets/textures/earth_daymap.jpg',
      '/assets/textures/earth_nightmap.jpg',
      '/assets/textures/earth_bumpmap.jpg',
      '/assets/textures/earth_specular.jpg',
      '/assets/textures/earth_clouds.jpg',
      '/assets/textures/earth_atmos_4k.jpg',
      '/assets/textures/earth_lights_2048.png',
      '/assets/textures/earth_normal_2k.jpg',
      '/assets/textures/disc.png'
    ];

    const loader = new THREE.TextureLoader();
    const results: Record<string, { loaded: boolean, error: string | null }> = {};

    // Set crossOrigin to anonymous to handle CORS issues
    loader.setCrossOrigin('anonymous');

    Promise.all(
      texturePaths.map(path => {
        return new Promise<void>(resolve => {
          try {
            loader.load(
              path,
              (texture) => {
                // Set texture properties for better quality and performance
                texture.anisotropy = 16;
                texture.colorSpace = THREE.SRGBColorSpace;
                results[path] = { loaded: true, error: null };
                resolve();
              },
              undefined,
              (error: any) => {
                console.warn(`Failed to load texture: ${path}`, error);
                results[path] = { loaded: false, error: error.message || 'Unknown error' };
                resolve();
              }
            );
          } catch (err) {
            console.error(`Exception loading texture: ${path}`, err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            results[path] = { loaded: false, error: errorMessage };
            resolve();
          }
        });
      })
    ).then(() => {
      setTextureStatus(results);
      setIsLoading(false);
      
      // Check if any textures failed to load
      const hasFailedTextures = Object.values(results).some(status => !status.loaded);
      setHasErrors(hasFailedTextures);
    });
  }, []);

  const handleRefreshTextures = () => {
    window.location.reload();
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>Globe Component Debugging</Typography>
      
      {hasErrors && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some textures failed to load. The globe might not render correctly.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Globe container */}
        <Box sx={{ width: '60%', minWidth: 400, height: 500, border: '1px solid #ccc' }}>
          <AIGlobe data={globeData} size={500} />
        </Box>
        
        {/* Debug information */}
        <Paper sx={{ p: 2, width: '35%', minWidth: 300, maxHeight: 500, overflow: 'auto' }}>
          <Typography variant="h6">Texture Loading Status</Typography>
          <Button 
            variant="contained" 
            onClick={handleRefreshTextures}
            sx={{ my: 1 }}
          >
            Refresh Page
          </Button>

          {/* Public path detection */}
          <Box sx={{ mt: 2, mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2">Public Path Test:</Typography>
            <Typography variant="caption" display="block">
              Path: {window.location.origin}
            </Typography>
            <Typography variant="caption" display="block">
              Full texture path example: {window.location.origin + '/assets/textures/earth_daymap.jpg'}
            </Typography>
            <Button 
              size="small"
              variant="outlined"
              onClick={() => window.open(window.location.origin + '/assets/textures/earth_daymap.jpg', '_blank')}
              sx={{ mt: 1, fontSize: '0.7rem' }}
            >
              Try Open Texture
            </Button>
          </Box>
          
          {isLoading ? (
            <Box display="flex" alignItems="center" my={2}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography>Testing texture loading...</Typography>
            </Box>
          ) : (
            <List dense>
              {Object.entries(textureStatus).map(([path, status]) => (
                <ListItem key={path} sx={{ 
                  borderLeft: `4px solid ${status.loaded ? 'green' : 'red'}`,
                  pl: 2,
                  mb: 1
                }}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {path.split('/').pop()}
                      </Typography>
                      <Button 
                        size="small" 
                        variant="text" 
                        onClick={() => window.open(window.location.origin + path, '_blank')}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        View
                      </Button>
                    </Box>
                    <Typography variant="caption" sx={{ color: status.loaded ? 'green' : 'red' }}>
                      {status.loaded ? 'Loaded successfully' : `Error: ${status.error}`}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Browser Information:</Typography>
          <Typography variant="caption" display="block">
            User Agent: {navigator.userAgent}
          </Typography>
          <Typography variant="caption" display="block">
            WebGL Supported: {typeof document !== 'undefined' && document.createElement('canvas').getContext('webgl') ? 'Yes' : 'No'}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default TestGlobe; 