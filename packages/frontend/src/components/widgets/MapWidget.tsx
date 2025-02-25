import { Box, Typography, CircularProgress } from '@mui/material';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';

interface MapWidgetProps {
  config: {
    center: {
      lat: number;
      lng: number;
    };
    zoom: number;
    markers?: Array<{
      id: string;
      position: {
        lat: number;
        lng: number;
      };
      title?: string;
    }>;
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

export default function MapWidget({ config }: MapWidgetProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  if (loadError) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={300}
        bgcolor="background.paper"
        borderRadius={1}
      >
        <Typography color="error">Error loading map</Typography>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={300}
        bgcolor="background.paper"
        borderRadius={1}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box borderRadius={1} overflow="hidden">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={config.center}
        zoom={config.zoom}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {config.markers?.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            title={marker.title}
          />
        ))}
      </GoogleMap>
    </Box>
  );
} 