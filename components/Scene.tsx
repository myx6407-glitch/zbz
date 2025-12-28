
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
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
  const angularVelocity = useRef(0.015); // 初始怠速更慢
  const lastMouseX = useRef(0);
  const isDraggingScene = useRef(false);
  const lastHandX = useRef(0.5);

  const INITIAL_CAMERA_POS: [number, number, number] = [0, 500, 3500];
  const INITIAL_DISTANCE = Math.sqrt(INITIAL_CAMERA_POS[1] ** 2 + INITIAL_CAMERA_POS[2] ** 2);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isDraggingPhoto) return;
    isDraggingScene.current = true;
    lastMouseX.current = e.clientX;
    angularVelocity.current = 0; 
    e.stopPropagation(); 
  };

  const handlePointerUp = () => {
    isDraggingScene.current = false;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isDraggingScene.current && groupRef.current && !isDraggingPhoto) {
        const deltaX = e.clientX - lastMouseX.current;
        lastMouseX.current = e.clientX;
        // 降低灵敏度
        groupRef.current.rotation.y += deltaX * 0.0015;
        // 极大幅度减小惯性速度增量，防止转速太快
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

        // 进一步增大摩擦系数 (0.92 -> 0.9)，让转动停止得更稳重
        const friction = 0.90;
        
        if (!isDraggingScene.current && isHandActiveRef.current) {
            const currentHandX = handXRef.current;
            const handDelta = currentHandX - lastHandX.current;
            // 降低手势响应速度
            angularVelocity.current -= handDelta * 1.0; 
            lastHandX.current = currentHandX;
        }

        angularVelocity.current *= friction;
        
        const idleSpeed = 0.015; // 基础怠速
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

      {/* Background interaction catcher */}
      <mesh 
        position={[0, 0, 0]} 
        visible={false} 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[15000, 15000]} />
      </mesh>

      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight position={[200, 1000, 200]} intensity={0.8} color="#ffffff" />

      <Environment resolution={256}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Lightformer form="rect" intensity={3} position={[0, 0, 10]} scale={[10, 10, 1]} />
          <Lightformer form="ring" intensity={2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        </group>
      </Environment>

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

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.9} mipmapBlur intensity={0.4} radius={0.3} />
        <Vignette eskil={false} offset={0.05} darkness={0.15} />
      </EffectComposer>
    </>
  );
};
