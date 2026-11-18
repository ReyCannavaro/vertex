import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CaseDimensions } from '../../types/cad';

/**
 * Generates a crisp procedural CanvasTexture simulating a live 0.96" Ice Blue OLED readout.
 */
export function createOledScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#030812';
    ctx.fillRect(0, 0, 256, 128);

    // Top yellow-blue split bar feel of classic 0.96" OLED
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('VERTEX MINI-DC', 14, 28);

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 38);
    ctx.lineTo(244, 38);
    ctx.stroke();

    ctx.fillStyle = '#A0E6FF';
    ctx.font = 'bold 19px monospace';
    ctx.fillText('TEMP : 34.2 C', 14, 66);
    ctx.fillText('FAN  : 1450 RPM', 14, 92);
    ctx.fillText('NODES: 3 ONLINE', 14, 116);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SpinningFanBlades: React.FC<{ radius: number; ledColor: string }> = ({
  radius,
  ledColor,
}) => {
  const rotorRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z -= delta * 7.5;
    }
  });

  return (
    <group ref={rotorRef}>
      {/* Central Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.28, radius * 0.28, 8, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* 7 Translucent Cyan-lit Blades */}
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, 0, angle]}>
            <mesh position={[radius * 0.56, 0, 0]} rotation={[0.45, 0, 0]}>
              <boxGeometry args={[radius * 0.65, radius * 0.22, 2]} />
              <meshStandardMaterial
                color={ledColor}
                emissive={ledColor}
                emissiveIntensity={1.6}
                roughness={0.2}
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const LaptopUnit: React.FC<{
  position: [number, number, number];
  maxWidth: number;
  maxDepth: number;
}> = ({ position, maxWidth, maxDepth }) => {
  const padW = Math.min(315, maxWidth - 26);
  const padD = Math.min(245, maxDepth - 40);
  const lapW = padW - 14;
  const lapD = padD - 18;

  return (
    <group position={position}>
      {/* Cooling Pad Mesh Stand */}
      <mesh position={[0, 9, 0]} rotation={[0.04, 0, 0]}>
        <boxGeometry args={[padW, 18, padD]} />
        <meshStandardMaterial color="#171b22" roughness={0.72} metalness={0.22} />
      </mesh>
      {/* Cooling pad rubber lip */}
      <mesh position={[0, 18, padD / 2 - 4]}>
        <boxGeometry args={[padW * 0.65, 6, 5]} />
        <meshStandardMaterial color="#0f131a" roughness={0.8} />
      </mesh>

      {/* Closed Laptop Chassis */}
      <group position={[0, 26, -2]} rotation={[0.04, 0, 0]}>
        {/* Lower Base */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[lapW, 11, lapD]} />
          <meshStandardMaterial color="#1f252e" roughness={0.45} metalness={0.35} />
        </mesh>
        {/* Top Lid */}
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[lapW - 2, 6, lapD - 2]} />
          <meshStandardMaterial color="#272e3a" roughness={0.32} metalness={0.48} />
        </mesh>
        {/* Subtle metallic logo accent */}
        <mesh position={[0, 11.7, 0]}>
          <boxGeometry args={[28, 0.8, 6]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

interface HardwareMockupProps {
  dims: CaseDimensions;
  ledEnabled: boolean;
  ledColor: string;
  middleEnabled: boolean;
}

export const HardwareMockup: React.FC<HardwareMockupProps> = ({
  dims,
  ledEnabled,
  ledColor,
  middleEnabled,
}) => {
  const { length: L, width: W, height: H, thickness: t, dividerX, middleTrayY } = dims;
  const halfL = L / 2;

  const pcBayLeft = -halfL + t;
  const pcBayRight = -halfL + dividerX - t / 2;
  const pcBayCenterX = (pcBayLeft + pcBayRight) / 2;
  const pcBayWidth = Math.max(80, pcBayRight - pcBayLeft);

  const lapBayLeft = -halfL + dividerX + t / 2;
  const lapBayRight = halfL - t;
  const lapBayCenterX = (lapBayLeft + lapBayRight) / 2;
  const lapBayWidth = Math.max(120, lapBayRight - lapBayLeft);

  const oledTex = useMemo(() => createOledScreenTexture(), []);

  // Curved black braided interconnect cable from Upper Fan Pod down to Lower IoT Box
  const cableGeometry = useMemo(() => {
    const xOut = halfL + 18;
    const upperY = H * 0.72;
    const lowerY = H * 0.28;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xOut, upperY - 46, 12),
      new THREE.Vector3(xOut + 8, (upperY + lowerY) / 2 + 12, 26),
      new THREE.Vector3(xOut + 6, (upperY + lowerY) / 2 - 12, 24),
      new THREE.Vector3(xOut, lowerY + 34, 10),
    ]);
    return new THREE.TubeGeometry(curve, 24, 3.2, 10, false);
  }, [halfL, H]);

  return (
    <group>
      {/* ================= LEFT BAY: PC SERVER HARDWARE ================= */}
      <group>
        {/* Motherboard (mounted vertically on back-left standoffs) */}
        <group position={[pcBayCenterX, H * 0.62, -W * 0.16]}>
          {/* Dark PCB */}
          <mesh>
            <boxGeometry args={[Math.min(180, pcBayWidth - 24), Math.min(200, H * 0.48), 4]} />
            <meshStandardMaterial color="#141820" roughness={0.55} metalness={0.25} />
          </mesh>
          {/* VRM / I/O Shroud with subtle cyan accent */}
          <mesh position={[-Math.min(62, pcBayWidth * 0.28), 32, 14]}>
            <boxGeometry args={[32, 95, 24]} />
            <meshStandardMaterial color="#1f2735" roughness={0.35} metalness={0.55} />
          </mesh>
          {/* Round Stock CPU Cooler */}
          <group position={[0, 30, 24]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[36, 38, 34, 24]} />
              <meshStandardMaterial color="#181d26" roughness={0.45} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0, 18]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[12, 12, 3, 18]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
          {/* 2x RAM Sticks */}
          {[48, 57].map((rx, i) => (
            <mesh key={i} position={[rx, 30, 16]}>
              <boxGeometry args={[5, 86, 22]} />
              <meshStandardMaterial color="#11161f" roughness={0.3} metalness={0.6} />
            </mesh>
          ))}
          {/* Horizontal PCIe / GPU Card */}
          <mesh position={[6, -34, 38]}>
            <boxGeometry args={[Math.min(160, pcBayWidth - 34), 22, 72]} />
            <meshStandardMaterial color="#1c222d" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>

        {/* ATX PSU sitting on Bottom Floor */}
        <group position={[pcBayLeft + Math.min(82, pcBayWidth * 0.42), t + 42, 35]}>
          <mesh>
            <boxGeometry args={[Math.min(136, pcBayWidth - 40), 82, 140]} />
            <meshStandardMaterial color="#161a22" roughness={0.55} metalness={0.35} />
          </mesh>
          {/* Top PSU Fan Grille */}
          <mesh position={[0, 41.5, 0]}>
            <cylinderGeometry args={[46, 46, 1.5, 24]} />
            <meshStandardMaterial color="#0b0e14" roughness={0.7} />
          </mesh>
        </group>

        {/* 3.5" / 2.5" HDD sitting next to PSU */}
        <group position={[pcBayRight - 36, t + 11, 88]}>
          <mesh>
            <boxGeometry args={[56, 20, 96]} />
            <meshStandardMaterial color="#1a1f28" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 10.4, 0]}>
            <boxGeometry args={[46, 1, 78]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.75} />
          </mesh>
        </group>
      </group>

      {/* ================= RIGHT BAY: DUAL-TIER LAPTOP SERVERS ================= */}
      <group>
        {/* Bottom Laptop on Cooling Pad */}
        <LaptopUnit
          position={[lapBayCenterX, t, 8]}
          maxWidth={lapBayWidth}
          maxDepth={W - t * 2}
        />

        {/* Upper Laptop on Right-Bay Middle Shelf */}
        {middleEnabled && (
          <LaptopUnit
            position={[lapBayCenterX, middleTrayY + t / 2, 8]}
            maxWidth={lapBayWidth}
            maxDepth={W - t * 2}
          />
        )}

        {/* White DHT22 Temp/Humidity Sensor hanging near top-back */}
        <mesh position={[lapBayLeft + 34, H - t - 42, -W / 2 + 24]}>
          <boxGeometry args={[16, 22, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
      </group>

      {/* ================= RIGHT EXTERIOR WALL: FAN POD + IOT BOX ================= */}
      <group>
        {/* Upper Exterior 3D-Printed Fan Pod (matches photo top-right) */}
        <group position={[halfL + 22, H * 0.72, 0]}>
          {/* Matte Black Rounded Body */}
          <mesh>
            <boxGeometry args={[42, 104, 104]} />
            <meshStandardMaterial color="#181c24" roughness={0.5} metalness={0.22} />
          </mesh>
          {/* Side Louver Vent Strips */}
          {[-30, -18, -6, 6, 18, 30].map((ly, i) => (
            <mesh key={i} position={[0, ly, 52.5]}>
              <boxGeometry args={[28, 4.5, 1.2]} />
              <meshStandardMaterial color="#090b10" roughness={0.9} />
            </mesh>
          ))}
          {/* Glowing Blue Fan Ring & Spinning Rotor on Outer Face */}
          <group position={[21.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh>
              <cylinderGeometry args={[40, 40, 2, 32]} />
              <meshStandardMaterial color="#050810" roughness={0.8} />
            </mesh>
            <SpinningFanBlades
              radius={36}
              ledColor={ledEnabled ? ledColor : '#38bdf8'}
            />
          </group>
        </group>

        {/* Lower Exterior 3D-Printed Midnight ESP32 IoT Controller Box (matches photo bottom-right) */}
        <group position={[halfL + 22, H * 0.28, 0]}>
          {/* Matte Black Body */}
          <mesh>
            <boxGeometry args={[42, 74, 118]} />
            <meshStandardMaterial color="#181c24" roughness={0.5} metalness={0.22} />
          </mesh>
          {/* Side Louver Vent Strips */}
          {[-20, -10, 0, 10, 20].map((ly, i) => (
            <mesh key={i} position={[0, ly, 59.5]}>
              <boxGeometry args={[26, 4, 1.2]} />
              <meshStandardMaterial color="#090b10" roughness={0.9} />
            </mesh>
          ))}
          {/* 4 Silver Corner Faceplate M3 Screws */}
          {[
            [-28, -50],
            [28, -50],
            [28, 50],
            [-28, 50],
          ].map(([sy, sz], idx) => (
            <mesh
              key={idx}
              position={[21.6, sy, sz]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[2.2, 2.2, 1.5, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
          {/* Live Glowing Ice Blue 0.96" OLED Telemetry Display */}
          <mesh position={[21.6, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[52, 26]} />
            <meshStandardMaterial
              map={oledTex}
              emissiveMap={oledTex}
              emissive="#A0E6FF"
              emissiveIntensity={1.6}
              roughness={0.2}
            />
          </mesh>
        </group>

        {/* Braided Black Interconnect Cable between Upper Fan Pod & Lower IoT Box */}
        <mesh geometry={cableGeometry}>
          <meshStandardMaterial color="#111318" roughness={0.75} metalness={0.15} />
        </mesh>
      </group>
    </group>
  );
};
