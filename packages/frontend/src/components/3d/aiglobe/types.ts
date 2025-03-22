import * as THREE from 'three';

/**
 * Represents a point on the globe with geographical coordinates and intensity
 */
export interface GlobePoint {
  latitude: number;
  longitude: number;
  intensity: number;
  city?: string;
  country?: string;
}

/**
 * Props for the main AIGlobe component
 */
export interface AIGlobeProps {
  data: GlobePoint[];
  size?: number;
}

/**
 * Props for the Globe component
 */
export interface GlobeProps {
  data: GlobePoint[];
  size?: number;
  activePoint?: string | number | null;
  onPointClick?: (data: any) => void;
}

/**
 * Interface for curve objects used in data flows
 */
export type CurveType = THREE.CurvePath<THREE.Vector3> | {
  getPoint: (t: number) => THREE.Vector3;
};

/**
 * Props for the DataFlow component
 */
export interface DataFlowProps {
  curve: CurveType;
  color?: string;
  speed?: number;
  width?: number;
}

/**
 * Props for the PulsePoint component
 */
export interface PulsePointProps {
  position: [number, number, number];
  color?: THREE.Color | string;
  size?: number;
  pulseSpeed?: number;
  onClick?: (data: any) => void;
  isActive?: boolean;
  data?: any;
}

/**
 * Data structure for pulse points with unique ID
 */
export interface PulsePointData {
  id: number;
  position: [number, number, number];
  color: string;
}