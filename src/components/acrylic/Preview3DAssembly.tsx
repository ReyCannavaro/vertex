import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Cpu, Filter, Layers, Sparkles } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicPanel } from '../../types/cad';
import { AcrylicPanelMesh } from './AcrylicPanelMesh';
import { HardwareMockup } from './HardwareMockup';

/**
 * Matte-black industrial exterior Corner, T-Joint, and Cross (+) Brackets with M3 screws.
 * Elevated cleanly above the integrated acrylic legs (y = legHeight .. legHeight + H)
 * and spanning back to cover the Rear Wiring Chamber.
 */
const StructuralFrameBrackets: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const middleEnabled = useCadStore((s) => s.panels.middle.enabled);
  const dividerEnabled = useCadStore((s) => s.panels.divider.enabled);

  const {
    length: L,
    width: W,
    height: H,
    dividerX,
    middleTrayY,
    legHeight: legH,
    wiringDepth: wDepth,
  } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const rearZ = -halfW - wDepth;
  const divX = -halfL + dividerX;

  const arm = 26;
  const thick = 7;

  const bracketMat = (
    <meshStandardMaterial color="#14171f" roughness={0.48} metalness={0.25} />
  );
  const screwMat = (
    <meshStandardMaterial color="#cbd5e1" roughness={0.22} metalness={0.92} />
  );

  // Helper: 3-way outer corner bracket
  const renderCorner = (sx: number, sy: number, zPos: number, szDir: number, key: string) => {
    const cx = sx * (halfL + 1);
    const cy = sy > 0 ? legH + H + 1 : legH - 1;
    const cz = zPos + szDir * 1;
    return (
      <group key={key} position={[cx, cy, cz]}>
        <mesh>
          <boxGeometry args={[12, 12, 12]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * (arm / 2), -sy * 3, -szDir * 3]}>
          <boxGeometry args={[arm, thick, thick]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * (arm / 2), -szDir * 3]}>
          <boxGeometry args={[thick, arm, thick]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * 3, -szDir * (arm / 2)]}>
          <boxGeometry args={[thick, thick, arm]} />
          {bracketMat}
        </mesh>
        <mesh position={[-sx * (arm - 6), -sy * 3, szDir * 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2.5, 10]} />
          {screwMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * (arm - 6), szDir * 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2.5, 10]} />
          {screwMat}
        </mesh>
      </group>
    );
  };

  const renderTBracket = (
    pos: [number, number, number],
    rotZ: number,
    sz: number,
    key: string
  ) => (
    <group key={key} position={pos} rotation={[0, 0, rotZ]}>
      <mesh>
        <boxGeometry args={[arm * 1.85, 11, thick]} />
        {bracketMat}
      </mesh>
      <mesh position={[0, -arm * 0.48, 0]}>
        <boxGeometry args={[11, arm * 0.95, thick]} />
        {bracketMat}
      </mesh>
      {[-arm * 0.65, arm * 0.65].map((ox, i) => (
        <mesh key={i} position={[ox, 0, sz * 3.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2, 10]} />
          {screwMat}
        </mesh>
      ))}
      <mesh position={[0, -arm * 0.72, sz * 3.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 2, 10]} />
        {screwMat}
      </mesh>
    </group>
  );

  const renderCrossBracket = (pos: [number, number, number], sz: number, key: string) => (
    <group key={key} position={pos}>
      <mesh>
        <boxGeometry args={[arm * 1.85, 12, thick]} />
        {bracketMat}
      </mesh>
      <mesh>
        <boxGeometry args={[12, arm * 1.85, thick]} />
        {bracketMat}
      </mesh>
      {[
        [-arm * 0.65, 0],
        [arm * 0.65, 0],
        [0, -arm * 0.65],
        [0, arm * 0.65],
      ].map(([ox, oy], i) => (
        <mesh key={i} position={[ox, oy, sz * 3.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2, 10]} />
          {screwMat}
        </mesh>
      ))}
    </group>
  );

  return (
    <group>
      {/* 4 Front Outer Corner Brackets (z = +halfW) + 4 Rear Outer Corner Brackets (z = -halfW - wDepth) */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <React.Fragment key={`corners-${sx}-${sy}`}>
            {renderCorner(sx, sy, halfW, 1, `cf-${sx}-${sy}`)}
            {renderCorner(sx, sy, rearZ, -1, `cr-${sx}-${sy}`)}
          </React.Fragment>
        ))
      )}

      {/* 4 Divider T-Brackets (Top & Bottom, Front & Back of Main Chamber) */}
      {dividerEnabled && (
        <>
          {renderTBracket([divX, legH + H - 3, halfW + 1], 0, 1, 'dt-top-f')}
          {renderTBracket([divX, legH + 3, halfW + 1], Math.PI, 1, 'dt-bot-f')}
          {renderTBracket([divX, legH + H - 3, -halfW - 1], 0, -1, 'dt-top-b')}
          {renderTBracket([divX, legH + 3, -halfW - 1], Math.PI, -1, 'dt-bot-b')}
        </>
      )}

      {/* 2 Cross (+)-Brackets where Divider intersects Middle Laptop Shelf */}
      {dividerEnabled && middleEnabled && (
        <>
          {renderCrossBracket([divX, legH + middleTrayY, halfW + 1], 1, 'cross-f')}
          {renderCrossBracket([divX, legH + middleTrayY, -halfW - 1], -1, 'cross-b')}
        </>
      )}

      {/* 2 Right-Wall T-Brackets supporting the Middle Laptop Shelf */}
      {middleEnabled && (
        <>
          {renderTBracket([halfL - 3, legH + middleTrayY, halfW + 1], -Math.PI / 2, 1, 'rt-mid-f')}
          {renderTBracket([halfL - 3, legH + middleTrayY, -halfW - 1], -Math.PI / 2, -1, 'rt-mid-b')}
        </>
      )}
    </group>
  );
};

/**
 * Continuous diffused WS2812B Ice Blue (#A0E6FF) LED Neon Frame lining the inner perimeter
 * of both PC Bay and Laptop Bay (elevated cleanly above legHeight).
 */
const PerimeterWs2812Leds: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);
  const dividerEnabled = useCadStore((s) => s.panels.divider.enabled);

  if (!ledEnabled) return null;

  const { length: L, width: W, height: H, thickness: t, dividerX, legHeight: legH } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const divX = -halfL + dividerX;
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
  if (dividerEnabled) {
    verticalPosts.push([divX + t / 2 + 3.5, halfW - inset]);
    verticalPosts.push([divX - t / 2 - 3.5, halfW - inset]);
    verticalPosts.push([divX + t / 2 + 3.5, -halfW + inset]);
  }

  return (
    <group>
      <pointLight
        position={[-halfL + dividerX * 0.5, legH + H * 0.65, 20]}
        color={ledColor}
        intensity={26000}
        distance={680}
        decay={2}
      />
      <pointLight
        position={[(-halfL + dividerX + halfL) * 0.5, legH + H * 0.72, 20]}
        color={ledColor}
        intensity={30000}
        distance={750}
        decay={2}
      />
      <pointLight
        position={[(-halfL + dividerX + halfL) * 0.5, legH + H * 0.25, 30]}
        color={ledColor}
        intensity={18000}
        distance={600}
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
      {dividerEnabled && (
        <mesh position={[divX + t / 2 + 3.5, legH + H - inset, 0]}>
          <boxGeometry args={[tubeR * 1.3, tubeR * 1.3, innerW]} />
          {ledMat}
        </mesh>
      )}

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
  const dustFilterSlide = useCadStore((s) => s.dustFilterSlide);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);
  const showBrackets = useCadStore((s) => s.showBrackets);
  const showHardwareMockup = useCadStore((s) => s.showHardwareMockup);
  const showWiring = useCadStore((s) => s.showWiring);

  const setActivePanelId = useCadStore((s) => s.setActivePanelId);
  const setExplodeAmount = useCadStore((s) => s.setExplodeAmount);
  const setDustFilterSlide = useCadStore((s) => s.setDustFilterSlide);
  const setLedEnabled = useCadStore((s) => s.setLedEnabled);
  const setShowHardwareMockup = useCadStore((s) => s.setShowHardwareMockup);

  const enabledPanels = useMemo(
    () => (Object.values(panels) as AcrylicPanel[]).filter((p) => p.enabled),
    [panels]
  );

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#070e20] to-slate-950 overflow-hidden">
      {/* Top-Left 3D Assembly HUD */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#A0E6FF]" />
          <span className="font-semibold text-slate-100">Dual-Bay 3D Assembly</span>
          <span className="text-slate-400">•</span>
          <span className="text-cyan-300 font-mono">
            {caseDims.length}×{caseDims.width + caseDims.wiringDepth}×{caseDims.height + caseDims.legHeight}mm
          </span>
        </div>
      </div>

      {/* Top-Right Quick 3D Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
        {/* Slide Dust Filter Control */}
        <div
          className="flex items-center gap-1.5 text-xs text-slate-300"
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
            className="w-14 cursor-pointer"
          />
        </div>

        <div className="w-px h-4 bg-slate-700" />

        {/* Explode View Control */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300" title="Exploded View">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <input
            type="range"
            min={0}
            max={110}
            step={5}
            value={explodeAmount}
            onChange={(e) => setExplodeAmount(Number(e.target.value))}
            className="w-14 cursor-pointer"
          />
        </div>

        <div className="w-px h-4 bg-slate-700" />

        <button
          onClick={() => setShowHardwareMockup(!showHardwareMockup)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
            showHardwareMockup
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Tampilkan/Sembunyikan Mockup Hardware + Dust Filter + Wiring"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">HW</span>
        </button>

        <button
          onClick={() => setLedEnabled(!ledEnabled)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
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
        Putar ke belakang untuk lihat Rear Wiring Chamber & Sisir Kabel • Slider Filter untuk tarik dust filter
      </div>

      <Canvas
        camera={{ position: [590, 420, 690], fov: 36, near: 1, far: 5000 }}
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

        <PerimeterWs2812Leds />

        {showBrackets && <StructuralFrameBrackets />}

        {showHardwareMockup && (
          <HardwareMockup
            dims={caseDims}
            ledEnabled={ledEnabled}
            ledColor={ledColor}
            middleEnabled={panels.middle.enabled}
            bottomHoles={panels.bottom.holes}
            topHoles={panels.top.holes}
            dustFilterSlide={dustFilterSlide}
            showWiring={showWiring}
          />
        )}

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
