import React, { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color } from 'three';
import { Particle } from '../types';

interface SplatterProps {
  particle: Particle;
}

const Splatter: React.FC<SplatterProps> = ({ particle }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.copy(particle.position);
      meshRef.current.scale.setScalar(particle.size * particle.life); // Shrink as it dies
      meshRef.current.lookAt(state.camera.position); // Billboarding
    }
  });

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[0.5, 8]} />
      <meshBasicMaterial color={particle.color} transparent opacity={particle.life} depthWrite={false} />
    </mesh>
  );
};

export default Splatter;
