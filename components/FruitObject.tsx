import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, DoubleSide } from 'three';
import { Entity, FruitType } from '../types';
import { FRUIT_CONFIG } from '../constants';

interface FruitObjectProps {
  entity: Entity;
}

const FruitObject: React.FC<FruitObjectProps> = ({ entity }) => {
  const groupRef = useRef<Group>(null);
  const leftHalfRef = useRef<Group>(null);
  const rightHalfRef = useRef<Group>(null);
  const bombLightRef = useRef<any>(null); // Use any for mesh ref to access material
  
  const config = FRUIT_CONFIG[entity.type];

  // Calculate the split plane vector
  const splitDir = useMemo(() => {
    if (entity.sliceDirection.length() === 0) return new Vector3(1, 0, 0);
    return entity.sliceDirection.clone().normalize().cross(new Vector3(0, 0, 1)).normalize();
  }, [entity.sliceDirection]);

  // Calculate rotation to align the split with the cut
  const splitRotationZ = useMemo(() => {
     return Math.atan2(entity.sliceDirection.y, entity.sliceDirection.x);
  }, [entity.sliceDirection]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (!entity.isSliced) {
        // Normal falling physics
        groupRef.current.position.copy(entity.position);
        groupRef.current.rotation.x += entity.rotationSpeed.x * delta;
        groupRef.current.rotation.y += entity.rotationSpeed.y * delta;
      } else {
        // Sliced Physics
        groupRef.current.position.copy(entity.position);
        
        const separationSpeed = 2.5;
        const rotationSpeed = 2.0;

        if (leftHalfRef.current && rightHalfRef.current) {
          leftHalfRef.current.position.x -= separationSpeed * delta;
          rightHalfRef.current.position.x += separationSpeed * delta;
          
          leftHalfRef.current.rotation.z -= rotationSpeed * delta;
          rightHalfRef.current.rotation.z += rotationSpeed * delta;
        }
      }
    }

    // Bomb pulsing effect
    if (entity.type === FruitType.BOMB && bombLightRef.current && !entity.isSliced) {
        const pulse = (Math.sin(state.clock.elapsedTime * 15) + 1) * 0.5; // Fast pulse
        bombLightRef.current.material.color.setHSL(0, 1, 0.5 + pulse * 0.5);
        bombLightRef.current.material.emissiveIntensity = 0.5 + pulse;
    }
  });

  // --- Visual Details ---
  const Seeds = () => {
    if (entity.type !== FruitType.WATERMELON) return null;
    const seeds = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = 0.4;
        seeds.push(
            <mesh key={i} position={[Math.cos(angle) * r, Math.sin(angle) * r, 0.02]} rotation={[0,0,angle]}>
                <capsuleGeometry args={[0.04, 0.1, 4, 8]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
        );
    }
    return <group>{seeds}</group>;
  };

  const Segments = () => {
      if (entity.type !== FruitType.ORANGE && entity.type !== FruitType.LEMON) return null;
      const segments = [];
      for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          segments.push(
              <mesh key={i} position={[0,0,0.01]} rotation={[0,0,angle]}>
                  <planeGeometry args={[0.02, 1.8]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={DoubleSide} />
              </mesh>
          );
      }
      return <group>{segments}</group>;
  };

  const FruitCap = () => (
      <group>
          {/* Flesh */}
          <mesh>
             <circleGeometry args={[0.95, 32]} />
             <meshStandardMaterial color={config.color} side={DoubleSide} roughness={0.3} metalness={0.1} />
          </mesh>
          {/* Details */}
          <Seeds />
          <Segments />
          {/* Inner Rind (Pith) for Citrus/Watermelon */}
          <mesh position={[0,0,-0.01]}>
             <ringGeometry args={[0.92, 1, 32]} />
             <meshStandardMaterial color={entity.type === FruitType.WATERMELON ? '#ccffcc' : '#ffffee'} side={DoubleSide} />
          </mesh>
      </group>
  );

  const FruitHalf = ({ isRight = false }) => (
    <group>
        {/* Rind (Half Sphere) */}
        <mesh rotation={[0, 0, isRight ? 0 : Math.PI]}>
            <sphereGeometry args={[1, 32, 16, 0, Math.PI]} />
            <meshStandardMaterial color={config.rind} side={DoubleSide} roughness={0.6} />
        </mesh>
        {/* Cut Face */}
        <mesh rotation={[0, 0, isRight ? 0 : Math.PI]}>
             <FruitCap />
        </mesh>
    </group>
  );

  if (entity.type === FruitType.BOMB) {
     if (entity.isSliced) return null;
     return (
        <group ref={groupRef} scale={entity.scale} position={entity.position}>
          {/* Bomb Body */}
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="#1f1f1f" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Fuse Holder */}
          <mesh position={[0, 1, 0]}>
             <cylinderGeometry args={[0.15, 0.15, 0.3]} />
             <meshStandardMaterial color="#444" />
          </mesh>
          {/* Fuse Cord */}
          <mesh position={[0, 1.3, 0]} rotation={[0.2,0,0]}>
             <cylinderGeometry args={[0.04, 0.04, 0.6]} />
             <meshStandardMaterial color="#cba171" />
          </mesh>
          {/* Glowing Tip */}
          <mesh ref={bombLightRef} position={[0, 1.6, 0.1]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
          </mesh>
        </group>
     )
  }

  if (entity.isSliced) {
    return (
      <group ref={groupRef} scale={entity.scale}>
        <group rotation={[0, 0, splitRotationZ]}>
            <group ref={leftHalfRef}>
                <FruitHalf isRight={false} />
            </group>
            <group ref={rightHalfRef}>
                <FruitHalf isRight={true} />
            </group>
        </group>
      </group>
    );
  }

  // Whole Fruit
  return (
    <group ref={groupRef} scale={entity.scale}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={config.rind} roughness={0.5} />
      </mesh>
    </group>
  );
};

export default FruitObject;