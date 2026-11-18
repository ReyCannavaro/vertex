import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { ArrowUpFromLine } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import {
  buildIoTBoxGeometry,
  buildIoTBoxLidGeometry,
  getFaceplateScrewOffsets,
} from '../../utils/csgBuilder';
import { createOledScreenTexture } from '../acrylic/HardwareMockup';

const GlowingPodFan: React.FC<{ radius: number; position: [number, number, number] }> = ({
  radius,
  position,
}) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z -= delta * 8;
    }
  });

  return (
    <group position={position}>
      {/* Subtle cyan interior fan backlight */}
      <pointLight color="#38bdf8" intensity={1800} distance={110} decay={2} />
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.28, radius * 0.28, 7, 20]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.5} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => {
          const angle = (i / 7) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, 0, angle]}>
              <mesh position={[radius * 0.56, 0, 0]} rotation={[0.42, 0, 0]}>
                <boxGeometry args={[radius * 0.65, radius * 0.22, 2]} />
                <meshStandardMaterial
                  color="#7dd3fc"
                  emissive="#38bdf8"
                  emissiveIntensity={1.8}
                  roughness={0.2}
                  transparent
                  opacity={0.88}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

const ParametricIoTBoxMesh: React.FC = () => {
  const iotBox = useCadStore((s) => s.iotBox);

  const boxGeometry = useMemo(() => buildIoTBoxGeometry(iotBox), [iotBox]);

  const lidGeometry = useMemo(() => {
    if (!iotBox.hasLid) return null;
    return buildIoTBoxLidGeometry(iotBox);
  }, [iotBox]);

  const oledTex = useMemo(() => createOledScreenTexture(), []);
  const screwOffsets = useMemo(() => getFaceplateScrewOffsets(iotBox), [iotBox]);

  useEffect(() => {
    return () => {
      boxGeometry.dispose();
    };
  }, [boxGeometry]);

  useEffect(() => {
    return () => {
      lidGeometry?.dispose();
    };
  }, [lidGeometry]);

  // Faceplate Z aligns cleanly flush with front of the rounded pod housing
  const lidBaseZ = iotBox.width / 2 - iotBox.wallThickness / 2;
  const lidZ = iotBox.lidExploded ? lidBaseZ + 32 : lidBaseZ;
  const centerY = iotBox.height / 2;

  const fanMaxDia = Math.min(iotBox.length, iotBox.height) - iotBox.wallThickness * 2 - 10;
  const targetFanR =
    iotBox.fanSize === 140
      ? 65
      : iotBox.fanSize === 120
        ? 55
        : iotBox.fanSize === 80
          ? 36
          : 17.5;
  const fanRadius = Math.max(11, Math.min(targetFanR, fanMaxDia / 2 - 1));

  return (
    <group>
      {/* Main Midnight Matte-Black Rounded Pod Housing */}
      <mesh geometry={boxGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#171b23"
          roughness={0.48}
          metalness={0.18}
        />
        <Edges threshold={28} color="#475569" scale={1.001} opacity={0.45} transparent />
      </mesh>

      {/* Matching Rounded Front Faceplate + Visual Hardware */}
      {lidGeometry && (
        <group position={[0, 0, lidZ]}>
          <mesh geometry={lidGeometry} castShadow receiveShadow>
            <meshStandardMaterial
              color="#1c212b"
              roughness={0.44}
              metalness={0.2}
            />
            <Edges threshold={28} color="#64748b" scale={1.001} opacity={0.5} transparent />
          </mesh>

          {/* Visual-Only Metallic Corner M3 Screws (not exported in STL) */}
          {iotBox.showVisualHardware &&
            screwOffsets.map(([sx, sy], i) => (
              <mesh
                key={`screw-${i}`}
                position={[sx, centerY + sy, iotBox.wallThickness / 2 + 0.6]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[2.3, 2.3, 1.4, 14]} />
                <meshStandardMaterial
                  color="#cbd5e1"
                  metalness={0.92}
                  roughness={0.22}
                />
              </mesh>
            ))}

          {/* Visual-Only Live Simulated 0.96" Ice Blue OLED Display */}
          {iotBox.showVisualHardware && iotBox.hasOled && (
            <group position={[0, centerY, -iotBox.wallThickness / 2 - 1.2]}>
              {/* OLED PCB backing */}
              <mesh position={[0, 0, -1.2]}>
                <boxGeometry args={[27.5, 27.5, 1.8]} />
                <meshStandardMaterial color="#0f2942" roughness={0.6} />
              </mesh>
              {/* Glowing Ice Blue Active Screen */}
              <mesh position={[0, 0, 0.2]}>
                <planeGeometry args={[25.5, 13.5]} />
                <meshStandardMaterial
                  map={oledTex}
                  emissiveMap={oledTex}
                  emissive="#A0E6FF"
                  emissiveIntensity={1.65}
                  roughness={0.15}
                />
              </mesh>
            </group>
          )}

          {/* Visual-Only Glowing Cyan Fan Rotor inside Fan Pod */}
          {iotBox.showVisualHardware && iotBox.hasFan40 && (
            <GlowingPodFan
              radius={fanRadius}
              position={[0, centerY, -iotBox.wallThickness / 2 - 8]}
            />
          )}
        </group>
      )}
    </group>
  );
};

export const IoTBox3DPreview: React.FC = () => {
  const iotBox = useCadStore((s) => s.iotBox);
  const updateIoTBox = useCadStore((s) => s.updateIoTBox);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#080f1e] to-slate-950 overflow-hidden">
      {/* Top-Left HUD */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-slate-100">Midnight Parametric Pod (CSG)</span>
          <span className="text-slate-400">•</span>
          <span className="text-sky-300 font-mono">
            {iotBox.length} × {iotBox.height} × {iotBox.width} mm
          </span>
          <span className="text-slate-400 font-mono">
            (R{iotBox.cornerRadius} • Wall {iotBox.wallThickness.toFixed(1)}mm)
          </span>
        </div>
      </div>

      {/* Top-Right Quick Explode Faceplate Toggle */}
      {iotBox.hasLid && (
        <div className="absolute top-3 right-3 z-10 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={() => updateIoTBox({ lidExploded: !iotBox.lidExploded })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              iotBox.lidExploded
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>{iotBox.lidExploded ? 'Tutup Faceplate' : 'Buka Faceplate (Intip CSG)'}</span>
          </button>
        </div>
      )}

      {/* Bottom Orientation Guide */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
        <span className="px-2 py-1 rounded bg-slate-900/85 border border-slate-800">
          Depan (+Z): Faceplate + OLED / Fan
        </span>
        <span className="px-2 py-1 rounded bg-slate-900/85 border border-slate-800">
          Kiri/Kanan (±X): Kisi Louver Ventilasi
        </span>
        <span className="px-2 py-1 rounded bg-slate-900/85 border border-slate-800">
          Belakang (-Z): 4× Baut Dinding Akrilik
        </span>
      </div>

      <Canvas
        shadows
        camera={{ position: [125, 95, 165], fov: 35, near: 1, far: 2500 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060b16']} />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              form="rect"
              intensity={2.4}
              position={[0, 260, 140]}
              scale={[360, 160, 1]}
              color="#f8fafc"
            />
            <Lightformer
              form="rect"
              intensity={1.3}
              position={[-220, 100, -140]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[260, 160, 1]}
              color="#7dd3fc"
            />
            <Lightformer
              form="rect"
              intensity={1.0}
              position={[220, 80, 120]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[240, 150, 1]}
              color="#bae6fd"
            />
          </group>
        </Environment>

        <ambientLight intensity={0.48} />
        <directionalLight
          position={[140, 220, 180]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-130, 110, -140]} intensity={0.65} color="#93c5fd" />

        <ParametricIoTBoxMesh />

        {/* 3D Print Bed Reference Grid (10mm minor / 50mm major) */}
        <Grid
          position={[0, -0.2, 0]}
          args={[400, 400]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={500}
          infiniteGrid
        />

        <OrbitControls
          makeDefault
          target={[0, iotBox.height * 0.5, 0]}
          minDistance={55}
          maxDistance={600}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
