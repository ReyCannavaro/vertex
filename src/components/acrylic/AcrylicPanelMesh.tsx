import React, { useEffect, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { AcrylicPanel, CaseDimensions } from '../../types/cad';
import {
  buildPanelExtrudeGeometry,
  getPanelAssemblyTransform,
} from '../../utils/geometry2DTo3D';

interface AcrylicPanelMeshProps {
  panel: AcrylicPanel;
  caseDims: CaseDimensions;
  explodeAmount: number;
  isActive: boolean;
  ledEnabled: boolean;
  ledColor: string;
  onSelect: () => void;
}

export const AcrylicPanelMesh: React.FC<AcrylicPanelMeshProps> = ({
  panel,
  caseDims,
  explodeAmount,
  isActive,
  ledEnabled,
  ledColor,
  onSelect,
}) => {
  const geometry = useMemo(
    () => buildPanelExtrudeGeometry(panel, caseDims.thickness),
    [panel, caseDims.thickness]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const { position, rotation } = useMemo(
    () => getPanelAssemblyTransform(panel.id, caseDims, explodeAmount),
    [panel.id, caseDims, explodeAmount]
  );

  // Edge-lit acrylic simulation: active panel highlights bright sky/gold, others glow Ice Blue when LED is on
  const edgeColor = isActive
    ? '#38bdf8'
    : ledEnabled
      ? ledColor
      : '#64748b';

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <meshPhysicalMaterial
        color={isActive ? '#d8f4ff' : '#eaf8ff'}
        transmission={0.92}
        thickness={caseDims.thickness * 1.6}
        roughness={0.1}
        ior={1.5}
        reflectivity={0.85}
        transparent
        opacity={0.92}
        attenuationColor={ledEnabled ? ledColor : '#ffffff'}
        attenuationDistance={220}
      />
      <Edges
        threshold={22}
        color={edgeColor}
        scale={1.001}
        opacity={isActive ? 0.95 : ledEnabled ? 0.72 : 0.4}
        transparent
      />
    </mesh>
  );
};
