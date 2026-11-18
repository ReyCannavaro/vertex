import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { Eye, Layers } from 'lucide-react';
import { IOT_PRESETS, useCadStore } from '../../store/useCadStore';
import { computeEffectiveIoTState, EffectiveIoTState } from '../../utils/iotSimulation';
import {
  buildIoTBoxGeometry,
  buildIoTBoxLidGeometry,
  getFaceplateScrewOffsets,
} from '../../utils/csgBuilder';
import { IoTBoxParams, IoTSimState } from '../../types/cad';

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
      {/* 40x40x10mm 5V Fan Frame seated cleanly inside right-side CSG 40mm cutout */}
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
      <mesh>
        <boxGeometry args={[16, 15, 2]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 5.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.8, 5.8, 9, 20]} />
        <meshStandardMaterial color="#0f1218" roughness={0.45} />
      </mesh>
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
  vizBox: IoTBoxParams;
  xrayShell: boolean;
  openFaceplate: boolean;
}> = ({ vizBox, xrayShell, openFaceplate }) => {
  const iotSim = useCadStore((s) => s.iotSim);
  const doorLeftAngle = useCadStore((s) => s.doorLeftAngle);
  const doorRightAngle = useCadStore((s) => s.doorRightAngle);
  const ledColor = useCadStore((s) => s.ledColor);

  const faceplateGroupRef = useRef<THREE.Group>(null);
  const lidBaseZ = vizBox.width / 2 - vizBox.wallThickness / 2;
  const currentLidZRef = useRef(openFaceplate ? lidBaseZ + 36 : lidBaseZ);

  const eff = useMemo(
    () => computeEffectiveIoTState(iotSim, doorLeftAngle, doorRightAngle, ledColor),
    [iotSim, doorLeftAngle, doorRightAngle, ledColor]
  );

  // EXACT SAME CSG-generated 3D-Print geometry as Module 2!
  const housingGeo = useMemo(() => buildIoTBoxGeometry(vizBox), [vizBox]);
  const faceplateGeo = useMemo(() => buildIoTBoxLidGeometry(vizBox), [vizBox]);
  const screwOffsets = useMemo(() => getFaceplateScrewOffsets(vizBox), [vizBox]);

  useEffect(() => {
    return () => housingGeo.dispose();
  }, [housingGeo]);

  useEffect(() => {
    return () => faceplateGeo.dispose();
  }, [faceplateGeo]);

  const oledTex = useMemo(() => createDynamicOledTexture(iotSim, eff), [iotSim, eff]);
  useEffect(() => {
    return () => oledTex.dispose();
  }, [oledTex]);

  // Smooth spring-damped open/close animation for the 3D-printed front faceplate
  useFrame((_, delta) => {
    const targetZ = openFaceplate ? lidBaseZ + 38 : lidBaseZ;
    currentLidZRef.current = THREE.MathUtils.damp(
      currentLidZRef.current,
      targetZ,
      6.5,
      Math.min(delta, 0.05)
    );
    if (faceplateGroupRef.current) {
      faceplateGroupRef.current.position.z = currentLidZRef.current;
    }
  });

  const { length: L, height: H, width: W, wallThickness: t } = vizBox;
  const centerY = H / 2;
  const bodyDepth = Math.max(18, W - t);
  const bodyCenterZ = -t / 2;
  const backWallInnerZ = bodyCenterZ - bodyDepth / 2 + t;
  const standoffTopZ = backWallInnerZ + Math.min(8, bodyDepth - t - 10);

  // True 1:1 mm component coordinates inside 196×126×64mm roomy IoT Box (zero overlap, clear of rear cable slot at Y=42!)
  const espPos: [number, number, number] = [-46, centerY + 24, standoffTopZ + 1.2];
  const relayPos: [number, number, number] = [40, centerY + 24, standoffTopZ + 1.2];
  const buckPos: [number, number, number] = [-56, 21, backWallInnerZ + 3];
  const buzzerPos: [number, number, number] = [-4, 20, backWallInnerZ + 3];
  const levelPos: [number, number, number] = [28, 20, backWallInnerZ + 2.5];
  const wagoPos: [number, number, number] = [62, 21, backWallInnerZ + 7];

  // Internal 3D jumper harnesses connecting Buck -> ESP32 -> Level Shifter -> 4-Ch Relay -> OLED -> 5V Fan
  const jumpers = useMemo(() => {
    const zBase = backWallInnerZ + 8;
    const zTop = standoffTopZ + 5;
    const specs: Array<{ pts: [number, number, number][]; color: string }> = [
      // +5V Buck XL4015 -> ESP32 VIN & Relay VCC
      { pts: [[-34, 28, zBase], [-36, 46, zTop + 4], [-36, centerY - 6, zTop]], color: '#f97316' },
      { pts: [[-34, 24, zBase], [8, 46, zTop + 5], [22, centerY - 2, zTop]], color: '#f97316' },
      // Common GND Bus -> Wago Lever Block
      { pts: [[-34, 20, zBase], [12, 34, zBase + 3], [52, 24, zBase + 3]], color: '#64748b' },
      // 4x Relay Control Signals (ESP32 Screw Terminal -> Red 4-Ch Relay Optocoupler IN1..IN4)
      { pts: [[-9, centerY + 28, zTop], [-1, centerY + 26, zTop + 7], [6, centerY + 24, zTop + 2]], color: '#a855f7' },
      { pts: [[-9, centerY + 20, zTop], [-1, centerY + 18, zTop + 7], [6, centerY + 18, zTop + 2]], color: '#c084fc' },
      // Logic Level Shifter 4-Ch -> ESP32 GPIO35 & GPIO13
      { pts: [[28, 30, zBase + 2], [4, 42, zTop + 5], [-18, centerY - 6, zTop]], color: '#06b6d4' },
      // Relay CH4 5V -> Right-Side 40×40×10mm 5V Fan
      { pts: [[74, centerY + 14, zTop + 2], [82, centerY + 8, bodyCenterZ + 4], [L / 2 - t - 8, centerY, bodyCenterZ]], color: '#f97316' },
      // ESP32 GPIO5 -> Active Buzzer 5V
      { pts: [[-22, centerY - 8, zTop], [-14, 42, zBase + 5], [-6, 28, zBase + 2]], color: '#ec4899' },
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
  }, [L, t, centerY, backWallInnerZ, standoffTopZ, bodyCenterZ]);

  useEffect(() => {
    return () => jumpers.forEach((j) => j.geo.dispose());
  }, [jumpers]);

  return (
    <group>
      {/* ================= EXACT 3D-PRINT CSG HOUSING (IDENTICAL TO MODULE 2 STL • 196×126×64mm!) ================= */}
      {/* Includes rounded corners, left intake louvers, right 40mm fan cutout, 4x corner bosses,
          8x internal standoffs (4x ESP32 + 4x Relay), wide rear cable slot, and 4x rear captive M3 hex-nut bosses! */}
      <mesh geometry={housingGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#171b23"
          roughness={0.44}
          metalness={0.18}
          transparent={xrayShell}
          opacity={xrayShell ? 0.36 : 1.0}
          depthWrite={!xrayShell}
        />
        <Edges
          threshold={26}
          color={xrayShell ? '#38bdf8' : '#475569'}
          scale={1.001}
          opacity={xrayShell ? 0.55 : 0.45}
          transparent
        />
      </mesh>

      {/* ================= 1. ESP32 38-PIN + SCREW TERMINAL EXTENDER (TRUE 1:1 • 78×63×22mm) ================= */}
      <group position={espPos}>
        {/* Green 38-Pin Expansion Carrier Board (78 × 63 × 2 mm) */}
        <mesh>
          <boxGeometry args={[78, 63, 2.0]} />
          <meshStandardMaterial color="#15803d" roughness={0.55} metalness={0.18} />
        </mesh>
        {/* Top & Bottom 19-Pin Blue/Green Screw Terminal Rails */}
        <mesh position={[0, 26, 4.5]}>
          <boxGeometry args={[68, 7.5, 7.5]} />
          <meshStandardMaterial color="#16a34a" roughness={0.45} />
        </mesh>
        <mesh position={[0, -26, 4.5]}>
          <boxGeometry args={[68, 7.5, 7.5]} />
          <meshStandardMaterial color="#16a34a" roughness={0.45} />
        </mesh>
        {/* ESP32 DevKitC 38-Pin Dark PCB (55 × 28 mm) mounted in female headers */}
        <mesh position={[0, 0, 8.5]}>
          <boxGeometry args={[55, 28, 2.0]} />
          <meshStandardMaterial color="#111827" roughness={0.45} metalness={0.3} />
        </mesh>
        {/* Metallic ESP-WROOM-32 WiFi RF Shield */}
        <mesh position={[-13, 0, 11.2]}>
          <boxGeometry args={[18, 16, 3.2]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
        </mesh>
        {/* USB-C Port */}
        <mesh position={[25, 0, 10.2]}>
          <boxGeometry args={[7, 9, 3.2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Power Red LED + WiFi Blue LED */}
        <mesh position={[15, 7.5, 10.2]}>
          <sphereGeometry args={[1.2, 10, 10]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh position={[15, -7.5, 10.2]}>
          <sphereGeometry args={[1.2, 10, 10]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>

      {/* ================= 2. RED PCB RELAY MODULE 4-CHANNEL 5V OPTOCOUPLER (TRUE 1:1 • 73×50×20mm) ================= */}
      <group position={relayPos}>
        {/* Red PCB Board matching High/Low Level Optocoupler 4-Ch 5V module (73 × 50 × 2 mm) */}
        <mesh>
          <boxGeometry args={[73, 50, 2.0]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.48} metalness={0.18} />
        </mesh>
        {/* 4x Iconic Blue Songle 5V 10A Relay Cubes + Blue Screw Terminal Blocks + Yellow H/L Jumpers */}
        {[
          { x: -24, on: eff.relayPcOn },
          { x: -8, on: eff.relayLapTopOn },
          { x: 8, on: eff.relayLapBotOn },
          { x: 24, on: eff.relayIotOn },
        ].map((ch, idx) => (
          <group key={idx} position={[ch.x, 2, 8.5]}>
            {/* Blue Relay Cube (15 × 19 × 15 mm) */}
            <mesh>
              <boxGeometry args={[14.5, 19, 15]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.38} metalness={0.12} />
            </mesh>
            {/* 3-Pin Blue Output Screw Terminal Block (NO / COM / NC) */}
            <mesh position={[0, 16, -2.5]}>
              <boxGeometry args={[14.5, 8.5, 10]} />
              <meshStandardMaterial color="#0284c7" roughness={0.45} />
            </mesh>
            {/* Yellow High/Low Level Trigger Jumper Cap */}
            <mesh position={[0, -14.5, -4.5]}>
              <boxGeometry args={[4.5, 6.5, 5.5]} />
              <meshStandardMaterial color="#eab308" roughness={0.4} />
            </mesh>
            {/* Live Channel Trigger LED */}
            <mesh position={[0, -20.5, -6.8]}>
              <sphereGeometry args={[1.4, 10, 10]} />
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

      {/* ================= 3. BUCK CONVERTER 12V -> 5V XL4015 5A (TRUE 1:1 • 54×24×16mm) ================= */}
      <group position={buckPos}>
        <mesh>
          <boxGeometry args={[54, 24, 2.0]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
        </mesh>
        {/* Copper Toroid Inductor */}
        <mesh position={[-8, 0, 6.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[6.2, 2.8, 10, 20]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.28} />
        </mesh>
        {/* Blue Trimpot Voltage Adjuster */}
        <mesh position={[12, 5.5, 5.2]}>
          <boxGeometry args={[9.5, 5.0, 9.0]} />
          <meshStandardMaterial color="#2563eb" roughness={0.4} />
        </mesh>
        {/* 2x Electrolytic Capacitors */}
        {[-21, 21].map((cx, ci) => (
          <mesh key={ci} position={[cx, 0, 6.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[4.2, 4.2, 10.5, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ================= 4. ACTIVE BUZZER 5V (32×13mm) + LOGIC LEVEL SHIFTER (16×13mm) + WAGO 221 ================= */}
      <BuzzerModule3D active={eff.buzzerActive} position={buzzerPos} />

      <group position={levelPos}>
        <mesh>
          <boxGeometry args={[16, 13, 2.0]} />
          <meshStandardMaterial color="#0284c7" roughness={0.45} metalness={0.2} />
        </mesh>
        {[-4.2, -1.4, 1.4, 4.2].map((my, i) => (
          <mesh key={i} position={[0, my, 1.4]}>
            <boxGeometry args={[3.2, 1.9, 1.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* 2x Wago 221 Lever Power Distribution Blocks (12V/5V/GND Zero-Solder Splitters!) */}
      <group position={wagoPos}>
        <mesh>
          <boxGeometry args={[24, 18, 12]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.65} roughness={0.3} />
        </mesh>
        {[-7, 0, 7].map((wx, wi) => (
          <mesh key={wi} position={[wx, 4, 6.5]}>
            <boxGeometry args={[5.2, 8.5, 2.2]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ================= 5. RIGHT-SIDE 40mm 5V CROSS-FLOW FAN (ALIGNED WITH CSG CUTOUT) ================= */}
      <Spinning5VFan
        active={eff.relayIotOn}
        position={[L / 2 - t - 5.5, centerY, bodyCenterZ]}
      />

      {/* ================= 6. EXACT 3D-PRINT CSG FRONT FACEPLATE + LIVE OLED + 4x M3 BOLTS ================= */}
      <group ref={faceplateGroupRef} position={[0, 0, lidBaseZ]}>
        <mesh geometry={faceplateGeo} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#1c212b"
            roughness={0.42}
            metalness={0.2}
            transparent={xrayShell}
            opacity={xrayShell ? 0.55 : 1.0}
            depthWrite={!xrayShell}
          />
          <Edges
            threshold={26}
            color={xrayShell ? '#38bdf8' : '#64748b'}
            scale={1.001}
            opacity={0.55}
            transparent
          />
        </mesh>

        {/* 4x Flush Silver M3 Socket Bolts aligned to CSG Countersunk Pockets */}
        {screwOffsets.map(([sx, sy], i) => (
          <mesh
            key={`bolt-${i}`}
            position={[sx, centerY + sy, t / 2 + 0.3]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[2.3, 2.3, 1.4, 14]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* OLED 0.96" I2C PCB & Live Dynamic Screen seated inside CSG Faceplate Window */}
        <group position={[0, centerY, -t / 2 - 1.2]}>
          <mesh position={[0, 0, -1.2]}>
            <boxGeometry args={[27.5, 27.5, 1.8]} />
            <meshStandardMaterial color="#0c2d48" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.4]}>
            <planeGeometry args={[25.6, 13.6]} />
            <meshStandardMaterial
              map={oledTex}
              emissiveMap={oledTex}
              emissive={eff.smokeAlarm ? '#ef4444' : '#A0E6FF'}
              emissiveIntensity={1.65}
              roughness={0.15}
            />
          </mesh>
        </group>
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
  const iotBox = useCadStore((s) => s.iotBox);

  // Sync live with Module 2's IoT Box dimensions whenever Module 2 is on an Opsi D IoT Box;
  // fallback to controller-pod preset if Module 2 is currently previewing a 120/140mm Fan Shroud.
  const vizBox: IoTBoxParams = useMemo(() => {
    if (iotBox.fanPlacement === 'side' && iotBox.hasOled) {
      return { ...iotBox, hasLid: true };
    }
    return IOT_PRESETS['controller-pod'];
  }, [iotBox]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-[#071022] to-slate-950 overflow-hidden">
      {/* Top-Left HUD */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-slate-100">3D Jeroan IoT Box (1:1 CSG Print)</span>
          <span className="text-slate-400">•</span>
          <span className="text-sky-300 font-mono">
            {vizBox.length}×{vizBox.height}×{vizBox.width}mm
          </span>
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
          <span>{xrayShell ? 'X-Ray' : 'Solid'}</span>
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
          <span>{openFaceplate ? 'Tutup Faceplate' : 'Buka Faceplate'}</span>
        </button>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900/85 border border-slate-800">
        1:1 Real-Scale 196×126×64mm • ESP32 Extender (78×63) • Relay 4-Ch 5V (73×50) • XL4015 • Buzzer • Wago • Fan 40mm
      </div>

      <Canvas
        shadows
        camera={{ position: [185, 135, 265], fov: 35, near: 1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#050a16']} />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer form="rect" intensity={2.3} position={[0, 220, 120]} scale={[320, 150, 1]} color="#f0f9ff" />
            <Lightformer form="rect" intensity={1.3} position={[-200, 90, -100]} rotation={[0, Math.PI / 2, 0]} scale={[240, 140, 1]} color="#7dd3fc" />
            <Lightformer form="rect" intensity={1.0} position={[200, 80, 120]} rotation={[0, -Math.PI / 2, 0]} scale={[240, 140, 1]} color="#bae6fd" />
          </group>
        </Environment>

        <ambientLight intensity={0.6} />
        <directionalLight position={[120, 190, 160]} intensity={1.45} castShadow />
        <directionalLight position={[-120, 100, -120]} intensity={0.65} color="#93c5fd" />

        <InternalElectronicsScene
          vizBox={vizBox}
          xrayShell={xrayShell}
          openFaceplate={openFaceplate}
        />

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
          target={[0, vizBox.height * 0.5, 0]}
          minDistance={60}
          maxDistance={500}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
