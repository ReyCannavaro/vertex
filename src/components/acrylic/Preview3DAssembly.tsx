import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Cpu, Layers, Sparkles } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicPanel } from '../../types/cad';
import { AcrylicPanelMesh } from './AcrylicPanelMesh';
import { HardwareMockup } from './HardwareMockup';

/**
 * Matte-black industrial 3D-printed exterior Corner, T-Joint, and Cross (+) Brackets
 * with visible silver M3 hex screws — faithfully matching the dual-bay mini data center frame.
 */
const StructuralFrameBrackets: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const middleEnabled = useCadStore((s) => s.panels.middle.enabled);
  const dividerEnabled = useCadStore((s) => s.panels.divider.enabled);

  const { length: L, width: W, height: H, dividerX, middleTrayY } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const divX = -halfL + dividerX;

  const arm = 26; // bracket arm length
  const thick = 7; // bracket plate thickness

  const bracketMat = (
    <meshStandardMaterial color="#14171f" roughness={0.48} metalness={0.25} />
  );
  const screwMat = (
    <meshStandardMaterial color="#cbd5e1" roughness={0.22} metalness={0.92} />
  );

  // Helper: 3-way outer corner bracket
  const renderCorner = (sx: number, sy: number, sz: number, key: string) => {
    const cx = sx * (halfL + 1);
    const cy = sy > 0 ? H + 1 : -1;
    const cz = sz * (halfW + 1);
    return (
      <group key={key} position={[cx, cy, cz]}>
        {/* Corner Hub */}
        <mesh>
          <boxGeometry args={[12, 12, 12]} />
          {bracketMat}
        </mesh>
        {/* Arm along X */}
        <mesh position={[-sx * (arm / 2), -sy * 3, -sz * 3]}>
          <boxGeometry args={[arm, thick, thick]} />
          {bracketMat}
        </mesh>
        {/* Arm along Y */}
        <mesh position={[-sx * 3, -sy * (arm / 2), -sz * 3]}>
          <boxGeometry args={[thick, arm, thick]} />
          {bracketMat}
        </mesh>
        {/* Arm along Z */}
        <mesh position={[-sx * 3, -sy * 3, -sz * (arm / 2)]}>
          <boxGeometry args={[thick, thick, arm]} />
          {bracketMat}
        </mesh>
        {/* Silver M3 Screws */}
        <mesh position={[-sx * (arm - 6), -sy * 3, sz * 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2.5, 10]} />
          {screwMat}
        </mesh>
        <mesh position={[-sx * 3, -sy * (arm - 6), sz * 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 2.5, 10]} />
          {screwMat}
        </mesh>
      </group>
    );
  };

  // Helper: T-Joint bracket at Top/Bottom Divider or Right-Wall Middle Shelf
  const renderTBracket = (
    pos: [number, number, number],
    rotZ: number,
    sz: number,
    key: string
  ) => (
    <group key={key} position={pos} rotation={[0, 0, rotZ]}>
      {/* Horizontal bar */}
      <mesh>
        <boxGeometry args={[arm * 1.85, 11, thick]} />
        {bracketMat}
      </mesh>
      {/* Vertical stem */}
      <mesh position={[0, -arm * 0.48, 0]}>
        <boxGeometry args={[11, arm * 0.95, thick]} />
        {bracketMat}
      </mesh>
      {/* M3 Screws */}
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

  // Helper: Cross (+) 4-way bracket where Divider meets Middle Laptop Shelf
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
      {/* 8 Outer Corner L-Brackets */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) =>
          [-1, 1].map((sz) => renderCorner(sx, sy, sz, `c-${sx}-${sy}-${sz}`))
        )
      )}

      {/* 4 Divider T-Brackets (Top & Bottom, Front & Back) */}
      {dividerEnabled &&
        [-1, 1].map((sz) => (
          <React.Fragment key={`div-t-${sz}`}>
            {renderTBracket([divX, H - 3, sz * (halfW + 1)], 0, sz, `dt-top-${sz}`)}
            {renderTBracket([divX, 3, sz * (halfW + 1)], Math.PI, sz, `dt-bot-${sz}`)}
          </React.Fragment>
        ))}

      {/* 2 Cross (+)-Brackets where Divider intersects Middle Laptop Shelf */}
      {dividerEnabled &&
        middleEnabled &&
        [-1, 1].map((sz) =>
          renderCrossBracket(
            [divX, middleTrayY, sz * (halfW + 1)],
            sz,
            `cross-${sz}`
          )
        )}

      {/* 2 Right-Wall T-Brackets supporting the Middle Laptop Shelf */}
      {middleEnabled &&
        [-1, 1].map((sz) =>
          renderTBracket(
            [halfL - 3, middleTrayY, sz * (halfW + 1)],
            -Math.PI / 2,
            sz,
            `rt-mid-${sz}`
          )
        )}
    </group>
  );
};

/**
 * Continuous diffused WS2812B Ice Blue (#A0E6FF) LED Neon Frame lining the inner perimeter
 * of both PC Bay and Laptop Bay — recreating the crisp luminous edge glow from the reference build.
 */
const PerimeterWs2812Leds: React.FC = () => {
  const dims = useCadStore((s) => s.caseDims);
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);
  const dividerEnabled = useCadStore((s) => s.panels.divider.enabled);

  if (!ledEnabled) return null;

  const { length: L, width: W, height: H, thickness: t, dividerX } = dims;
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

  // Vertical posts X,Z positions (outer 4 corners + 2 at divider front/back)
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
      {/* Soft Ice Blue PointLights illuminating PC Bay & Laptop Bay interiors */}
      <pointLight
        position={[-halfL + dividerX * 0.5, H * 0.65, 20]}
        color={ledColor}
        intensity={26000}
        distance={680}
        decay={2}
      />
      <pointLight
        position={[(-halfL + dividerX + halfL) * 0.5, H * 0.72, 20]}
        color={ledColor}
        intensity={30000}
        distance={750}
        decay={2}
      />
      <pointLight
        position={[(-halfL + dividerX + halfL) * 0.5, H * 0.25, 30]}
        color={ledColor}
        intensity={18000}
        distance={600}
        decay={2}
      />

      {/* Top Perimeter Diffused LED Tubes */}
      <mesh position={[0, H - inset, halfW - inset]}>
        <boxGeometry args={[innerL, tubeR * 1.4, tubeR * 1.4]} />
        {ledMat}
      </mesh>
      <mesh position={[0, H - inset, -halfW + inset]}>
        <boxGeometry args={[innerL, tubeR * 1.4, tubeR * 1.4]} />
        {ledMat}
      </mesh>
      <mesh position={[-halfL + inset, H - inset, 0]}>
        <boxGeometry args={[tubeR * 1.4, tubeR * 1.4, innerW]} />
        {ledMat}
      </mesh>
      <mesh position={[halfL - inset, H - inset, 0]}>
        <boxGeometry args={[tubeR * 1.4, tubeR * 1.4, innerW]} />
        {ledMat}
      </mesh>
      {dividerEnabled && (
        <mesh position={[divX + t / 2 + 3.5, H - inset, 0]}>
          <boxGeometry args={[tubeR * 1.3, tubeR * 1.3, innerW]} />
          {ledMat}
        </mesh>
      )}

      {/* Vertical Frame Diffused LED Tubes */}
      {verticalPosts.map(([px, pz], idx) => (
        <mesh key={`vled-${idx}`} position={[px, H / 2, pz]}>
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
  const ledEnabled = useCadStore((s) => s.ledEnabled);
  const ledColor = useCadStore((s) => s.ledColor);
  const showBrackets = useCadStore((s) => s.showBrackets);
  const showHardwareMockup = useCadStore((s) => s.showHardwareMockup);

  const setActivePanelId = useCadStore((s) => s.setActivePanelId);
  const setExplodeAmount = useCadStore((s) => s.setExplodeAmount);
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
            {caseDims.length}×{caseDims.width}×{caseDims.height}mm ({caseDims.thickness}mm)
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
            max={110}
            step={5}
            value={explodeAmount}
            onChange={(e) => setExplodeAmount(Number(e.target.value))}
            className="w-16 cursor-pointer"
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
          title="Tampilkan/Sembunyikan Mockup PC + 2 Laptop + IoT/Fan Pod"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Hardware</span>
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
          <span>LED</span>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
        Kiri: PC Bay • Kanan: Dual Laptop Bay + Side Fan & IoT Pods • Klik panel untuk edit 2D
      </div>

      {/* React Three Fiber Canvas */}
      <Canvas
        camera={{ position: [560, 400, 660], fov: 36, near: 1, far: 5000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060b18']} />

        {/* Procedural Studio Environment for crisp clear acrylic reflections */}
        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              form="rect"
              intensity={2.4}
              position={[0, 500, 180]}
              scale={[800, 260, 1]}
              color="#f0f9ff"
            />
            <Lightformer
              form="rect"
              intensity={1.5}
              position={[-550, 200, -250]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[600, 320, 1]}
              color="#A0E6FF"
            />
            <Lightformer
              form="rect"
              intensity={1.3}
              position={[550, 200, 250]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[600, 320, 1]}
              color="#bae6fd"
            />
          </group>
        </Environment>

        <ambientLight intensity={0.5} />
        <directionalLight position={[420, 620, 480]} intensity={1.2} color="#f8fafc" />
        <directionalLight position={[-420, 240, -360]} intensity={0.45} color="#7dd3fc" />

        {/* Perimeter Ice Blue WS2812B LED Frame */}
        <PerimeterWs2812Leds />

        {/* Matte-Black Exterior Corner, T-Joint & Cross Brackets with M3 Screws */}
        {showBrackets && <StructuralFrameBrackets />}

        {/* Optional Internal & Side-Mounted Server Hardware Mockup */}
        {showHardwareMockup && (
          <HardwareMockup
            dims={caseDims}
            ledEnabled={ledEnabled}
            ledColor={ledColor}
            middleEnabled={panels.middle.enabled}
          />
        )}

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
          position={[0, -0.8, 0]}
          args={[1400, 1400]}
          cellSize={20}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={100}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={1300}
          infiniteGrid
        />

        <OrbitControls
          makeDefault
          target={[0, caseDims.height * 0.48, 0]}
          minDistance={180}
          maxDistance={2200}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
