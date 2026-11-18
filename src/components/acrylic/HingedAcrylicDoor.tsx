import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { AcrylicPanel, CaseDimensions } from '../../types/cad';
import { buildPanelExtrudeGeometry } from '../../utils/geometry2DTo3D';

interface HingedAcrylicDoorProps {
  side: 'left' | 'right';
  panel: AcrylicPanel;
  caseDims: CaseDimensions;
  targetAngleDeg: number;
  explodeAmount: number;
  isActive: boolean;
  ledEnabled: boolean;
  ledColor: string;
  onSelect: () => void;
  onToggleDoor: () => void;
}

/**
 * Smoothly animated hinged clear acrylic front door with:
 * - Matte-black heavy-duty butterfly hinges (stationary frame leaf + barrel pin + moving door leaf + M3 screws)
 * - Sleek low-profile anodized pull handle + magnetic catch strike plate
 * - 60fps spring-damped swing animation via THREE.MathUtils.damp around the physical hinge pin axis
 */
export const HingedAcrylicDoor: React.FC<HingedAcrylicDoorProps> = ({
  side,
  panel,
  caseDims,
  targetAngleDeg,
  explodeAmount,
  isActive,
  ledEnabled,
  ledColor,
  onSelect,
  onToggleDoor,
}) => {
  const outerGroupRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const currentRadRef = useRef(0);

  const { length: L, width: W, height: H, thickness: t, legHeight: legH } = caseDims;
  const halfL = L / 2;
  const halfW = W / 2;
  const wallH = H - t;
  const doorCenterY = legH + wallH / 2;

  const isLeft = side === 'left';
  // Exact physical hinge pin axis right outside the front corner so door swings 0..135° with zero clipping
  const pivotX = isLeft ? -halfL + t - 1 : halfL - t + 1;
  const targetPivotZ = halfW + 2.2 + explodeAmount;
  const currentPivotZRef = useRef(targetPivotZ);

  // Local offset from hinge pin to door mesh center
  const meshOffsetX = isLeft ? panel.width / 2 + 1 : -panel.width / 2 - 1;
  const meshOffsetZ = -t / 2 - 2.2;

  // Hinge vertical Y offsets matching the 2D M3 laser-cut hinge holes (22% and 78% of door height)
  const topHingeY = panel.height * 0.28;
  const botHingeY = -panel.height * 0.28;
  const hingeYs = [topHingeY, botHingeY];

  // Handle X position near the opening center edge
  const handleX = isLeft ? panel.width - 19 : -panel.width + 19;

  const geometry = useMemo(
    () => buildPanelExtrudeGeometry(panel, t),
    [panel, t]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Buttery-smooth 60fps spring-damped door swing + explode Z glide animation
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // Left door swings outward by negative Y rotation; Right door swings outward by positive Y rotation
    const clampedDeg = Math.min(Math.max(0, targetAngleDeg), 135);
    const targetRad = THREE.MathUtils.degToRad(clampedDeg) * (isLeft ? -1 : 1);
    currentRadRef.current = THREE.MathUtils.damp(
      currentRadRef.current,
      targetRad,
      6.5,
      dt
    );
    if (pivotRef.current) {
      pivotRef.current.rotation.y = currentRadRef.current;
    }
    currentPivotZRef.current = THREE.MathUtils.damp(
      currentPivotZRef.current,
      targetPivotZ,
      7.5,
      dt
    );
    if (outerGroupRef.current) {
      outerGroupRef.current.position.z = currentPivotZRef.current;
    }
  });

  const edgeColor = isActive ? '#38bdf8' : ledEnabled ? ledColor : '#64748b';
  const dir = isLeft ? 1 : -1;

  return (
    <group ref={outerGroupRef} position={[pivotX, doorCenterY, currentPivotZRef.current]}>
      {/* Stationary Hinge Frame Leaves (bolted to Left / Right outer acrylic wall) & Knuckle Barrels */}
      {hingeYs.map((hy, idx) => (
        <group key={`hinge-fixed-${idx}`} position={[0, hy, 0]}>
          {/* Hinge Cylindrical Knuckle Barrel & Stainless Steel Pin */}
          <mesh>
            <cylinderGeometry args={[4.2, 4.2, 40, 16]} />
            <meshStandardMaterial color="#141820" roughness={0.42} metalness={0.35} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[2.0, 2.0, 44, 12]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.95} />
          </mesh>

          {/* Stationary Frame Leaf wrapping backward along the outer side wall */}
          <mesh position={[-dir * 4.5, 0, -14]}>
            <boxGeometry args={[4.2, 38, 22]} />
            <meshStandardMaterial color="#161b24" roughness={0.45} metalness={0.3} />
          </mesh>
          {/* 2x Stationary Side-Wall M3 Screws */}
          {[-11, 11].map((sy, si) => (
            <mesh
              key={si}
              position={[-dir * 6.8, sy, -15]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[2.1, 2.1, 1.8, 10]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Smoothly Rotating Door Pivot Assembly */}
      <group ref={pivotRef}>
        {/* Extruded Clear Acrylic Door Sheet */}
        <mesh
          geometry={geometry}
          position={[meshOffsetX, 0, meshOffsetZ]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onToggleDoor();
          }}
        >
          <meshPhysicalMaterial
            color={isActive ? '#d8f4ff' : '#eaf8ff'}
            transmission={0.92}
            thickness={t * 1.5}
            roughness={0.08}
            ior={1.5}
            reflectivity={0.88}
            transparent
            opacity={0.9}
            attenuationColor={ledEnabled ? ledColor : '#ffffff'}
            attenuationDistance={240}
          />
          <Edges
            threshold={22}
            color={edgeColor}
            scale={1.001}
            opacity={isActive ? 0.95 : ledEnabled ? 0.72 : 0.42}
            transparent
          />
        </mesh>

        {/* Moving Matte-Black Butterfly Hinge Leaves + Silver M3 Bolts mounted on the Door */}
        {hingeYs.map((hy, idx) => (
          <group key={`hinge-door-${idx}`} position={[0, hy, 0]}>
            {/* Moving Hinge Leaf */}
            <mesh position={[dir * 14, 0, 0.2]}>
              <boxGeometry args={[26, 38, 3.8]} />
              <meshStandardMaterial color="#161b24" roughness={0.45} metalness={0.3} />
            </mesh>
            {/* 2x Silver M3 Hinge Bolts aligned with 2D Laser-Cut Door Holes */}
            {[-12, 12].map((sy, si) => (
              <mesh
                key={si}
                position={[dir * 17, sy, 2.3]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[2.2, 2.2, 2.0, 12]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Sleek Low-Profile Matte-Black Server Pull Handle (click handle to swing door!) */}
        <group
          position={[handleX, 0, meshOffsetZ + t / 2]}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDoor();
          }}
        >
          {/* Top & Bottom Standoff Mounts */}
          {[-26, 26].map((hy, hi) => (
            <group key={hi} position={[0, hy, 0]}>
              <mesh position={[0, 0, 6]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[3.4, 3.8, 12, 14]} />
                <meshStandardMaterial color="#171b24" roughness={0.38} metalness={0.45} />
              </mesh>
              {/* Rear M3 Backing Screw */}
              <mesh position={[0, 0, -t - 1.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.2, 2.2, 1.8, 10]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Vertical Anodized Pull Bar with subtle chamfered grip */}
          <mesh position={[0, 0, 13.5]}>
            <boxGeometry args={[7.5, 68, 5.5]} />
            <meshStandardMaterial color="#181d27" roughness={0.35} metalness={0.5} />
          </mesh>
          {/* Subtle Ice-Blue micro-accent strip on handle face */}
          <mesh position={[0, 0, 16.5]}>
            <boxGeometry args={[2.2, 34, 0.8]} />
            <meshStandardMaterial
              color={ledEnabled ? ledColor : '#475569'}
              emissive={ledEnabled ? ledColor : '#000000'}
              emissiveIntensity={ledEnabled ? 1.2 : 0}
            />
          </mesh>
        </group>

        {/* Brushed Steel Magnetic Catch Strike Plate on interior opening edge */}
        <mesh position={[handleX, panel.height * 0.42, meshOffsetZ - t / 2 - 1.2]}>
          <boxGeometry args={[18, 10, 2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Matching White MC-38 Door Magnet Block via 3M VHB Foam Pad (Zero Drilled Holes on Front Door!) */}
        <group
          position={[
            isLeft ? panel.width - 42 : -panel.width + 42,
            panel.height / 2 - 11,
            meshOffsetZ - t / 2,
          ]}
        >
          {/* Thin Cream 3M VHB Foam Adhesive Strip glued cleanly to inside door surface */}
          <mesh position={[0, 0, -0.6]}>
            <boxGeometry args={[27, 14, 1.2]} />
            <meshStandardMaterial color="#e7e0c9" roughness={0.85} />
          </mesh>
          {/* White ABS Magnet Housing (27 × 7.5 × 8 mm) + Lower Flange Lip */}
          <mesh position={[0, 2.5, -5.0]}>
            <boxGeometry args={[27, 7.5, 7.6]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.42} />
          </mesh>
          <mesh position={[0, -3.5, -2.6]}>
            <boxGeometry args={[27, 5.5, 2.8]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.42} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
