import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Layers, Sparkles } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicPanel } from '../../types/cad';
import { AcrylicPanelMesh } from './AcrylicPanelMesh';

/**
 * Renders 8 internal corner cube L-brackets + 4 middle-tray brass standoffs
 * so the user clearly sees the physical M3 mechanical construction.
 */
const CornerBrackets: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const middleEnabled = useCadStore((s) => s.panels.middle.enabled);

  const cornerPositions = useMemo(() => {
    const { length: L, width: W, height: H, thickness: t } = dims;
    const cubeSize = 14;
    const ox = L / 2 - t - cubeSize / 2;
    const oz = W / 2 - t - cubeSize / 2;
    const yBottom = t + cubeSize / 2;
    const yTop = H - t - cubeSize / 2;

    const coords: [number, number, number][] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        coords.push([sx * ox, yBottom, sz * oz]);
        coords.push([sx * ox, yTop, sz * oz]);
      }
    }
    return { coords, cubeSize };
  }, [dims]);

  const standoffCoords = useMemo(() => {
    const { length: L, width: W, thickness: t, middleTrayY } = dims;
    const inset = 14;
    const sx = L / 2 - t - inset;
    const sz = W / 2 - t - inset;
    const h = Math.max(10, middleTrayY - t * 1.5);
    return {
      height: h,
      yCenter: t + h / 2,
      points: [
        [-sx, -sz],
        [sx, -sz],
        [sx, sz],
        [-sx, sz],
      ] as [number, number][],
    };
  }, [dims]);

  return (
    <group>
      {/* 8 Corner Acrylic/Aluminium L-Bracket Cubes */}
      {cornerPositions.coords.map((pos, idx) => (
        <mesh key={`bracket-${idx}`} position={pos}>
          <boxGeometry
            args={[
              cornerPositions.cubeSize,
              cornerPositions.cubeSize,
              cornerPositions.cubeSize,
            ]}
          />
          <meshStandardMaterial
            color="#334155"
            metalness={0.75}
            roughness={0.28}
          />
        </mesh>
      ))}

      {/* 4 Brass M3 Standoff Pillars supporting the optional Middle Laptop Tray */}
      {middleEnabled &&
        standoffCoords.points.map(([x, z], idx) => (
          <mesh
            key={`standoff-${idx}`}
            position={[x, standoffCoords.yCenter, z]}
          >
            <cylinderGeometry args={[3.5, 3.5, standoffCoords.height, 6]} />
            <meshStandardMaterial
              color="#d4a24c"
              metalness={0.85}
              roughness={0.25}
            />
          </mesh>
        ))}
    </group>
  );
};

/**
 * Simulates internal WS2812B LED strips + Ice Blue (#A0E6FF) PointLights inside the case.
 */
const InternalWs2812Leds: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);

  if (!ledEnabled) return null;

  const { length: L, width: W, height: H, thickness: t } = dims;
  const stripLen = Math.max(40, L - t * 2 - 36);

  return (
    <group>
      {/* Primary Ice Blue PointLights simulating internal WS2812B glow */}
      <pointLight
        position={[-L * 0.22, H * 0.55, 0]}
        color={ledColor}
        intensity={18000}
        distance={520}
        decay={2}
      />
      <pointLight
        position={[L * 0.22, H * 0.45, 0]}
        color={ledColor}
        intensity={18000}
        distance={520}
        decay={2}
      />

      {/* Glowing WS2812B LED Strip Bars mounted under the top edges */}
      <mesh position={[0, H - t - 4, W / 2 - t - 6]}>
        <boxGeometry args={[stripLen, 3, 4]} />
        <meshStandardMaterial
          color={ledColor}
          emissive={ledColor}
          emissiveIntensity={3.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, H - t - 4, -W / 2 + t + 6]}>
        <boxGeometry args={[stripLen, 3, 4]} />
        <meshStandardMaterial
          color={ledColor}
          emissive={ledColor}
          emissiveIntensity={3.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export const Preview3DAssembly: React.FC = () => {
  const caseDims = useCadStore((s) => s.caseDims);
  const panels = useCadStore((s) => s.panels);
  const activePanelId = useCadStore((s) => s.activePanelId);
  const explodeAmount = useCadStore((s) => s.explodeAmount);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);
  const showBrackets = useCadStore((s) => s.showBrackets);

  const setActivePanelId = useCadStore((s) => s.setActivePanelId);
  const setExplodeAmount = useCadStore((s) => s.setExplodeAmount);
  const setLedEnabled = useCadStore((s) => s.setLedEnabled);

  const enabledPanels = useMemo(
    () => (Object.values(panels) as AcrylicPanel[]).filter((p) => p.enabled),
    [panels]
  );

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#070d1f] to-slate-950 overflow-hidden">
      {/* Top-Left 3D Assembly HUD */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#A0E6FF]" />
          <span className="font-semibold text-slate-100">3D Assembly Preview</span>
          <span className="text-slate-400">•</span>
          <span className="text-cyan-300 font-mono">
            Acrylic {caseDims.thickness}mm
          </span>
        </div>
      </div>

      {/* Top-Right Quick 3D Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Explode</span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={explodeAmount}
            onChange={(e) => setExplodeAmount(Number(e.target.value))}
            className="w-20 cursor-pointer"
          />
        </div>

        <div className="w-px h-4 bg-slate-700" />

        <button
          onClick={() => setLedEnabled(!ledEnabled)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
            ledEnabled
              ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle LED WS2812B Ice Blue"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>LED</span>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
        Klik panel di 3D untuk edit 2D • Drag orbit • Scroll zoom
      </div>

      {/* React Three Fiber Canvas */}
      <Canvas
        camera={{ position: [440, 320, 440], fov: 38, near: 1, far: 4000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#050a18']} />

        {/* Studio / Procedural Environment for realistic acrylic transmission reflections */}
        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              form="rect"
              intensity={2.2}
              position={[0, 400, 120]}
              scale={[600, 200, 1]}
              color="#e0f2fe"
            />
            <Lightformer
              form="rect"
              intensity={1.4}
              position={[-400, 150, -200]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[500, 250, 1]}
              color="#A0E6FF"
            />
            <Lightformer
              form="rect"
              intensity={1.2}
              position={[400, 150, 200]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[500, 250, 1]}
              color="#bae6fd"
            />
          </group>
        </Environment>

        <ambientLight intensity={0.45} />
        <directionalLight position={[300, 500, 350]} intensity={1.1} color="#f8fafc" />
        <directionalLight position={[-300, 200, -300]} intensity={0.4} color="#7dd3fc" />

        {/* Internal Ice Blue WS2812B LEDs */}
        <InternalWs2812Leds />

        {/* Mechanical L-Brackets & Standoffs */}
        {showBrackets && <CornerBrackets />}

        {/* Assembled Extruded 3D Acrylic Panels */}
        <group>
          {enabledPanels.map((panel) => (
            <AcrylicPanelMesh
              key={panel.id}
              panel={panel}
              caseDims={caseDims}
              explodeAmount={explodeAmount}
              isActive={panel.id === activePanelId}
              ledEnabled={ledEnabled}
              ledColor={ledColor}
              onSelect={() => setActivePanelId(panel.id)}
            />
          ))}
        </group>

        {/* Millimeter Floor Reference Grid */}
        <Grid
          position={[0, -0.5, 0]}
          args={[1000, 1000]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={900}
          infiniteGrid
        />

        <OrbitControls
          makeDefault
          target={[0, caseDims.height / 2, 0]}
          minDistance={120}
          maxDistance={1500}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
