
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getCrossPosition, getSpherePosition } from '../utils/math';

// Custom Shader Material for the Foliage
const foliageVertexShader = `
  uniform float uTime;
  uniform float uProgress; // 0.0 = scatter, 1.0 = tree
  
  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aPhase;
  attribute float aSize;
  attribute float aColorIndex; // 0 = Pink, 1 = Yellow, 2 = Blue

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // 1. Morph Position
    float t = smoothstep(0.0, 1.0, uProgress);
    
    vec3 currentPos = mix(aScatterPos, aTreePos, t);

    // 2. Add "Breathing" / Wind effect
    float breathe = sin(uTime * 2.0 + aPhase) * 0.1;
    // Reduce chaos when in coordinate shape to keep lines clean
    float chaos = cos(uTime * 0.5 + aPhase * 2.0) * 0.5 * (1.0 - t);
    
    // Slight movement along normal
    currentPos += normalize(currentPos) * breathe * 0.2;
    currentPos += chaos;

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    
    // 3. Size attenuation
    gl_PointSize = (aSize * 2.0) * (300.0 / -mvPosition.z);

    // 4. Color logic - Life Coordinates Theme (Pink, Blue, Yellow)
    // Neon colors for Black Background
    vec3 colPink = vec3(1.0, 0.0, 0.8);     // Neon Pink
    vec3 colYellow = vec3(1.0, 0.9, 0.0);   // Neon Yellow
    vec3 colBlue = vec3(0.0, 0.8, 1.0);     // Neon Cyan

    vec3 baseColor = colPink;
    if (aColorIndex > 1.5) {
        baseColor = colBlue;
    } else if (aColorIndex > 0.5) {
        baseColor = colYellow;
    }

    // Add subtle variation/twinkle
    float twinkle = sin(uTime * 3.0 + aPhase * 10.0);
    vColor = baseColor + vec3(twinkle * 0.1);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Distance fade
    vAlpha = smoothstep(0.0, 0.2, uProgress * 0.5 + 0.5); 
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    // Circular particle with soft edge
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft glowy edge
    float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * vAlpha;
    
    // Use full alpha (dimming removed)
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface FoliageProps {
  count?: number;
  progress: number; // 0 to 1
}

export const Foliage: React.FC<FoliageProps> = ({ count = 12000, progress }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  const { positions, scatterPositions, phases, sizes, colorIndices } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scat = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const sz = new Float32Array(count);
    const ci = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Cross Shape (Coordinates)
      const treeP = getCrossPosition(5000, 20, 5.0);
      pos[i * 3] = treeP[0];
      pos[i * 3 + 1] = treeP[1];
      pos[i * 3 + 2] = treeP[2];

      const scatP = getSpherePosition(2500);
      scat[i * 3] = scatP[0];
      scat[i * 3 + 1] = scatP[1];
      scat[i * 3 + 2] = scatP[2];

      ph[i] = Math.random() * Math.PI * 2;
      sz[i] = Math.random() * 25 + 15; 
      
      ci[i] = Math.floor(Math.random() * 3);
    }

    return { 
      positions: pos, 
      scatterPositions: scat, 
      phases: ph, 
      sizes: sz,
      colorIndices: ci
    };
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.uniforms.uProgress.value,
        progress,
        0.05
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={phases.length}
          array={phases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColorIndex"
          count={colorIndices.length}
          array={colorIndices}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
