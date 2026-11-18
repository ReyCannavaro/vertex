import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Eye, Layers } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { computeEffectiveIoTState, EffectiveIoTState } from '../../utils/iotSimulation';
import { IoTSimState } from '../../types/cad';

function createDynamicOledTexture(
  sim: IoTSimState,
  eff: EffectiveIoTState
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = eff.smokeAlarm ? '#2a0408' : '#030812';
    ctx.fillRect(0, 0, 256, 128);

    // Top Status Bar
    ctx.fillStyle = eff.smokeAlarm
      ? '#f87171'
      : eff.doorPcOpen || eff.doorLapOpen
        ? '#fbbf24'
        : '#38bdf8';
    ctx.font = 'bold 17px monospace';
    const headerText = eff.smokeAlarm
      ? '!! FIRE CUT-OFF !!'
      : eff.doorPcOpen || eff.doorLapOpen
        ? 'ALERT: DOOR OPEN!'
        : 'VERTEX MINI-DC OK';
    ctx.fillText(headerText, 12, 24);

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 32);
    ctx.lineTo(246, 32);
    ctx.stroke();

    ctx.fillStyle = '#A0E6FF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`PC:${sim.tempPc}C  LT:${sim.tempLapTop}C  LB:${sim.tempLapBot}C`, 10, 56);
    ctx.fillText(`MQ2:${sim.smokePpm}ppm  H:${sim.humidity}%`, 10, 82);

    // Relay 4-Channel status row
    const r = (on: boolean) => (on ? '1' : '0');
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(
      `RLY:[${r(eff.relayPcOn)} ${r(eff.relayLapTopOn)} ${r(eff.relayLapBotOn)} ${r(eff.relayIotOn)}] WiFi`,
      10,
      110
    );
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const Spinning5VFan: React.FC<{ active: boolean; position: [number, number, number] }> = ({
  active,
  position,
}) => {
  const rotorRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0);

  useFrame((_, delta) => {
    speedRef.current = THREE.MathUtils.damp(speedRef.current, active ? 11 : 0, 4, delta);
    if (rotorRef.current) {
      rotorRef.current.rotation.z -= delta * speedRef.current;
    }
  });

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      {/* 40x40x10mm 5V Fan Frame */}
      <mesh>
        <boxGeometry args={[40, 40, 10]} />
        <meshStandardMaterial color="#141820" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[17.5, 17.5, 11, 24]} />
        <meshStandardMaterial color="#070a10" roughness={0.8} />
      </mesh>
      <group ref={rotorRef} position={[0, 0, 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[5.5, 5.5, 8, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.35} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => (
          <group key={i} rotation={[0, 0, (i / 7) * Math.PI * 2]}>
            <mesh position={[10, 0, 0]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[11, 4.2, 1.5]} />
              <meshStandardMaterial
                color={active ? '#7dd3fc' : '#475569'}
                emissive={active ? '#38bdf8' : '#000000'}
                emissiveIntensity={active ? 1.5 : 0}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

const BuzzerModule3D: React.FC<{ active: boolean; position: [number, number, number] }> = ({
  active,
  position,
}) => {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current && active) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 14) * 0.25;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={position}>
      {/* Small PCB */}
      <mesh>
        <boxGeometry args={[18, 16, 2]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
      </mesh>
      {/* Black Buzzer Cylinder */}
      <mesh position={[0, 0, 5.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6, 6, 9, 20]} />
        <meshStandardMaterial color="#0f1218" roughness={0.45} />
      </mesh>
      {/* Pulsing Alarm Ring when triggered */}
      {active && (
        <mesh ref={ringRef} position={[0, 0, 10.5]}>
          <ringGeometry args={[6.5, 9.2, 24]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={3}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};

const InternalElectronicsScene: React.FC<{
  xrayShell: boolean;
  openFaceplate: boolean;
}> = ({ xrayShell, openFaceplate }) => {
  const iotSim = useCadStore((s) => s.iotSim);
  const doorLeftAngle = useCadStore((s) => s.doorLeftAngle);
  const doorRightAngle = useCadStore((s) => s.doorRightAngle);
  const ledColor = useCadStore((s) => s.ledColor);

  const eff = useMemo(
    () => computeEffectiveIoTState(iotSim, doorLeftAngle, doorRightAngle, ledColor),
    [iotSim, doorLeftAngle, doorRightAngle, ledColor]
  );

  const oledTex = useMemo(() => createDynamicOledTexture(iotSim, eff), [iotSim, eff]);
  useEffect(() => {
    return () => oledTex.dispose();
  }, [oledTex]);

  // Internal 3D jumper harnesses connecting Buck -> ESP32 -> Relay -> OLED -> 5V Fan
  const jumpers = useMemo(() => {
    const specs: Array<{ pts: [number, number, number][]; color: string }> = [
      // +5V Buck -> ESP32 VIN
      { pts: [[-40, 20, -14], [-34, 28, -4], [-22, 42, -8]], color: '#f97316' },
      // GND Bus
      { pts: [[-40, 14, -14], [-32, 20, -6], [-22, 34, -8]], color: '#64748b' },
      // 4x Relay Control Signals (ESP32 -> Relay 4-Ch)
      { pts: [[16, 48, -8], [26, 48, 2], [28, 24, -4]], color: '#a855f7' },
      { pts: [[16, 43, -8], [29, 43, 2], [32, 24, -4]], color: '#c084fc' },
      // I2C SDA/SCL (ESP32 -> Front OLED)
      { pts: [[10, 56, -8], [10, 48, 10], [4, 38, 22]], color: '#38bdf8' },
      { pts: [[14, 56, -8], [14, 46, 10], [8, 38, 22]], color: '#0ea5e9' },
      // Relay CH4 5V -> Right-Side 40mm 5V Fan
      { pts: [[40, 18, -6], [48, 26, -2], [54, 38, -2]], color: '#f97316' },
      // ESP32 GPIO5 -> Buzzer
      { pts: [[-10, 24, -8], [-6, 16, 2], [2, 16, -6]], color: '#ec4899' },
    ];
    return specs.map((s) => {
      const curve = new THREE.CatmullRomCurve3(
        s.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
      );
      return {
        geo: new THREE.TubeGeometry(curve, 18, 0.9, 6, false),
        color: s.color,
      };
    });
  }, []);

  useEffect(() => {
    return () => jumpers.forEach((j) => j.geo.dispose());
  }, [jumpers]);

  const L = 124;
  const H = 76;
  const W = 56;
  const faceplateZ = openFaceplate ? W / 2 + 28 : W / 2;

  return (
    <group>
      {/* Semi-Transparent X-Ray IoT Box Opsi D Enclosure Shell */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[L, H, W]} />
        <meshPhysicalMaterial
          color="#1e293b"
          transparent
          opacity={xrayShell ? 0.18 : 0.78}
          roughness={0.35}
          depthWrite={!xrayShell}
        />
        <Edges threshold={20} color="#38bdf8" opacity={0.45} transparent />
      </mesh>

      {/* Left Wall Intake Louver Guide Bars (-X) */}
      {[-20, -12, -4, 4, 12, 20].map((ly, i) => (
        <mesh key={`lv-${i}`} position={[-L / 2 - 0.5, H / 2 + ly, -2]}>
          <boxGeometry args={[1.2, 2.8, 34]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.45} />
        </mesh>
      ))}

      {/* ================= 1. ESP32 38-PIN + SCREW TERMINAL EXPANSION BOARD ================= */}
      <group position={[-4, 46, -15]}>
        {/* Green Screw Terminal Expansion PCB */}
        <mesh>
          <boxGeometry args={[66, 48, 2.2]} />
          <meshStandardMaterial color="#15803d" roughness={0.55} metalness={0.18} />
        </mesh>
        {/* Top & Bottom Green Screw Terminal Strips (19 terminals per side = 38-pin!) */}
        <mesh position={[0, 20.5, 4]}>
          <boxGeometry args={[60, 6, 7]} />
          <meshStandardMaterial color="#16a34a" roughness={0.45} />
        </mesh>
        <mesh position={[0, -20.5, 4]}>
          <boxGeometry args={[60, 6, 7]} />
          <meshStandardMaterial color="#16a34a" roughness={0.45} />
        </mesh>
        {/* ESP32 DevKitC 38-Pin Dark PCB seated in center headers */}
        <mesh position={[0, 0, 5.5]}>
          <boxGeometry args={[52, 28, 2]} />
          <meshStandardMaterial color="#111827" roughness={0.45} metalness={0.3} />
        </mesh>
        {/* Metallic ESP-WROOM-32 WiFi RF Shield */}
        <mesh position={[-12, 0, 8.2]}>
          <boxGeometry args={[18, 16, 3.2]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
        </mesh>
        {/* Micro-USB / USB-C Port on right edge */}
        <mesh position={[24, 0, 7.2]}>
          <boxGeometry args={[7, 8, 3.2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Status Power Red LED + WiFi Blue LED */}
        <mesh position={[14, 7, 7.2]}>
          <sphereGeometry args={[1.1, 10, 10]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh position={[14, -7, 7.2]}>
          <sphereGeometry args={[1.1, 10, 10]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>

      {/* ================= 2. BUCK CONVERTER 12V -> 5V (XL4015 5A) ================= */}
      <group position={[-42, 16, -15]}>
        <mesh>
          <boxGeometry args={[28, 18, 2]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
        </mesh>
        {/* Copper Toroid Inductor */}
        <mesh position={[-5, 0, 5.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.5, 2.2, 10, 20]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.28} />
        </mesh>
        {/* Blue Trimmer Potentiometer */}
        <mesh position={[7, 4, 4.5]}>
          <boxGeometry args={[6, 4.5, 6]} />
          <meshStandardMaterial color="#2563eb" roughness={0.4} />
        </mesh>
        {/* Electrolytic Capacitor */}
        <mesh position={[7, -4, 5.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[3.2, 3.2, 8, 16]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ================= 3. RELAY MODULE 4-CHANNEL 5V (LIVE STATUS LEDS) ================= */}
      <group position={[30, 18, -14]}>
        {/* Relay PCB */}
        <mesh>
          <boxGeometry args={[46, 26, 2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        {/* 4x Iconic Blue Songle Relay Cubes + Live Green LED Indicators */}
        {[
          { x: -16, on: eff.relayPcOn },
          { x: -5.3, on: eff.relayLapTopOn },
          { x: 5.3, on: eff.relayLapBotOn },
          { x: 16, on: eff.relayIotOn },
        ].map((ch, idx) => (
          <group key={idx} position={[ch.x, 1, 7.5]}>
            <mesh>
              <boxGeometry args={[9.2, 14, 13]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.38} metalness={0.12} />
            </mesh>
            {/* Live Channel Active Green LED */}
            <mesh position={[0, -9.5, -5.2]}>
              <sphereGeometry args={[1.3, 10, 10]} />
              <meshStandardMaterial
                color={ch.on ? '#22c55e' : '#334155'}
                emissive={ch.on ? '#22c55e' : '#000000'}
                emissiveIntensity={ch.on ? 3.5 : 0}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================= 4. ACTIVE BUZZER 5V ================= */}
      <BuzzerModule3D active={eff.buzzerActive} position={[-6, 15, -14]} />

      {/* ================= 5. RIGHT-SIDE 40mm 5V CROSS-FLOW COOLING FAN ================= */}
      <Spinning5VFan active={eff.relayIotOn} position={[L / 2 - 7, H / 2, -2]} />

      {/* ================= 6. FRONT FACEPLATE + LIVE DYNAMIC OLED 0.96" ================= */}
      <group position={[0, H / 2, faceplateZ]}>
        {/* Translucent Front Faceplate Frame */}
        <mesh>
          <boxGeometry args={[L, H, 2.6]} />
          <meshPhysicalMaterial
            color="#171b23"
            transparent
            opacity={xrayShell ? 0.35 : 0.92}
            roughness={0.42}
          />
          <Edges threshold={20} color="#64748b" opacity={0.5} transparent />
        </mesh>
        {/* OLED 0.96" PCB & Live Telemetry Screen */}
        <mesh position={[0, 0, -2.5]}>
          <boxGeometry args={[28, 28, 1.8]} />
          <meshStandardMaterial color="#0c2d48" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 1.5]}>
          <planeGeometry args={[44, 22]} />
          <meshStandardMaterial
            map={oledTex}
            emissiveMap={oledTex}
            emissive={eff.smokeAlarm ? '#ef4444' : '#A0E6FF'}
            emissiveIntensity={1.6}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* ================= 7. INTERNAL 3D JUMPER WIRES ================= */}
      {jumpers.map((j, i) => (
        <mesh key={`j-${i}`} geometry={j.geo}>
          <meshStandardMaterial color={j.color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
};

export const IoTInternal3DPreview: React.FC = () => {
  const [xrayShell, setXrayShell] = useState(true);
  const [openFaceplate, setOpenFaceplate] = useState(true);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#071022] to-slate-950 overflow-hidden">
      {/* Top-Left HUD */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-slate-100">3D Jeroan IoT Box (Live Simulator)</span>
        </div>
      </div>

      {/* Top-Right X-Ray & Faceplate Toggles */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-sm">
        <button
          onClick={() => setXrayShell(!xrayShell)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
            xrayShell
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>X-Ray</span>
        </button>
        <button
          onClick={() => setOpenFaceplate(!openFaceplate)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
            openFaceplate
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Buka Faceplate</span>
        </button>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900/85 border border-slate-800">
        ESP32 38-Pin + Screw Terminal • Buck 12V→5V • Relay 4-Ch • Buzzer • Kipas 40mm 5V • Live OLED
      </div>

      <Canvas
        camera={{ position: [120, 95, 175], fov: 35, near: 1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#050a16']} />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer form="rect" intensity={2.2} position={[0, 220, 120]} scale={[320, 150, 1]} color="#f0f9ff" />
            <Lightformer form="rect" intensity={1.2} position={[-200, 90, -100]} rotation={[0, Math.PI / 2, 0]} scale={[240, 140, 1]} color="#7dd3fc" />
          </group>
        </Environment>

        <ambientLight intensity={0.6} />
        <directionalLight position={[120, 190, 160]} intensity={1.4} />
        <directionalLight position={[-120, 100, -120]} intensity={0.6} color="#93c5fd" />

        <InternalElectronicsScene xrayShell={xrayShell} openFaceplate={openFaceplate} />

        <Grid
          position={[0, -0.5, 0]}
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
          target={[0, 38, 0]}
          minDistance={65}
          maxDistance={500}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
