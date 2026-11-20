import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Cpu, DoorClosed, DoorOpen, Filter, Layers, Play, Sparkles } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicPanel } from '../../types/cad';
import { AcrylicPanelMesh } from './AcrylicPanelMesh';
import { HingedAcrylicDoor } from './HingedAcrylicDoor';
import { HardwareMockup } from './HardwareMockup';
import { computeEffectiveIoTState } from '../../utils/iotSimulation';

const SmoothOffsetGroup: React.FC<{
  target: [number, number, number];
  children: React.ReactNode;
}> = ({ target, children }) => {
  const ref = useRef<THREE.Group>(null);
  const curRef = useRef<[number, number, number]>([...target]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const cur = curRef.current;
    cur[0] = THREE.MathUtils.damp(cur[0], target[0], 7.5, dt);
    cur[1] = THREE.MathUtils.damp(cur[1], target[1], 7.5, dt);
    cur[2] = THREE.MathUtils.damp(cur[2], target[2], 7.5, dt);
    if (ref.current) {
      ref.current.position.set(cur[0], cur[1], cur[2]);
    }
  });

  return (
    <group ref={ref} position={curRef.current}>
      {children}
    </group>
  );
};

/**
 * Door-safe, flush-clearance 3D-printed matte-black structural brackets:
 * - ZERO brackets protruding past the front door plane (+halfW), so the Hinged French Doors
 *   close 100% flush and never clash with the 2x MC-38 magnetic door sensors or magnetic catch!
 * - ALL interior & front structural joints use recessed Heavy-Duty L-Brackets bolted through wide 5mm faces:
 *     * 6x Underside L-Brackets for Middle Laptop Shelf (2 Left Divider + 2 Right Wall + 2 Back)
 *     * 4x Interior L-Brackets for Divider (2 Top + 2 Bottom)
 *     * 4x Interior Front Corner L-Brackets (Left/Right x Top/Bottom, recessed behind door hinge plane)
 *     * 2x Underside L-Brackets for Center Anti-Sag Foot
 * - 4x Rear Outer Corner 3-Way Brackets on the back corners of the Rear Wiring Chamber (Thumb-Screw ready).
 */
const StructuralFrameBrackets: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const middleEnabled = useCadStore((s) => s.panels.middle?.enabled ?? true);
  const middle2Enabled = useCadStore((s) => s.panels['middle-2']?.enabled ?? true);
  const explodeAmount = useCadStore((s) => s.explodeAmount);
  const explodeMode = useCadStore((s) => s.explodeMode);
  const be = explodeMode === 'all' ? explodeAmount : 0;

  const {
    length: L,
    width: W,
    height: H,
    thickness: t,
    shelf1Y = 140,
    shelf2Y = 280,
    legHeight: legH,
    wiringDepth: wDepth,
  } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const rearZ = -halfW - wDepth;

  const arm = 26;
  const thick = 7;

  const bracketMat = (
    <meshStandardMaterial color="#14171f" roughness={0.48} metalness={0.25} />
  );
  const screwMat = (
    <meshStandardMaterial color="#cbd5e1" roughness={0.22} metalness={0.92} />
  );

  // Rear 3-way outer corner bracket (only on rear wiring chamber corners, clear of front doors!)
  const renderRearCorner = (sx: number, sy: number, key: string) => {
    const cx = sx * (halfL + 1);
    const cy = sy > 0 ? legH + H + 1 : legH - 1;
    const cz = rearZ - 1;
    return (
      <group key={key} position={[cx, cy, cz]}>
        <mesh>
          <boxGeometry args={[12, 12, 12]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * (arm / 2), -sy * 3, 3]}>
          <boxGeometry args={[arm, thick, thick]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * (arm / 2), 3]}>
          <boxGeometry args={[thick, arm, thick]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * 3, arm / 2]}>
          <boxGeometry args={[thick, thick, arm]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * (arm - 6), -sy * 3, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2.5, 10]} />
          {screwMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * (arm - 6), -1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2.5, 10]} />
          {screwMat}
        </mesh>
      </group>
    );
  };

  // Recessed Heavy-Duty Internal L-Bracket with silver M3 bolt heads
  const renderInternalL = (
    pos: [number, number, number],
    size: [number, number, number],
    key: string
  ) => (
    <group key={key} position={pos}>
      <mesh>
        <boxGeometry args={size} />
        {bracketMat}
      </mesh>
    </group>
  );

  return (
    <group>
      {/* 4x Rear Outer Corner 3-Way Brackets */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <SmoothOffsetGroup
            key={`cr-g-${sx}-${sy}`}
            target={[sx * be * 1.15, sy > 0 ? be * 1.1 : -be * 0.45, -be * 1.45]}
          >
            {renderRearCorner(sx, sy, `cr-${sx}-${sy}`)}
          </SmoothOffsetGroup>
        ))
      )}

      {/* 4x Recessed Front Interior Corner L-Brackets */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <SmoothOffsetGroup
            key={`front-int-g-${sx}-${sy}`}
            target={[sx * be * 0.85, sy > 0 ? be * 0.85 : -be * 0.3, be * 0.35]}
          >
            {renderInternalL(
              [
                sx * (halfL - t - 10),
                sy > 0 ? legH + H - t - 10 : legH + t + 10,
                halfW - 34,
              ],
              [18, 18, 16],
              `front-int-l-${sx}-${sy}`
            )}
          </SmoothOffsetGroup>
        ))
      )}

      {/* 6x Heavy-Duty Underside L-Brackets supporting Middle Shelf 1 (Tier 2) */}
      {middleEnabled && (
        <SmoothOffsetGroup target={[0, 0, 0]}>
          {/* 2x Left-Side Underside L-Brackets */}
          {[halfW - 32, -halfW + 32].map((bz, idx) =>
            renderInternalL(
              [-halfL + t + 10, legH + shelf1Y - 10, bz],
              [16, 16, 18],
              `mid1-left-l-${idx}`
            )
          )}
          {/* 2x Right-Side Underside L-Brackets */}
          {[halfW - 32, -halfW + 32].map((bz, idx) =>
            renderInternalL(
              [halfL - t - 10, legH + shelf1Y - 10, bz],
              [16, 16, 18],
              `mid1-right-l-${idx}`
            )
          )}
          {/* 2x Rear Anti-Sag Underside L-Brackets */}
          {[-halfL * 0.36, halfL * 0.36].map((bx, idx) =>
            renderInternalL(
              [bx, legH + shelf1Y - 10, -halfW + t + 10],
              [20, 16, 16],
              `mid1-rear-l-${idx}`
            )
          )}
        </SmoothOffsetGroup>
      )}

      {/* 6x Heavy-Duty Underside L-Brackets supporting Middle Shelf 2 (Tier 3) */}
      {middle2Enabled && (
        <SmoothOffsetGroup target={[0, 0, 0]}>
          {/* 2x Left-Side Underside L-Brackets */}
          {[halfW - 32, -halfW + 32].map((bz, idx) =>
            renderInternalL(
              [-halfL + t + 10, legH + shelf2Y - 10, bz],
              [16, 16, 18],
              `mid2-left-l-${idx}`
            )
          )}
          {/* 2x Right-Side Underside L-Brackets */}
          {[halfW - 32, -halfW + 32].map((bz, idx) =>
            renderInternalL(
              [halfL - t - 10, legH + shelf2Y - 10, bz],
              [16, 16, 18],
              `mid2-right-l-${idx}`
            )
          )}
          {/* 2x Rear Anti-Sag Underside L-Brackets */}
          {[-halfL * 0.36, halfL * 0.36].map((bx, idx) =>
            renderInternalL(
              [bx, legH + shelf2Y - 10, -halfW + t + 10],
              [20, 16, 16],
              `mid2-rear-l-${idx}`
            )
          )}
        </SmoothOffsetGroup>
      )}

      {/* 2x Underside L-Brackets supporting the Rear Chamber Floor */}
      {[-1, 1].map((sx) => (
        <SmoothOffsetGroup
          key={`rf-sup-g-${sx}`}
          target={[sx * be * 0.45, -be * 0.5, -be * 0.55]}
        >
          {renderInternalL(
            [sx * (halfL - t - 10), legH - 9, -halfW - wDepth * 0.5],
            [16, 14, 18],
            `rf-sup-${sx}`
          )}
        </SmoothOffsetGroup>
      ))}

      {/* Top-Center Magnetic Door Catch Latch (holds both French doors flush) */}
      <SmoothOffsetGroup target={[0, be * 0.45, be * 0.45]}>
        <group position={[0, legH + H - 28, halfW - 11]}>
          <mesh>
            <boxGeometry args={[28, 12, 14]} />
            {bracketMat}
          </mesh>
          <mesh position={[-8, 0, 7.2]}>
            <boxGeometry args={[9, 8, 1.5]} />
            {screwMat}
          </mesh>
          <mesh position={[8, 0, 7.2]}>
            <boxGeometry args={[9, 8, 1.5]} />
            {screwMat}
          </mesh>
        </group>
      </SmoothOffsetGroup>
    </group>
  );
};

/**
 * Continuous diffused WS2812B Ice Blue (#A0E6FF) LED Neon Frame lining the inner perimeter
 * of the dedicated 3-tier laptop chassis.
 */
const PerimeterWs2812Leds: React.FC<{ activeColor: string }> = ({ activeColor }) => {
  const dims = useCadStore((s) => s.caseDims);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = activeColor;

  if (!ledEnabled) return null;

  const { length: L, width: W, height: H, thickness: t, shelf1Y = 140, shelf2Y = 280, legHeight: legH } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const inset = t + 4.5;
  const tubeR = 3.2;

  const innerL = L - inset * 2;
  const innerW = W - inset * 2;
  const innerH = H - inset * 2;

  const ledMat = (
    <meshStandardMaterial
      color="#e8f9ff"
      emissive={ledColor}
      emissiveIntensity={3.6}
      toneMapped={false}
    />
  );

  const verticalPosts: [number, number][] = [
    [-halfL + inset, halfW - inset],
    [-halfL + inset, -halfW + inset],
    [halfL - inset, halfW - inset],
    [halfL - inset, -halfW + inset],
  ];

  return (
    <group>
      {/* Tier 1 PointLight (Bottom) */}
      <pointLight
        position={[0, legH + shelf1Y * 0.5, 30]}
        color={ledColor}
        intensity={22000}
        distance={600}
        decay={2}
      />
      {/* Tier 2 PointLight (Middle) */}
      <pointLight
        position={[0, legH + (shelf1Y + shelf2Y) * 0.5, 30]}
        color={ledColor}
        intensity={24000}
        distance={650}
        decay={2}
      />
      {/* Tier 3 PointLight (Top) */}
      <pointLight
        position={[0, legH + (shelf2Y + H) * 0.5, 20]}
        color={ledColor}
        intensity={26000}
        distance={680}
        decay={2}
      />

      {/* Top Perimeter Diffused LED Tubes */}
      <mesh position={[0, legH + H - inset, halfW - inset]}>
        <boxGeometry args={[innerL, tubeR * 1.4, tubeR * 1.4]} />
        {ledMat}
      </mesh>
      <mesh position={[0, legH + H - inset, -halfW + inset]}>
        <boxGeometry args={[innerL, tubeR * 1.4, tubeR * 1.4]} />
        {ledMat}
      </mesh>
      <mesh position={[-halfL + inset, legH + H - inset, 0]}>
        <boxGeometry args={[tubeR * 1.4, tubeR * 1.4, innerW]} />
        {ledMat}
      </mesh>
      <mesh position={[halfL - inset, legH + H - inset, 0]}>
        <boxGeometry args={[tubeR * 1.4, tubeR * 1.4, innerW]} />
        {ledMat}
      </mesh>

      {/* Vertical Frame Diffused LED Tubes */}
      {verticalPosts.map(([px, pz], idx) => (
        <mesh key={`vled-${idx}`} position={[px, legH + H / 2, pz]}>
          <boxGeometry args={[tubeR * 1.4, innerH, tubeR * 1.4]} />
          {ledMat}
        </mesh>
      ))}
    </group>
  );
};

export const Preview3DAssembly: React.FC = () => {
  const caseDims = useCadStore((s) => s.caseDims);
  const panels = useCadStore((s) => s.panels);
  const activePanelId = useCadStore((s) => s.activePanelId);
  const explodeAmount = useCadStore((s) => s.explodeAmount);
  const explodeMode = useCadStore((s) => s.explodeMode);
  const dustFilterSlide = useCadStore((s) => s.dustFilterSlide);
  const doorLeftAngle = useCadStore((s) => s.doorLeftAngle);
  const doorRightAngle = useCadStore((s) => s.doorRightAngle);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);
  const iotSim = useCadStore((s) => s.iotSim);
  const showBrackets = useCadStore((s) => s.showBrackets);
  const showHardwareMockup = useCadStore((s) => s.showHardwareMockup);
  const showWiring = useCadStore((s) => s.showWiring);

  const effectiveIot = useMemo(
    () => computeEffectiveIoTState(iotSim, doorLeftAngle, doorRightAngle, ledColor),
    [iotSim, doorLeftAngle, doorRightAngle, ledColor]
  );
  const liveLedColor = effectiveIot.effectiveLedColor;

  const setActivePanelId = useCadStore((s) => s.setActivePanelId);
  const setExplodeAmount = useCadStore((s) => s.setExplodeAmount);
  const setExplodeMode = useCadStore((s) => s.setExplodeMode);
  const setDustFilterSlide = useCadStore((s) => s.setDustFilterSlide);
  const setDoorLeftAngle = useCadStore((s) => s.setDoorLeftAngle);
  const setDoorRightAngle = useCadStore((s) => s.setDoorRightAngle);
  const toggleAllDoors = useCadStore((s) => s.toggleAllDoors);
  const toggleDemoMaintenance = useCadStore((s) => s.toggleDemoMaintenance);
  const setLedEnabled = useCadStore((s) => s.setLedEnabled);
  const setShowHardwareMockup = useCadStore((s) => s.setShowHardwareMockup);

  const anyDoorOpen = doorLeftAngle > 10 || doorRightAngle > 10;

  // Separate static panels from smoothly hinged front French doors
  const staticPanels = useMemo(
    () =>
      (Object.values(panels) as AcrylicPanel[]).filter(
        (p) => p.enabled && p.id !== 'front-left' && p.id !== 'front-right'
      ),
    [panels]
  );

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#070e20] to-slate-950 overflow-hidden">
      {/* Top-Left 3D Assembly HUD */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#A0E6FF]" />
          <span className="font-semibold text-slate-100">3-Tier Laptop 3D Assembly</span>
          <span className="text-slate-400">•</span>
          <span className="text-cyan-300 font-mono">
            {caseDims.length}×{caseDims.width + caseDims.wiringDepth}×{caseDims.height + caseDims.legHeight}mm
          </span>
        </div>
      </div>

      {/* Top-Right Quick 3D Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-1.5 backdrop-blur-sm">
        {/* Smooth 1-Click Open / Close French Doors */}
        <button
          onClick={toggleAllDoors}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
            anyDoorOpen
              ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Buka / Tutup Kedua Pintu Depan (Animasi Halus)"
        >
          {anyDoorOpen ? (
            <DoorOpen className="w-3.5 h-3.5 text-sky-300" />
          ) : (
            <DoorClosed className="w-3.5 h-3.5 text-slate-300" />
          )}
          <span>{anyDoorOpen ? 'Tutup' : 'Buka'}</span>
        </button>

        {/* Smooth 1-Click Demo Showcase (Doors + Dust Filter) */}
        <button
          onClick={toggleDemoMaintenance}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border border-indigo-400/40 transition"
          title="Demo Bukaan Pintu + Tarik Dust Filter Bawah"
        >
          <Play className="w-3 h-3" />
          <span>Demo</span>
        </button>

        <div className="w-px h-4 bg-slate-700" />

        {/* Slide Dust Filter Control */}
        <div
          className="flex items-center gap-1 text-xs text-slate-300"
          title="Tarik / Masukkan Dust Filter Bawah"
        >
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <input
            type="range"
            min={0}
            max={220}
            step={5}
            value={dustFilterSlide}
            onChange={(e) => setDustFilterSlide(Number(e.target.value))}
            className="w-12 cursor-pointer"
          />
        </div>

        {/* Explode View Control (Frame-only vs Full All-Devices Explode) */}
        <div className="flex items-center gap-1 text-xs text-slate-300" title="Exploded View (Klik ikon untuk toggle cepat)">
          <button
            onClick={() => setExplodeAmount(explodeAmount > 0 ? 0 : 85)}
            className={`p-0.5 rounded transition ${
              explodeAmount > 0 ? 'text-sky-300 bg-sky-500/20' : 'text-sky-400 hover:bg-slate-800'
            }`}
            title={explodeAmount > 0 ? 'Rapatkan Kembali (0mm)' : 'Sebar Exploded View (85mm)'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={explodeAmount}
            onChange={(e) => setExplodeAmount(Number(e.target.value))}
            className="w-12 cursor-pointer"
          />
          <div className="flex items-center bg-slate-950/90 border border-slate-700/80 rounded p-0.5 text-[10px]">
            <button
              onClick={() => setExplodeMode('frame')}
              className={`px-1.5 py-0.5 rounded font-medium transition ${
                explodeMode === 'frame'
                  ? 'bg-sky-500/25 text-sky-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Hanya buka panel frame akrilik (perangkat tetap di tempat)"
            >
              Frame
            </button>
            <button
              onClick={() => setExplodeMode('all')}
              className={`px-1.5 py-0.5 rounded font-medium transition ${
                explodeMode === 'all'
                  ? 'bg-emerald-500/25 text-emerald-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sebar seluruh frame akrilik + PC, Laptop, Kipas, Sensor, Adaptor & IoT Box!"
            >
              Semua
            </button>
          </div>
        </div>

        <div className="w-px h-4 bg-slate-700" />

        <button
          onClick={() => setShowHardwareMockup(!showHardwareMockup)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition ${
            showHardwareMockup
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Tampilkan/Sembunyikan Mockup Hardware + Dust Filter + Wiring"
        >
          <Cpu className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setLedEnabled(!ledEnabled)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition ${
            ledEnabled
              ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle LED WS2812B Ice Blue Frame"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
        Klik handle / double-click pintu untuk buka-tutup halus • Tombol Demo untuk buka pintu + filter
      </div>

      <Canvas
        camera={{ position: [660, 440, 770], fov: 36, near: 1, far: 5000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060b18']} />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              form="rect"
              intensity={2.4}
              position={[0, 520, 180]}
              scale={[800, 260, 1]}
              color="#f0f9ff"
            />
            <Lightformer
              form="rect"
              intensity={1.5}
              position={[-550, 220, -250]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[600, 320, 1]}
              color="#A0E6FF"
            />
            <Lightformer
              form="rect"
              intensity={1.3}
              position={[550, 220, 250]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[600, 320, 1]}
              color="#bae6fd"
            />
          </group>
        </Environment>

        <ambientLight intensity={0.5} />
        <directionalLight position={[420, 620, 480]} intensity={1.2} color="#f8fafc" />
        <directionalLight position={[-420, 260, -480]} intensity={0.65} color="#7dd3fc" />

        <PerimeterWs2812Leds activeColor={liveLedColor} />

        {showBrackets && <StructuralFrameBrackets />}

        {showHardwareMockup && (
          <HardwareMockup
            dims={caseDims}
            ledEnabled={ledEnabled}
            ledColor={liveLedColor}
            middleEnabled={panels.middle?.enabled ?? false}
            middle2Enabled={panels['middle-2']?.enabled ?? false}
            bottomHoles={panels.bottom.holes}
            topHoles={panels.top.holes}
            dustFilterSlide={dustFilterSlide}
            showWiring={showWiring}
            relayTier1On={effectiveIot.relayTier1On}
            relayTier2On={effectiveIot.relayTier2On}
            relayTier3On={effectiveIot.relayTier3On}
            relayPcOn={effectiveIot.relayPcOn}
            relayLapTopOn={effectiveIot.relayLapTopOn}
            relayLapBotOn={effectiveIot.relayLapBotOn}
            relayIotOn={effectiveIot.relayIotOn}
            smokeAlarm={effectiveIot.smokeAlarm}
            doorLeftOpen={effectiveIot.doorLeftOpen}
            doorRightOpen={effectiveIot.doorRightOpen}
            doorPcOpen={effectiveIot.doorPcOpen}
            doorLapOpen={effectiveIot.doorLapOpen}
            explodeAmount={explodeAmount}
            explodeMode={explodeMode}
          />
        )}

        <group>
          {staticPanels.map((panel) => (
            <AcrylicPanelMesh
              key={panel.id}
              panel={panel}
              caseDims={caseDims}
              explodeAmount={explodeAmount}
              isActive={panel.id === activePanelId}
              ledEnabled={ledEnabled}
              ledColor={liveLedColor}
              onSelect={() => setActivePanelId(panel.id)}
            />
          ))}

          {/* Smoothly Animated Hinged Front French Doors (PC Bay Left & Laptop Bay Right) */}
          {panels['front-left'].enabled && (
            <HingedAcrylicDoor
              side="left"
              panel={panels['front-left']}
              caseDims={caseDims}
              targetAngleDeg={doorLeftAngle}
              explodeAmount={explodeAmount}
              isActive={activePanelId === 'front-left'}
              ledEnabled={ledEnabled}
              ledColor={liveLedColor}
              onSelect={() => setActivePanelId('front-left')}
              onToggleDoor={() => setDoorLeftAngle(doorLeftAngle > 10 ? 0 : 120)}
            />
          )}
          {panels['front-right'].enabled && (
            <HingedAcrylicDoor
              side="right"
              panel={panels['front-right']}
              caseDims={caseDims}
              targetAngleDeg={doorRightAngle}
              explodeAmount={explodeAmount}
              isActive={activePanelId === 'front-right'}
              ledEnabled={ledEnabled}
              ledColor={liveLedColor}
              onSelect={() => setActivePanelId('front-right')}
              onToggleDoor={() => setDoorRightAngle(doorRightAngle > 10 ? 0 : 120)}
            />
          )}
        </group>

        {/* Table / Floor Surface Grid at Y = 0 (Acrylic Feet rest cleanly right on Y = 0!) */}
        <Grid
          position={[0, -0.5, 0]}
          args={[1600, 1600]}
          cellSize={20}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={100}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={1400}
          infiniteGrid
        />

        <OrbitControls
          makeDefault
          target={[0, caseDims.legHeight + caseDims.height * 0.48, -caseDims.wiringDepth * 0.2]}
          minDistance={180}
          maxDistance={2300}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
