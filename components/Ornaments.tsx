
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

const createRenGeometry = () => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const strokeWidth = 0.18;
  const strokeDepth = 0.18;
  const strokeLength = 0.9;
  
  addBox(
    positions, normals, indices, 
    strokeWidth, strokeLength, strokeDepth, 
    -0.2, 0, 0,
    0, 0.5
  );

  addBox(
    positions, normals, indices, 
    strokeWidth, strokeLength, strokeDepth, 
    0.2, 0, 0,
    0, -0.5
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

  const geometry = useMemo(() => createRenGeometry(), []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.6,
      envMapIntensity: 1.5,
    });
  }, []);

  const data = useMemo(() => {
    const items: DualPosition[] = [];
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const treePosRaw = getCrossPosition(20, 2.5, 0.1);
      const scatterPosRaw = getSpherePosition(22);

      items.push({
        tree: treePosRaw,
        scatter: scatterPosRaw,
        rotationSpeed: (Math.random() - 0.5) * 3.0,
        phaseOffset: Math.random() * Math.PI * 2,
        scale: Math.random() * 0.4 + 0.6,
      });

      const colorHex = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const color = new THREE.Color(colorHex);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { items, colors };
  }, [count, colorPalette]);

  useLayoutEffect(() => {
    if (meshRef.current && count > 0) {
      for (let i = 0; i < count; i++) {
        meshRef.current.setColorAt(i, new THREE.Color(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]));
      }
      // instanceColor is created lazily by Three.js inside setColorAt if not present
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [count, data]);

  useFrame((state) => {
    if (!meshRef.current || count === 0) return;

    const t = state.clock.elapsedTime;
    const easeProgress = progress * progress * (3 - 2 * progress); 
    
    for (let i = 0; i < count; i++) {
      const { tree, scatter, rotationSpeed, phaseOffset, scale } = data.items[i];

      const x = THREE.MathUtils.lerp(scatter[0], tree[0], easeProgress);
      const y = THREE.MathUtils.lerp(scatter[1], tree[1], easeProgress);
      const z = THREE.MathUtils.lerp(scatter[2], tree[2], easeProgress);

      const floatAmp = (1 - easeProgress) * 0.6 + 0.02; 
      const floatY = Math.sin(t * 0.8 + phaseOffset) * floatAmp;
      const floatX = Math.cos(t * 0.5 + phaseOffset) * floatAmp * 0.5;

      tempObj.position.set(x + floatX, y + floatY, z);

      const tumbleSpeed = THREE.MathUtils.lerp(1.0, 0.1, easeProgress);
      
      const targetRotX = 0;
      const currentRotX = t * rotationSpeed * tumbleSpeed * 0.5;
      
      tempObj.rotation.x = THREE.MathUtils.lerp(currentRotX, targetRotX, easeProgress);
      tempObj.rotation.y = t * rotationSpeed * tumbleSpeed + (easeProgress * Math.PI * 2) + phaseOffset;
      tempObj.rotation.z = THREE.MathUtils.lerp(t * rotationSpeed * tumbleSpeed * 0.2, 0, easeProgress);

      const pulse = 1.0 + Math.sin(t * 2 + phaseOffset) * 0.05;
      tempObj.scale.setScalar(scale * pulse);

      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
    }
    
    if (meshRef.current.instanceMatrix) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
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
