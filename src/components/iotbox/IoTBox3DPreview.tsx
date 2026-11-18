import React, { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { useCadStore } from '../../store/useCadStore';
import {
  buildIoTBoxGeometry,
  buildIoTBoxLidGeometry,
} from '../../utils/csgBuilder';

const ParametricIoTBoxMesh: React.FC = () => {
  const iotBox = useCadStore((s) => s.iotBox);

  const boxGeometry = useMemo(() => buildIoTBoxGeometry(iotBox), [iotBox]);

  const lidGeometry = useMemo(() => {
    if (!iotBox.hasLid) return null;
    return buildIoTBoxLidGeometry(iotBox);
  }, [iotBox]);

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

  const lidY = iotBox.lidExploded ? iotBox.height + 24 : iotBox.height;

  return (
    <group>
      {/* Main Midnight / Dark Grey CSG Enclosure */}
      <mesh geometry={boxGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#1e2430"
          roughness={0.42}
          metalness={0.18}
        />
        <Edges threshold={25} color="#64748b" scale={1.001} opacity={0.55} transparent />
      </mesh>

      {/* Optional Snap-Fit Lid */}
      {lidGeometry && (
        <mesh geometry={lidGeometry} position={[0, lidY, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#262e3d"
            roughness={0.4}
            metalness={0.2}
          />
          <Edges threshold={25} color="#94a3b8" scale={1.001} opacity={0.6} transparent />
        </mesh>
      )}
    </group>
  );
};

export const IoTBox3DPreview: React.FC = () => {
  const iotBox = useCadStore((s) => s.iotBox);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#0a101f] to-slate-950 overflow-hidden">
      {/* Top-Left HUD */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-slate-100">Parametric CSG Enclosure</span>
          <span className="text-slate-400">•</span>
          <span className="text-sky-300 font-mono">
            {iotBox.length} × {iotBox.width} × {iotBox.height} mm
          </span>
          <span className="text-slate-400 font-mono">
            (Wall {iotBox.wallThickness.toFixed(1)}mm)
          </span>
        </div>
      </div>

      {/* Bottom Orientation Guide */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
        <span className="px-2 py-1 rounded bg-slate-900/85 border border-slate-800">
          Depan (+Z): OLED 0.96"
        </span>
        <span className="px-2 py-1 rounded bg-slate-900/85 border border-slate-800">
          Kanan (+X): Fan 40mm
        </span>
        <span className="px-2 py-1 rounded bg-slate-900/85 border border-slate-800">
          Kiri (-X): USB & Sensor
        </span>
      </div>

      <Canvas
        shadows
        camera={{ position: [145, 115, 155], fov: 36, near: 1, far: 2500 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060b16']} />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              form="rect"
              intensity={2.0}
              position={[0, 250, 120]}
              scale={[350, 150, 1]}
              color="#f1f5f9"
            />
            <Lightformer
              form="rect"
              intensity={1.1}
              position={[-220, 90, -140]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[250, 150, 1]}
              color="#7dd3fc"
            />
          </group>
        </Environment>

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[140, 220, 160]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-120, 100, -140]} intensity={0.6} color="#93c5fd" />

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
