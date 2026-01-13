
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getCrossPosition, getSpherePosition } from '../utils/math';

const foliageVertexShader = `
  uniform float uTime;
  uniform float uProgress; 
  
  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aPhase;
  attribute float aSize;
  attribute float aColorIndex; 

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float t = smoothstep(0.0, 1.0, uProgress);
    // 基础插值位置
    vec3 currentPos = mix(aScatterPos, aTreePos, t);

    // 爆发效果
    float explosion = smoothstep(0.8, 0.4, t) * smoothstep(0.0, 0.4, t) * 500.0;
    currentPos += normalize(aScatterPos) * explosion;

    // 动态扰动
    float breathe = sin(uTime * 1.5 + aPhase) * 6.0 * (1.2 - t);
    float chaos = cos(uTime * 0.4 + aPhase * 1.5) * 4.0 * (1.0 - t);
    currentPos += normalize(currentPos) * breathe * 0.1;
    currentPos += chaos;

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    
    // 散开时大小调整
    float sizeMultiplier = mix(1.3, 1.0, t);
    gl_PointSize = (aSize * 1.25 * sizeMultiplier) * (350.0 / -mvPosition.z);

    // 颜色重定义
    vec3 colPink = vec3(1.0, 0.5, 0.7);   // X轴 - 粉色
    vec3 colBlue = vec3(0.1, 0.6, 1.0);   // Y轴 - 蓝色
    vec3 colYellow = vec3(0.95, 0.75, 0.1); // Z轴 - 黄色

    vec3 baseColor = colPink;
    if (aColorIndex > 1.5) {
        baseColor = colYellow; // Z
    } else if (aColorIndex > 0.5) {
        baseColor = colBlue;   // Y
    }

    // 爆发时的亮度提升
    float flash = explosion * 0.002;
    float twinkle = sin(uTime * 2.5 + aPhase * 8.0) * 0.1;
    vColor = baseColor + vec3(twinkle + flash);
    
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = smoothstep(0.0, 0.1, uProgress * 0.5 + 0.5); 
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface FoliageProps {
  count?: number;
  progress: number;
}

export const Foliage: React.FC<FoliageProps> = ({ count = 15000, progress }) => {
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
      const axis = Math.floor(Math.random() * 3);
      // 这里的 axis: 0=X, 1=Y, 2=Z
      const treeP = getCrossPosition(4000, 6, 1.0, axis);
      pos[i * 3] = treeP[0];
      pos[i * 3 + 1] = treeP[1];
      pos[i * 3 + 2] = treeP[2];

      const scatP = getSpherePosition(3000);
      scat[i * 3] = scatP[0];
      scat[i * 3 + 1] = scatP[1];
      scat[i * 3 + 2] = scatP[2];

      ph[i] = Math.random() * Math.PI * 2;
      sz[i] = Math.random() * 12 + 8; 
      
      // 传递对应的颜色索引
      ci[i] = axis * 1.0; 
    }

    return { positions: pos, scatterPositions: scat, phases: ph, sizes: sz, colorIndices: ci };
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.uniforms.uProgress.value,
        progress,
        0.08
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aTreePos" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScatterPos" count={scatterPositions.length / 3} array={scatterPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aPhase" count={phases.length} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aColorIndex" count={colorIndices.length} array={colorIndices} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};
