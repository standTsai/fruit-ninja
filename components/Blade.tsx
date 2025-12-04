import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3, TubeGeometry, Mesh, Color, DoubleSide, BufferAttribute } from 'three';
import { BLADE_COLOR, BLADE_WIDTH } from '../constants';

interface BladeProps {
  points: Vector3[]; // Reference to the mutable array
  color?: string;
}

const Blade: React.FC<BladeProps> = ({ points, color = BLADE_COLOR }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Safety check: We need at least 2 points to define a path
    if (points.length < 2) {
      meshRef.current.visible = false;
      return;
    }

    try {
        // Create a smooth curve from the points
        const curve = new CatmullRomCurve3(points);
        
        // Settings for the tube
        const tubularSegments = Math.max(points.length * 5, 20);
        const radialSegments = 4; // 4 sides (square profile) is enough for speed

        // Create standard tube first
        const geometry = new TubeGeometry(
            curve, 
            tubularSegments,
            BLADE_WIDTH, 
            radialSegments, 
            false
        );
        
        // --- TAPER LOGIC ---
        // Manually scale vertices to create a brush/slash effect (thin at ends, thick in middle)
        const positions = geometry.attributes.position as BufferAttribute;
        const numRings = tubularSegments + 1;
        const numPointsPerRing = radialSegments + 1; // TubeGeometry creates an extra point for UV closure

        for (let i = 0; i < numRings; i++) {
            // u goes from 0 (tail) to 1 (head)
            const u = i / (numRings - 1);
            
            // Calculate scale factor using a sine window
            // 0 -> 0 width
            // 0.5 -> 1.0 width
            // 1 -> 0 width
            const scale = Math.sin(u * Math.PI);
            
            // Get the center point on the curve for this ring
            const center = curve.getPointAt(u);
            
            // Iterate through all vertices in this ring and pull them towards center
            for (let j = 0; j < numPointsPerRing; j++) {
                const idx = (i * numPointsPerRing + j) * 3;
                
                // Vector from center to current vertex position
                const vx = positions.array[idx] - center.x;
                const vy = positions.array[idx + 1] - center.y;
                const vz = positions.array[idx + 2] - center.z;
                
                // Scale the offset and re-apply relative to center
                positions.array[idx] = center.x + vx * scale;
                positions.array[idx + 1] = center.y + vy * scale;
                positions.array[idx + 2] = center.z + vz * scale;
            }
        }

        // Dispose old geometry
        if (meshRef.current.geometry) {
            meshRef.current.geometry.dispose();
        }
        
        meshRef.current.geometry = geometry;
        meshRef.current.visible = true;

    } catch (e) {
        // Fallback if curve generation fails
        meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef}>
      <meshBasicMaterial 
        color={new Color(color)} 
        transparent 
        opacity={0.9} 
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};

export default Blade;