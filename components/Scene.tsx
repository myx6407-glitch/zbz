
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment } from '@react-three/drei';
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
}

export const Scene: React.FC<SceneProps> = ({ 
  treeState, 
  userImages, 
  photoScale = 1.5, 
  onPhotoClick,
  handXRef,
  isHandActiveRef
}) => {
  // Animation progress state (0 to 1)
  const progressRef = useRef(0);
  const targetProgress = treeState === TreeMorphState.TREE_SHAPE ? 1 : 0;
  
  // Inertia Rotation Refs
  const groupRef = useRef<THREE.Group>(null);
  const angularVelocity = useRef(0.2); // Initial auto-spin speed
  const lastMouseX = useRef(0);
  const isDragging = useRef(false);
  const dragStartTime = useRef(0);

  // For hand tracking delta logic
  const lastHandX = useRef(0.5);

  // Helper to handle pointer events for custom rotation
  const handlePointerDown = (e: THREE.Event) => {
    isDragging.current = true;
    lastMouseX.current = e.clientX;
    dragStartTime.current = Date.now();
    angularVelocity.current = 0; 
    e.stopPropagation(); 
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerMove = (e: THREE.Event) => {
    if (isDragging.current && groupRef.current) {
        const deltaX = e.clientX - lastMouseX.current;
        lastMouseX.current = e.clientX;
        groupRef.current.rotation.y += deltaX * 0.005;
        angularVelocity.current = deltaX * 0.05; 
    }
  };

  useFrame((state, delta) => {
    // 1. Morph Progress Logic
    const speed = 1.2;
    const diff = targetProgress - progressRef.current;
    
    if (Math.abs(diff) > 0.001) {
        progressRef.current += diff * speed * delta;
    } else {
        progressRef.current = targetProgress;
    }
    
    // 2. Camera Gentle Float
    const t = state.clock.elapsedTime;
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 4 + Math.sin(t * 0.2) * 2, 0.01);

    // 3. Inertia Rotation Logic
    if (groupRef.current) {
        if (isDragging.current) {
            // Handled in handlePointerMove
        } else if (isHandActiveRef.current) {
            // Hand Gesture Rotation logic:
            // Calculate delta of hand movement
            const currentHandX = handXRef.current;
            const handDelta = currentHandX - lastHandX.current;
            
            // Add to velocity based on hand movement speed
            // Factor of 10.0 for responsiveness
            angularVelocity.current += handDelta * 15.0;
            
            // Map absolute hand position to additional bias speed (joystick style)
            // If hand is far right (X > 0.7), rotate right. If far left (X < 0.3), rotate left.
            const centerBias = (currentHandX - 0.5);
            if (Math.abs(centerBias) > 0.2) {
                angularVelocity.current += centerBias * 0.1;
            }

            lastHandX.current = currentHandX;
        }

        // Apply friction and basic spin
        const friction = 0.96;
        angularVelocity.current *= friction;
        
        // Idle spin if nothing is acting on it
        const idleSpeed = 0.05;
        if (!isDragging.current && !isHandActiveRef.current) {
             if (Math.abs(angularVelocity.current) < idleSpeed) {
                  angularVelocity.current = THREE.MathUtils.lerp(angularVelocity.current, idleSpeed, 0.05);
             }
             lastHandX.current = handXRef.current; // sync hand pos tracker
        }

        groupRef.current.rotation.y += angularVelocity.current * delta;
    }
  });

  const hasPhotos = userImages.length > 0;

  return (
    <>
      <color attach="background" args={['#000000']} />
      
      <PerspectiveCamera makeDefault position={[800, 600, 1500]} fov={45} far={15000} />
      
      <OrbitControls 
        enablePan={false} 
        enableRotate={true}
        enableZoom={true}
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={100}
        maxDistance={8000}
        minAzimuthAngle={0} 
        maxAzimuthAngle={0} 
      />

      <mesh 
        position={[0, 0, 0]} 
        visible={false} 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[10000, 10000]} />
      </mesh>

      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight 
        position={[500, 1000, 500]} 
        intensity={0.8} 
        color="#fffcf5" 
      />
      <Environment preset="city" environmentIntensity={0.5} />

      <group ref={groupRef} position={[0, 0, 0]}>
        <Foliage 
          count={12000} 
          progress={progressRef.current} 
        />

        <GoldDust />

        {hasPhotos && (
           <PhotoOrnaments 
             images={userImages} 
             progress={progressRef.current}
             globalScale={photoScale}
             onPhotoClick={onPhotoClick}
           />
        )}
      </group>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={0.8} 
          radius={0.6} 
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};
