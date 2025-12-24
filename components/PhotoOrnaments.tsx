
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { DualPosition } from '../types';
import { getOffAxisPosition, getSpherePosition } from '../utils/math';

interface PhotoOrnamentsProps {
  images: string[];
  progress: number; // 0 to 1
  globalScale?: number;
  onPhotoClick: (url: string) => void;
}

interface PhotoItemProps {
  url: string;
  data: DualPosition;
  progress: number;
  globalScale: number;
  onClick: (url: string) => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ url, data, progress, globalScale, onClick }) => {
  const texture = useTexture(url);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime;
    
    // Use the same smoothstep logic as the shader for perfect sync
    // 0.0 = Scattered, 1.0 = Tree Shape
    const easeProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
    const inverseEase = 1.0 - easeProgress;
    
    const { tree, scatter, rotationSpeed, phaseOffset, scale } = data;

    // 1. Position Interpolation with "Chaos" factor
    const chaosX = Math.sin(t * 0.4 + phaseOffset) * 150.0 * inverseEase;
    const chaosY = Math.cos(t * 0.3 + phaseOffset) * 150.0 * inverseEase;
    const chaosZ = Math.sin(t * 0.5 + phaseOffset * 2.0) * 150.0 * inverseEase;

    const x = THREE.MathUtils.lerp(scatter[0], tree[0], easeProgress) + chaosX;
    const y = THREE.MathUtils.lerp(scatter[1], tree[1], easeProgress) + chaosY;
    const z = THREE.MathUtils.lerp(scatter[2], tree[2], easeProgress) + chaosZ;

    // 2. Base Floaty Physics (Sync with tree/scatter state)
    const floatAmp = 20.0 + (inverseEase * 100.0); 
    const floatY = Math.sin(t * 0.8 + phaseOffset) * floatAmp;
    const floatX = Math.cos(t * 0.5 + phaseOffset) * floatAmp * 0.5;

    meshRef.current.position.set(x + floatX, y + floatY, z);

    // 3. Rotation: Tumble when scattered, Stabilize when gathered
    const currentRotX = Math.sin(t * 0.3 + phaseOffset) * (0.2 + inverseEase * 0.8);
    const currentRotY = t * rotationSpeed * (0.1 + inverseEase * 0.5) + Math.PI; 
    const currentRotZ = Math.cos(t * 0.4 + phaseOffset) * (0.1 + inverseEase * 0.8);

    meshRef.current.rotation.set(currentRotX, currentRotY, currentRotZ);

    // 4. Scale and Visuals
    const pulse = 1.0 + Math.sin(t * 1.5 + phaseOffset) * 0.05 * easeProgress;
    const scatterShrink = 0.7 + (0.3 * easeProgress); // Shrink to 70% when scattered
    const hoverScale = hovered ? 1.3 : 1.0;
    
    const finalScale = scale * pulse * globalScale * hoverScale * scatterShrink; 
    meshRef.current.scale.set(finalScale, finalScale, finalScale);
    
    // Update Material Opacity/Brightness based on state
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        // Slightly higher base opacity for better visibility
        meshRef.current.material.opacity = 0.6 + (0.4 * easeProgress); 
    }
  });

  return (
    <mesh 
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick(url);
      }}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        transparent 
        roughness={0.4}
        metalness={0.1}
        color="#cccccc" // Increased brightness from #777777 to #cccccc
        emissive={hovered ? '#ffffff' : '#000000'}
        emissiveIntensity={hovered ? 0.4 : 0}
      />
      {/* Light grey border backing, brighter than before (#444444 -> #888888) */}
      <mesh position={[0,0,-0.02]}>
         <planeGeometry args={[1.08, 1.08]} />
         <meshBasicMaterial color={hovered ? "#FFD166" : "#888888"} side={THREE.BackSide} transparent opacity={0.8} />
      </mesh>
    </mesh>
  );
};

export const PhotoOrnaments: React.FC<PhotoOrnamentsProps> = ({ images, progress, globalScale = 1.0, onPhotoClick }) => {
  const items = useMemo(() => {
    return images.map((url) => {
      // "Gathered" (Tree) state: around the coordinate axes but not on them
      const treePosRaw = getOffAxisPosition(2200, 350);
      
      // "Scattered" state: much wider distribution to match the foliage explosion
      const scatterPosRaw = getSpherePosition(4500);

      return {
        data: {
          tree: treePosRaw,
          scatter: scatterPosRaw,
          rotationSpeed: (Math.random() - 0.5) * 0.8, 
          phaseOffset: Math.random() * Math.PI * 2,
          scale: Math.random() * 50 + 80, 
        },
        url: url
      };
    });
  }, [images]);

  return (
    <group>
      {items.map((item, index) => (
        <PhotoItem 
          key={`${item.url}-${index}`}
          url={item.url} 
          data={item.data} 
          progress={progress} 
          globalScale={globalScale}
          onClick={onPhotoClick}
        />
      ))}
    </group>
  );
};
