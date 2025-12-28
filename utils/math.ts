
import * as THREE from 'three';

/**
 * Generates a random point inside a sphere of radius R
 */
export const getSpherePosition = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; // Cubic root for uniform distribution
  const sinPhi = Math.sin(phi);
  return [
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  ];
};

/**
 * Generates a point that is distributed around axes but NOT on them
 */
export const getOffAxisPosition = (radius: number, axisThreshold: number): [number, number, number] => {
  let x, y, z;
  let attempts = 0;
  // Try to find a point that isn't too close to any main axis
  while (attempts < 100) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = (0.3 + 0.7 * Math.random()) * radius; // Don't get too close to origin either
    
    x = r * Math.sin(phi) * Math.cos(theta);
    y = r * Math.sin(phi) * Math.sin(theta);
    z = r * Math.cos(phi);

    // Distance to axes
    const distX = Math.sqrt(y * y + z * z);
    const distY = Math.sqrt(x * x + z * z);
    const distZ = Math.sqrt(x * x + y * y);

    if (distX > axisThreshold && distY > axisThreshold && distZ > axisThreshold) {
      break;
    }
    attempts++;
  }
  return [x!, y!, z!];
};

/**
 * Generates a point on a 3D Cross Structure (X, Y, Z axes)
 */
export const getCrossPosition = (
  armLength: number,
  thickness: number,
  randomness: number = 0,
  specificAxis?: number
): [number, number, number] => {
  // Select an axis: 0=X, 1=Y, 2=Z
  const axis = specificAxis !== undefined ? specificAxis : Math.floor(Math.random() * 3);
  
  // Position along the main axis (long bar)
  const longPos = (Math.random() - 0.5) * armLength;
  
  // Position perpendicular (thickness)
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * thickness;
  const t1 = Math.cos(angle) * radius;
  const t2 = Math.sin(angle) * radius;

  let x = 0, y = 0, z = 0;

  if (axis === 0) { // X-Axis Bar
    x = longPos;
    y = t1;
    z = t2;
  } else if (axis === 1) { // Y-Axis Bar
    x = t1;
    y = longPos;
    z = t2;
  } else { // Z-Axis Bar
    x = t1;
    y = t2;
    z = longPos;
  }

  // Apply slight noise
  const noiseX = (Math.random() - 0.5) * randomness;
  const noiseY = (Math.random() - 0.5) * randomness;
  const noiseZ = (Math.random() - 0.5) * randomness;

  return [x + noiseX, y + noiseY, z + noiseZ];
};

export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};
