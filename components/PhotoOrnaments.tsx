
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { useTexture as useDreiTexture } from '@react-three/drei';
import { DualPosition } from '../types';
import { getOffAxisPosition, getSpherePosition } from '../utils/math';

interface PhotoOrnamentsProps {
  images: string[];
  progress: number; // 0 to 1
  globalScale?: number;
  onPhotoClick: (url: string) => void;
  onDragStateChange: (isDragging: boolean) => void;
}

interface PhotoItemProps {
  url: string;
  data: DualPosition;
  progress: number;
  globalScale: number;
  onClick: (url: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ url, data, progress, globalScale, onClick, onDragStart, onDragEnd }) => {
  const texture = useDreiTexture(url);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const { camera, raycaster, pointer } = useThree();
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const dragOffset = useMemo(() => new THREE.Vector3(), []);
  
  const targetPos = useMemo(() => new THREE.Vector3(), []);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!meshRef.current) return;
    
    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);
    
    const normal = new THREE.Vector3().copy(camera.position).sub(worldPos).normalize();
    dragPlane.setFromNormalAndCoplanarPoint(normal, worldPos);
    
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      dragOffset.copy(worldPos).sub(intersection);
    }
    
    setIsDragging(true);
    onDragStart();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !meshRef.current || !meshRef.current.parent) return;
    e.stopPropagation();
    
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      const worldTarget = intersection.clone().add(dragOffset);
      const localTarget = meshRef.current.parent.worldToLocal(worldTarget);
      data.tree = [localTarget.x, localTarget.y, localTarget.z];
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragEnd();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(url);
  };

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const easeProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
    const inverseEase = 1.0 - easeProgress;
    const { tree, scatter, phaseOffset, scale } = data;

    const chaosX = Math.sin(t * 0.4 + phaseOffset) * 150.0 * inverseEase;
    const chaosY = Math.cos(t * 0.3 + phaseOffset) * 150.0 * inverseEase;
    const chaosZ = Math.sin(t * 0.5 + phaseOffset * 2.0) * 150.0 * inverseEase;

    const baseTargetX = THREE.MathUtils.lerp(scatter[0], tree[0], easeProgress) + chaosX;
    const baseTargetY = THREE.MathUtils.lerp(scatter[1], tree[1], easeProgress) + chaosY;
    const baseTargetZ = THREE.MathUtils.lerp(scatter[2], tree[2], easeProgress) + chaosZ;

    const floatFactor = isDragging ? 0 : 1.0;
    const floatAmp = (15.0 + (inverseEase * 60.0)) * floatFactor; 
    const floatY = Math.sin(t * 0.8 + phaseOffset) * floatAmp;
    const floatX = Math.cos(t * 0.5 + phaseOffset) * floatAmp * 0.5;

    targetPos.set(baseTargetX + floatX, baseTargetY + floatY, baseTargetZ);
    const lerpRate = isDragging ? 0.3 : 0.08; 
    meshRef.current.position.lerp(targetPos, lerpRate);
    meshRef.current.lookAt(camera.position);

    const pulse = 1.0 + Math.sin(t * 1.5 + phaseOffset) * 0.04 * easeProgress;
    const feedbackScale = (hovered || isDragging) ? 1.4 : 1.0;
    const targetScaleValue = scale * pulse * globalScale * feedbackScale; 
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScaleValue, 0.15));
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.opacity = THREE.MathUtils.lerp(meshRef.current.material.opacity, isDragging ? 1 : 0.9, 0.1);
    }
  });

  return (
    <mesh 
      ref={meshRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        transparent 
        roughness={0.4}
        metalness={0.1}
        emissive={'#000000'}
        emissiveIntensity={0}
      />
    </mesh>
  );
};

export const PhotoOrnaments: React.FC<PhotoOrnamentsProps> = ({ images, progress, globalScale = 1.0, onPhotoClick, onDragStateChange }) => {
  const [photoData, setPhotoData] = useState<{url: string, data: DualPosition}[]>([]);

  useEffect(() => {
    setPhotoData(prev => {
      const existingUrls = prev.map(p => p.url);
      const newImages = images.filter(url => !existingUrls.includes(url));
      const newItems = newImages.map(url => ({
        url,
        data: {
          tree: getOffAxisPosition(2200, 350),
          scatter: getSpherePosition(4500),
          rotationSpeed: 0,
          phaseOffset: Math.random() * Math.PI * 2,
          scale: 110,
        }
      }));
      return [...prev.filter(p => images.includes(p.url)), ...newItems];
    });
  }, [images]);

  return (
    <group>
      {photoData.map((item, index) => (
        <PhotoItem 
          key={`${item.url}-${index}`}
          url={item.url} 
          data={item.data} 
          progress={progress} 
          globalScale={globalScale}
          onClick={onPhotoClick}
          onDragStart={() => onDragStateChange(true)}
          onDragEnd={() => onDragStateChange(false)}
        />
      ))}
    </group>
  );
};
