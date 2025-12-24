
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const dustVertexShader = `
  uniform float uTime;
  uniform vec3 uMouse; // World position of mouse
  uniform float uHover; // 0 or 1, is mouse active

  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aRandomVec;

  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // 1. Base Floating Animation
    float t = uTime * 0.5;
    pos.y += sin(t + aPhase) * 20.0;
    pos.x += cos(t * 0.5 + aPhase) * 10.0;
    
    // 2. Mouse Attraction (Magical Effect)
    // Calculate distance to mouse target
    float d = distance(pos, uMouse);
    float attractRadius = 800.0;
    
    if (d < attractRadius && uHover > 0.5) {
        // Calculate attraction vector
        vec3 dir = normalize(uMouse - pos);
        
        // Strength increases as you get closer, but clamp it to avoid singularity
        float strength = (1.0 - d / attractRadius);
        strength = pow(strength, 2.0); // Non-linear falloff
        
        // Move towards mouse
        // Add a bit of swirl based on cross product or noise
        pos += dir * strength * 200.0;
        
        // Swirl
        vec3 swirl = cross(dir, vec3(0.0, 1.0, 0.0));
        pos += swirl * strength * 50.0;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size attenuation
    gl_PointSize = aSize * (1000.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;

    // Fade out at edges or based on animation
    vAlpha = 0.8 + 0.2 * sin(uTime * 3.0 + aPhase);
  }
`;

const dustFragmentShader = `
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;
    
    // Golden Glow
    float strength = 1.0 - (dist * 2.0);
    strength = pow(strength, 1.5); // Slightly softer falloff
    
    // Bright Gold for Black Background
    vec3 goldColor = vec3(1.0, 0.85, 0.2); 
    
    gl_FragColor = vec4(goldColor, strength * vAlpha);
  }
`;

export const GoldDust = () => {
  const count = 1500;
  const meshRef = useRef<THREE.Points>(null);
  const { size, viewport, camera } = useThree();
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
    
    // Spread dust across a large volume
    const spread = 4000;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;

      sz[i] = Math.random() * 8 + 2; // Particle size
      ph[i] = Math.random() * Math.PI * 2;
      
      rv[i * 3] = Math.random();
      rv[i * 3 + 1] = Math.random();
      rv[i * 3 + 2] = Math.random();
    }
    return { positions: pos, sizes: sz, phases: ph, randomVecs: rv };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // 1. Update Time
    meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;

    // 2. Raycast to find mouse world position on a plane facing camera
    // We update the invisible plane to always face camera
    mousePlane.current.normal.copy(camera.position).normalize();
    
    raycaster.current.setFromCamera(state.pointer, camera);
    const target = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(mousePlane.current, target);
    
    if (target) {
        // Lerp for smooth movement of the attraction point
        mousePos3D.current.lerp(target, 0.1);
        meshRef.current.material.uniforms.uMouse.value.copy(mousePos3D.current);
        meshRef.current.material.uniforms.uHover.value = 1.0;
    } else {
        meshRef.current.material.uniforms.uHover.value = 0.0;
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
        blending={THREE.AdditiveBlending} // Additive for glow
      />
    </points>
  );
};
