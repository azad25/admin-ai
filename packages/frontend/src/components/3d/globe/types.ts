import * as THREE from 'three';

export interface GlobePoint {
  latitude: number;
  longitude: number;
  intensity: number;
  city?: string;
  country?: string;
}

export interface AlertData {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  position: [number, number, number];
  timestamp: number;
}

export interface DataFlow {
  id: string;
  start: GlobePoint;
  end: GlobePoint;
  progress: number;
  type: 'request' | 'response' | 'error' | 'data' | 'warning' | 'success';
  color?: string;
  speed: number;
  curve: {
    getPoint: (t: number) => THREE.Vector3;
  };
  createdAt?: number;
} 