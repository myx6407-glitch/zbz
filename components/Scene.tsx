import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { PhotoOrnaments } from './PhotoOrnaments';
import { GoldDust } from './GoldDust';
import { TreeMorphState } from '../types';

interface SceneProps {
  treeState: TreeMorphState;
  userImages: string[];
  photoScale?: number;
  onPhotoClick: (url: string) => void;
  handXRef: React.MutableRefObject<number>;
  isHandActiveRef: React.MutableRefObject<boolean>;
  isDraggingPhoto: boolean;
  setIsDraggingPhoto: (dragging: boolean) => void;
}

export const Scene: React.FC<SceneProps> = ({ 
  treeState, 
  userImages, 
  photoScale = 1.5, 
  onPhotoClick,
  handXRef,
  isHandActiveRef,
  isDraggingPhoto,
  setIsDraggingPhoto
}) => {
  const progressRef = useRef(0);
  const targetProgress = treeState === TreeMorphState.TREE_SHAPE ? 1 : 0;
  
  const groupRef = useRef<THREE.Group>(null);
  const angularVelocity = useRef(0.015); 
  const lastMouseX = useRef(0);
  const isDraggingScene = useRef(false);
  const lastHandX = useRef(0.5);

  const INITIAL_CAMERA_POS: [number, number, number] = [0, 500, 3500];
  const INITIAL_DISTANCE = Math.sqrt(INITIAL_CAMERA_POS[1] ** 2 + INITIAL_CAMERA_POS[2] ** 2);

  const handlePointerDown = (e: any) => {
    if (isDraggingPhoto) return;
    // 只有当没有点击到照片时（通过事件冒泡控制），才触发场景旋转
    isDraggingScene.current = true;
    lastMouseX.current = e.clientX;
    angularVelocity.current = 0; 
  };

  const handlePointerUp = () => {
    isDraggingScene.current = false;
  };

  const handlePointerMove = (e: any) => {
    if (isDraggingScene.current && groupRef.current && !isDraggingPhoto) {
        const deltaX = e.clientX - lastMouseX.current;
        lastMouseX.current = e.clientX;
        groupRef.current.rotation.y += deltaX * 0.0015;
        angularVelocity.current = deltaX * 0.008; 
    }
  };

  useFrame((state, delta) => {
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgress, delta * 4.0);
    
    if (groupRef.current) {
        if (isDraggingPhoto) {
            angularVelocity.current = 0;
            return;
        }

        const friction = 0.90;
        
        if (!isDraggingScene.current && isHandActiveRef.current) {
            const currentHandX = handXRef.current;
            const handDelta = currentHandX - lastHandX.current;
            angularVelocity.current -= handDelta * 1.0; 
            lastHandX.current = currentHandX;
        }

        angularVelocity.current *= friction;
        
        const idleSpeed = 0.015; 
        if (!isDraggingScene.current && !isHandActiveRef.current) {
             if (Math.abs(angularVelocity.current) < idleSpeed) {
                  angularVelocity.current = THREE.MathUtils.lerp(angularVelocity.current, idleSpeed, 0.05);
             }
        }
        
        groupRef.current.rotation.y += angularVelocity.current * delta;
    }
  });

  const hasPhotos = userImages.length > 0;

  return (
    <>
      <PerspectiveCamera makeDefault position={INITIAL_CAMERA_POS} fov={45} far={15000} />
      
      <OrbitControls 
        enabled={!isDraggingPhoto && !isHandActiveRef.current} 
        enablePan={false} 
        enableRotate={true}
        enableZoom={true}
        target={[0, 0, 0]}
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.6}
        minDistance={1000}
        maxDistance={INITIAL_DISTANCE}
        makeDefault
      />

      {/* 背景交互面：放置在更深的位置并降低渲染顺序，防止遮挡位于原点附近的坐标轴照片 */}
      <mesh 
        position={[0, 0, -2000]} 
        renderOrder={-10}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[20000, 20000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef} position={[0, 0, 0]}>
        <Foliage 
          count={15000} 
          progress={progressRef.current} 
        />
        <GoldDust />
        {hasPhotos && (
           <PhotoOrnaments 
             images={userImages} 
             progress={progressRef.current}
             globalScale={photoScale}
             onPhotoClick={onPhotoClick}
             onDragStateChange={setIsDraggingPhoto}
           />
        )}
      </group>
    </>
  );
};