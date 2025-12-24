
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DualPosition, OrnamentType } from '../types';
import { getCrossPosition, getSpherePosition } from '../utils/math';

interface OrnamentsProps {
  count: number;
  type?: OrnamentType; // kept for compatibility but ignored
  progress: number; // 0 to 1
  colorPalette: string[];
}

// Helper to build a single box's geometry data
const addBox = (
  positions: number[],
  normals: number[],
  indices: number[],
  w: number, h: number, d: number,
  tx: number, ty: number, tz: number,
  rx: number = 0, rz: number = 0
) => {
  // Create temp geometry to get data
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.rotateZ(rz);
  geo.rotateX(rx);
  geo.translate(tx, ty, tz);
  
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const indexAttr = geo.index;

  const baseIndex = positions.length / 3;

  if (posAttr && normAttr && indexAttr) {
    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
    }
    for (let i = 0; i < indexAttr.count; i++) {
      indices.push(baseIndex + indexAttr.getX(i));
    }
  }
};

// Create a merged geometry representing the Character "人" (Ren)
const createRenGeometry = () => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Dimensions for the strokes
  const strokeWidth = 0.18;
  const strokeDepth = 0.18;
  const strokeLength = 0.9;
  
  // 1. Left Stroke (撇) - Leaning left
  // Starts high, goes down-left
  addBox(
    positions, normals, indices, 
    strokeWidth, strokeLength, strokeDepth, 
    -0.2, 0, 0, // Position
    0, 0.5 // Rotation Z (approx 28 degrees)
  );

  // 2. Right Stroke (捺) - Leaning right
  // Starts slightly lower on the left stroke to form the junction, goes down-right
  addBox(
    positions, normals, indices, 
    strokeWidth, strokeLength, strokeDepth, 
    0.2, 0, 0, // Position
    0, -0.5 // Rotation Z
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  
  return geometry;
};

export const Ornaments: React.FC<OrnamentsProps> = ({ count, progress, colorPalette }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  // Generate Custom "Ren" Character Geometry
  const geometry = useMemo(() => createRenGeometry(), []);

  // Standard Material
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.6,
      envMapIntensity: 1.5,
    });
  }, []);

  // Generate Data
  const data = useMemo(() => {
    const items: DualPosition[] = [];
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Tree Position: Along the coordinate cross
      const treePosRaw = getCrossPosition(20, 2.5, 0.1);
      
      // Scatter Position
      const scatterPosRaw = getSpherePosition(22);

      items.push({
        tree: treePosRaw,
        scatter: scatterPosRaw,
        rotationSpeed: (Math.random() - 0.5) * 3.0,
        phaseOffset: Math.random() * Math.PI * 2,
        scale: Math.random() * 0.4 + 0.6,
      });

      // Assign color
      const colorHex = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const color = new THREE.Color(colorHex);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { items, colors };
  }, [count, colorPalette]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        meshRef.current.setColorAt(i, new THREE.Color(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]));
      }
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [count, data]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.elapsedTime;
    
    // Smooth transition logic
    const easeProgress = progress * progress * (3 - 2 * progress); 
    
    for (let i = 0; i < count; i++) {
      const { tree, scatter, rotationSpeed, phaseOffset, scale } = data.items[i];

      // Interpolate Position
      const x = THREE.MathUtils.lerp(scatter[0], tree[0], easeProgress);
      const y = THREE.MathUtils.lerp(scatter[1], tree[1], easeProgress);
      const z = THREE.MathUtils.lerp(scatter[2], tree[2], easeProgress);

      // Add floaty physics
      // Less float when assembled (structured feel)
      const floatAmp = (1 - easeProgress) * 0.6 + 0.02; 
      const floatY = Math.sin(t * 0.8 + phaseOffset) * floatAmp;
      const floatX = Math.cos(t * 0.5 + phaseOffset) * floatAmp * 0.5;

      // Adjust rotation
      // Align upright in tree mode to show the character clearly, random tumble in scatter
      tempObj.position.set(x + floatX, y + floatY, z);

      const tumbleSpeed = THREE.MathUtils.lerp(1.0, 0.1, easeProgress);
      
      // In Tree Mode (progress -> 1), orient mainly upright to be readable
      // In Scatter Mode, spin freely
      const targetRotX = 0;
      const targetRotZ = 0;
      // We keep Y rotation dynamic to face different directions
      
      const currentRotX = t * rotationSpeed * tumbleSpeed * 0.5;
      const currentRotZ = t * rotationSpeed * tumbleSpeed * 0.2;
      
      tempObj.rotation.x = THREE.MathUtils.lerp(currentRotX, targetRotX, easeProgress);
      tempObj.rotation.y = t * rotationSpeed * tumbleSpeed + (easeProgress * Math.PI * 2) + phaseOffset;
      tempObj.rotation.z = THREE.MathUtils.lerp(currentRotZ, targetRotZ, easeProgress);

      // Scale pulse
      const pulse = 1.0 + Math.sin(t * 2 + phaseOffset) * 0.05;
      tempObj.scale.setScalar(scale * pulse);

      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
};
