import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const dustVertexShader = `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uHover;

  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aRandomVec;

  varying float vAlpha;

  void main() {
    vec3 pos = position;

    float t = uTime * 0.5;
    pos.y += sin(t + aPhase) * 20.0;
    pos.x += cos(t * 0.5 + aPhase) * 10.0;
    
    float d = distance(pos, uMouse);
    float attractRadius = 800.0;
    
    if (d < attractRadius && uHover > 0.5) {
        vec3 dir = normalize(uMouse - pos);
        float strength = (1.0 - d / attractRadius);
        strength = pow(strength, 2.0);
        pos += dir * strength * 200.0;
        vec3 swirl = cross(dir, vec3(0.0, 1.0, 0.0));
        pos += swirl * strength * 50.0;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (1000.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = 0.4 + 0.2 * sin(uTime * 2.0 + aPhase); 
  }
`;

const dustFragmentShader = `
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    float strength = 1.0 - (dist * 2.0);
    strength = pow(strength, 2.0);
    
    vec3 dustColor = vec3(0.2, 0.2, 0.25); 
    
    gl_FragColor = vec4(dustColor, strength * vAlpha);
  }
`;

export const GoldDust = () => {
  const count = 1000;
  const meshRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const mousePlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const mousePos3D = useRef(new THREE.Vector3(0, 0, 0));

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uHover: { value: 0 },
  }), []);

  const { positions, sizes, phases, randomVecs } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);
    const rv = new Float32Array(count * 3);
    const spread = 5000;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
      sz[i] = Math.random() * 6 + 2; 
      ph[i] = Math.random() * Math.PI * 2;
      rv[i * 3] = Math.random();
      rv[i * 3 + 1] = Math.random();
      rv[i * 3 + 2] = Math.random();
    }
    return { positions: pos, sizes: sz, phases: ph, randomVecs: rv };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    
    mousePlane.current.normal.copy(camera.position).normalize();
    raycaster.current.setFromCamera(state.pointer, camera);
    
    const target = new THREE.Vector3();
    const result = raycaster.current.ray.intersectPlane(mousePlane.current, target);
    
    if (result) {
        mousePos3D.current.lerp(target, 0.1);
        material.uniforms.uMouse.value.copy(mousePos3D.current);
        material.uniforms.uHover.value = 1.0;
    } else {
        material.uniforms.uHover.value = 0.0;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={phases.length} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aRandomVec" count={randomVecs.length / 3} array={randomVecs} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={dustVertexShader}
        fragmentShader={dustFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending} 
      />
    </points>
  );
};