import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { CaseDimensions, PanelHole } from '../../types/cad';

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

/**
 * Procedural fine perforated magnetic dust-filter mesh texture.
 */
function createDustMeshTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 64; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 64);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(64, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 22);
  tex.needsUpdate = true;
  return tex;
}

const SpinningFanBlades: React.FC<{
  radius: number;
  ledColor: string;
  active?: boolean;
}> = ({ radius, ledColor, active = true }) => {
  const rotorRef = useRef<THREE.Group>(null);
  const speedRef = useRef(active ? 7.5 : 0);
  useFrame((_, delta) => {
    speedRef.current = THREE.MathUtils.damp(speedRef.current, active ? 7.5 : 0, 3.5, delta);
    if (rotorRef.current) {
      rotorRef.current.rotation.z -= delta * speedRef.current;
    }
  });

  return (
    <group ref={rotorRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.28, radius * 0.28, 8, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.5} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, 0, angle]}>
            <mesh position={[radius * 0.56, 0, 0]} rotation={[0.45, 0, 0]}>
              <boxGeometry args={[radius * 0.65, radius * 0.22, 2]} />
              <meshStandardMaterial
                color={active ? ledColor : '#475569'}
                emissive={active ? ledColor : '#000000'}
                emissiveIntensity={active ? 1.6 : 0}
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

/**
 * Builds a sleek, slim, rounded-corner matte-black 3D-printed fan shroud housing
 * matching the Midnight IoT Pod aesthetic so top & bottom fans look ultra-tidy inside clear acrylic.
 */
function createSlimFanShroudGeo(
  outerSize: number,
  holeRadius: number,
  shroudHeight: number,
  cornerRadius: number
): THREE.ExtrudeGeometry {
  const hw = outerSize / 2;
  const r = cornerRadius;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hw);
  shape.lineTo(hw - r, -hw);
  shape.quadraticCurveTo(hw, -hw, hw, -hw + r);
  shape.lineTo(hw, hw - r);
  shape.quadraticCurveTo(hw, hw, hw - r, hw);
  shape.lineTo(-hw + r, hw);
  shape.quadraticCurveTo(-hw, hw, -hw, hw - r);
  shape.lineTo(-hw, -hw + r);
  shape.quadraticCurveTo(-hw, -hw, -hw + r, -hw);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hole);

  const innerDepth = Math.max(4, shroudHeight - 2.4);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness: 1.2,
    bevelSize: 1.1,
    bevelSegments: 2,
    curveSegments: 28,
  });
  geo.translate(0, 0, -innerDepth / 2);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Slim Rounded Matte-Black Fan Shroud Housing + Spinning Ice-Blue Fan + Finger Guard + Rear PWM Cable.
 * Used for all Top & Bottom fans (120mm Laptop Bay & 140mm PC Bay) for a clean transparent showcase build.
 */
const MountedCaseFan3D: React.FC<{
  size: 120 | 140;
  position: [number, number, number];
  mountSide: 'bottom' | 'top';
  rearWallZ: number;
  ledColor: string;
  ledEnabled: boolean;
  fanActive: boolean;
}> = ({ size, position, mountSide, rearWallZ, ledColor, ledEnabled, fanActive }) => {
  const outerSize = size + 14; // 134mm for 120mm fan, 154mm for 140mm fan
  const shroudH = 22; // slim low-profile housing
  const cornerR = size === 140 ? 12 : 11;
  const holeR = (size - 5) / 2;
  const bladeR = holeR - 3;
  const mountPitch = size === 140 ? 62.25 : 52.5;
  const screwCorner = outerSize / 2 - 9.5;
  const activeColor = ledEnabled ? ledColor : '#38bdf8';

  // Inner-facing side where finger-guard grille & faceplate bolts sit
  const innerFaceY = mountSide === 'bottom' ? shroudH / 2 + 0.6 : -shroudH / 2 - 0.6;

  const shroudGeo = useMemo(
    () => createSlimFanShroudGeo(outerSize, holeR, shroudH, cornerR),
    [outerSize, holeR, shroudH, cornerR]
  );

  useEffect(() => {
    return () => shroudGeo.dispose();
  }, [shroudGeo]);

  // Tidy rear PWM wire routed from back of shroud straight into the Rear Wiring Partition
  const cableLen = Math.max(12, position[2] - outerSize / 2 - rearWallZ + 6);

  return (
    <group position={position}>
      {/* Main Slim Rounded Matte-Black 3D-Printed Fan Housing */}
      <mesh geometry={shroudGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#161a22" roughness={0.44} metalness={0.22} />
        <Edges threshold={26} color="#475569" scale={1.001} opacity={0.45} transparent />
      </mesh>

      {/* Subtle Front-Edge Micro-Louver Accent Grooves (matches side IoT Pod styling) */}
      {[-28, 0, 28].map((lx, i) => (
        <mesh key={`accent-${i}`} position={[lx, 0, outerSize / 2 + 1.15]}>
          <boxGeometry args={[20, 3.2, 0.8]} />
          <meshStandardMaterial color="#0b0e14" roughness={0.9} />
        </mesh>
      ))}

      {/* Recessed Glowing Ice-Blue LED Diffuser Ring inside the shroud tunnel */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[holeR - 1.2, 2.0, 10, 36]} />
        <meshStandardMaterial
          color={fanActive ? activeColor : '#334155'}
          emissive={fanActive ? activeColor : '#000000'}
          emissiveIntensity={fanActive && ledEnabled ? 2.4 : 0.15}
          toneMapped={false}
        />
      </mesh>

      {/* Spinning Fan Rotor neatly recessed inside the slim shroud */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <SpinningFanBlades radius={bladeR} ledColor={activeColor} active={fanActive} />
      </group>

      {/* Slim Protective Concentric Fan Grille Ring + 4 Cross Struts on Interior Face */}
      <group position={[0, innerFaceY, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[holeR * 0.62, 1.3, 8, 32]} />
          <meshStandardMaterial color="#1f2633" roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[holeR * 2, 1.8, 2.4]} />
          <meshStandardMaterial color="#1f2633" roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh rotation={[0, -Math.PI / 4, 0]}>
          <boxGeometry args={[holeR * 2, 1.8, 2.4]} />
          <meshStandardMaterial color="#1f2633" roughness={0.45} metalness={0.4} />
        </mesh>
      </group>

      {/* 4 Flush Silver M4 Shroud Corner Bolts (matching IoT Pod faceplate screws) */}
      {[
        [-screwCorner, -screwCorner],
        [screwCorner, -screwCorner],
        [screwCorner, screwCorner],
        [-screwCorner, screwCorner],
      ].map(([sx, sz], i) => (
        <mesh key={`sc-${i}`} position={[sx, innerFaceY, sz]}>
          <cylinderGeometry args={[2.3, 2.3, 1.6, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.22} />
        </mesh>
      ))}

      {/* 4 Internal Fan Mount Pins */}
      {[
        [-mountPitch, -mountPitch],
        [mountPitch, -mountPitch],
        [mountPitch, mountPitch],
        [-mountPitch, mountPitch],
      ].map(([sx, sz], i) => (
        <mesh key={`mp-${i}`} position={[sx, 0, sz]}>
          <cylinderGeometry args={[1.9, 1.9, shroudH + 1, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {/* Tidy Black Sleeved PWM Wire Tail routed straight back into the Rear Wiring Chamber */}
      {cableLen > 6 && (
        <mesh
          position={[0, 0, -outerSize / 2 - cableLen / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[2.0, 2.0, cableLen, 8]} />
          <meshStandardMaterial color="#11141c" roughness={0.75} />
        </mesh>
      )}
    </group>
  );
};

/**
 * Single magnetic dust filter tray with fine mesh screen and front pull handle.
 */
const SingleFilterTray: React.FC<{
  centerX: number;
  trayW: number;
  trayD: number;
  trayH: number;
  meshTex: THREE.CanvasTexture;
}> = ({ centerX, trayW, trayD, trayH, meshTex }) => {
  const frameBar = 9;
  const handleW = Math.min(64, Math.max(36, trayW * 0.34));

  return (
    <group position={[centerX, 0, 0]}>
      {/* Fine perforated charcoal filter mesh */}
      <mesh>
        <boxGeometry args={[Math.max(20, trayW - frameBar * 2), 1.4, Math.max(20, trayD - frameBar * 2)]} />
        <meshStandardMaterial
          map={meshTex}
          color="#334155"
          roughness={0.85}
          metalness={0.15}
          transparent
          opacity={0.84}
        />
      </mesh>

      {/* Perimeter Magnetic Frame Rails */}
      <mesh position={[0, 0, -trayD / 2 + frameBar / 2]}>
        <boxGeometry args={[trayW, trayH, frameBar]} />
        <meshStandardMaterial color="#181d27" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, trayD / 2 - frameBar / 2]}>
        <boxGeometry args={[trayW, trayH, frameBar]} />
        <meshStandardMaterial color="#181d27" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[-trayW / 2 + frameBar / 2, 0, 0]}>
        <boxGeometry args={[frameBar, trayH, trayD - frameBar * 2]} />
        <meshStandardMaterial color="#181d27" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[trayW / 2 - frameBar / 2, 0, 0]}>
        <boxGeometry args={[frameBar, trayH, trayD - frameBar * 2]} />
        <meshStandardMaterial color="#181d27" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Front Ergonomic Pull-Handle Tab with subtle Sky-Blue accent */}
      <mesh position={[0, -0.5, trayD / 2 + 6.5]}>
        <boxGeometry args={[handleW, trayH + 1.4, 13]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, -0.5, trayD / 2 + 13.2]}>
        <boxGeometry args={[handleW * 0.68, 2.0, 1.4]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
};

/**
 * Dual-Bay Split Magnetic Dust Filter Trays (PC Bay Tray Left + Laptop Bay Tray Right)
 * sliding cleanly through the 2 front openings of the Dual-Bay E-Track rail flanking the Center Foot.
 */
const DustFilterTray3D: React.FC<{
  dims: CaseDimensions;
  slideOut: number;
}> = ({ dims, slideOut }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentSlideRef = useRef(slideOut);

  const { length: L, width: W, thickness: t, dividerX, legHeight: legH } = dims;
  const halfL = L / 2;
  const divX = -halfL + dividerX;
  const rw = 18;
  const cHalf = 10;

  // Exact clear slot bounds inside the Dual-Bay E-Track
  const leftSlotMin = -halfL + t + rw + 2;
  const leftSlotMax = divX - cHalf - 2;
  const leftTrayW = Math.max(40, leftSlotMax - leftSlotMin);
  const leftTrayCX = (leftSlotMin + leftSlotMax) / 2;

  const rightSlotMin = divX + cHalf + 2;
  const rightSlotMax = halfL - t - rw - 2;
  const rightTrayW = Math.max(60, rightSlotMax - rightSlotMin);
  const rightTrayCX = (rightSlotMin + rightSlotMax) / 2;

  const trayD = Math.max(80, W - t * 2 - rw - 4);
  const trayH = Math.max(3, t - 1);
  const meshTex = useMemo(() => createDustMeshTexture(), []);

  useEffect(() => {
    return () => meshTex.dispose();
  }, [meshTex]);

  useFrame((_, delta) => {
    currentSlideRef.current = THREE.MathUtils.damp(
      currentSlideRef.current,
      slideOut,
      6.5,
      Math.min(delta, 0.05)
    );
    if (groupRef.current) {
      groupRef.current.position.z = 9 + currentSlideRef.current;
    }
  });

  return (
    <group ref={groupRef} position={[0, legH - t / 2, 9]}>
      {/* Tray #1: PC Bay 140mm Dust Filter (Left) */}
      <SingleFilterTray
        centerX={leftTrayCX}
        trayW={leftTrayW}
        trayD={trayD}
        trayH={trayH}
        meshTex={meshTex}
      />
      {/* Tray #2: Laptop Bay Dual-120mm Dust Filter (Right) */}
      <SingleFilterTray
        centerX={rightTrayCX}
        trayW={rightTrayW}
        trayD={trayD}
        trayH={trayH}
        meshTex={meshTex}
      />
    </group>
  );
};

/**
 * Visualizes neatly combed cables inside the Rear Acrylic Wiring Chamber:
 * - Black ATX 24-pin / CPU power bundles (PSU -> Back grommet -> Cable Comb -> Motherboard)
 * - Cobalt-Blue Cat6 Server LAN + Laptop Power bundles (Laptop Bay -> Cable Comb -> Bottom Main Exit)
 * - Cyan WS2812B LED & PWM Fan Control cables (IoT Pod -> Rear Comb -> Top/Bottom Fans)
 */
const RearWiringHarness3D: React.FC<{ dims: CaseDimensions }> = ({ dims }) => {
  const { length: L, width: W, height: H, thickness: t, dividerX, legHeight: legH, wiringDepth } =
    dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const zChamber = -halfW - wiringDepth * 0.52;
  const zInside = -halfW + 18;
  const zExit = -halfW - wiringDepth - 14;
  const combY = legH + H * 0.52;

  const pcX = -halfL + dividerX * 0.52;
  const lapCenterX = -halfL + dividerX + (L - dividerX) * 0.45;
  const rightPodX = halfL - 38;

  const cables = useMemo(() => {
    const specs: Array<{ pts: [number, number, number][]; radius: number; color: string }> = [
      // 1. Thick ATX 24-Pin Braided Bundle (PSU -> Rear Chamber -> Combed up -> PC Motherboard)
      {
        pts: [
          [pcX - 18, legH + 78, zInside],
          [pcX - 24, legH + 84, zChamber],
          [pcX - 24, combY, zChamber - 4],
          [pcX - 22, legH + H * 0.72, zChamber],
          [pcX - 12, legH + H * 0.72, zInside],
        ],
        radius: 5.2,
        color: '#181c24',
      },
      // 2. 8-Pin EPS CPU Power (Sleeved dark slate)
      {
        pts: [
          [pcX + 10, legH + 78, zInside],
          [pcX + 16, legH + 92, zChamber],
          [pcX + 16, combY, zChamber - 4],
          [pcX + 14, legH + H * 0.84, zChamber],
          [pcX + 6, legH + H * 0.84, zInside],
        ],
        radius: 3.6,
        color: '#27303f',
      },
      // 3. Main AC Power Cable from PSU -> Rear Bottom Main Exit
      {
        pts: [
          [pcX - 4, legH + 62, zInside],
          [pcX - 4, legH + 54, zChamber],
          [-26, legH + 42, zChamber],
          [-26, legH + 34, zExit],
        ],
        radius: 4.5,
        color: '#111318',
      },
      // 4. Upper Laptop DC Power Cable -> Combed down -> Rear Bottom Main Exit
      {
        pts: [
          [lapCenterX - 36, legH + H * 0.64, zInside],
          [lapCenterX - 36, legH + H * 0.62, zChamber],
          [lapCenterX - 36, combY, zChamber - 4],
          [lapCenterX - 36, legH + 62, zChamber],
          [10, legH + 38, zChamber],
          [10, legH + 34, zExit],
        ],
        radius: 3.2,
        color: '#1e2430',
      },
      // 5. Lower Laptop DC Power Cable -> Rear Bottom Main Exit
      {
        pts: [
          [lapCenterX - 12, legH + H * 0.24, zInside],
          [lapCenterX - 12, legH + H * 0.24, zChamber],
          [22, legH + 38, zChamber],
          [22, legH + 34, zExit],
        ],
        radius: 3.2,
        color: '#1e2430',
      },
      // 6. Cat6 Uplink Ethernet #1 (Upper Laptop -> Combed -> Rear Bottom Main Exit)
      {
        pts: [
          [lapCenterX + 18, legH + H * 0.64, zInside],
          [lapCenterX + 18, legH + H * 0.62, zChamber],
          [lapCenterX + 18, combY, zChamber - 4],
          [lapCenterX + 18, legH + 74, zChamber],
          [38, legH + 38, zChamber],
          [38, legH + 34, zExit],
        ],
        radius: 2.8,
        color: '#2563eb',
      },
      // 7. Cat6 Uplink Ethernet #2 (PC Motherboard -> Combed -> Rear Bottom Main Exit)
      {
        pts: [
          [pcX + 36, legH + H * 0.68, zInside],
          [pcX + 36, legH + H * 0.66, zChamber],
          [pcX + 36, combY, zChamber - 4],
          [pcX + 36, legH + 56, zChamber],
          [-6, legH + 38, zChamber],
          [-6, legH + 34, zExit],
        ],
        radius: 2.8,
        color: '#3b82f6',
      },
      // 8. Cyan WS2812B & PWM Fan Harness (Right IoT Pod -> Combed up to Top Exhaust Fans)
      {
        pts: [
          [rightPodX, legH + H * 0.28, zInside],
          [rightPodX, legH + H * 0.28, zChamber],
          [rightPodX, combY, zChamber - 4],
          [rightPodX, legH + H - t - 22, zChamber],
          [lapCenterX, legH + H - t - 22, zChamber],
          [pcX, legH + H - t - 22, zChamber],
        ],
        radius: 2.4,
        color: '#38bdf8',
      },
      // 9. Cyan Sensor & Bottom Fan PWM Harness
      {
        pts: [
          [rightPodX - 18, legH + H * 0.28, zInside],
          [rightPodX - 18, legH + H * 0.24, zChamber],
          [rightPodX - 18, legH + 26, zChamber],
          [lapCenterX, legH + 26, zChamber],
          [pcX + 20, legH + 26, zChamber],
        ],
        radius: 2.2,
        color: '#0ea5e9',
      },
    ];

    return specs.map((s) => {
      const curve = new THREE.CatmullRomCurve3(
        s.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        'catmullrom',
        0.25
      );
      return {
        geometry: new THREE.TubeGeometry(curve, 32, s.radius, 8, false),
        color: s.color,
      };
    });
  }, [L, W, H, t, dividerX, legH, wiringDepth, zChamber, zInside, zExit, combY, pcX, lapCenterX, rightPodX]);

  useEffect(() => {
    return () => {
      cables.forEach((c) => c.geometry.dispose());
    };
  }, [cables]);

  return (
    <group>
      {cables.map((c, idx) => (
        <mesh key={`wire-${idx}`} geometry={c.geometry}>
          <meshStandardMaterial color={c.color} roughness={0.62} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

const LaptopUnit: React.FC<{
  position: [number, number, number];
  maxWidth: number;
  maxDepth: number;
}> = ({ position, maxWidth, maxDepth }) => {
  // True 15.6" Laptop (e.g., Acer Aspire 5: ~363 x 242mm) with side cable clearance
  const lapW = Math.min(360, maxWidth - 38);
  const lapD = Math.min(242, maxDepth - 48);
  const padW = lapW + 10;
  const padD = lapD + 12;

  return (
    <group position={position}>
      <mesh position={[0, 9, 0]} rotation={[0.04, 0, 0]}>
        <boxGeometry args={[padW, 18, padD]} />
        <meshStandardMaterial color="#171b22" roughness={0.72} metalness={0.22} />
      </mesh>
      <mesh position={[0, 18, padD / 2 - 4]}>
        <boxGeometry args={[padW * 0.65, 6, 5]} />
        <meshStandardMaterial color="#0f131a" roughness={0.8} />
      </mesh>

      <group position={[0, 26, -2]} rotation={[0.04, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[lapW, 11, lapD]} />
          <meshStandardMaterial color="#1f252e" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[lapW - 2, 6, lapD - 2]} />
          <meshStandardMaterial color="#272e3a" roughness={0.32} metalness={0.48} />
        </mesh>
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
  bottomHoles: PanelHole[];
  topHoles: PanelHole[];
  dustFilterSlide: number;
  showWiring: boolean;
  relayPcOn: boolean;
  relayLapTopOn: boolean;
  relayLapBotOn: boolean;
  relayIotOn: boolean;
  smokeAlarm: boolean;
  doorPcOpen: boolean;
  doorLapOpen: boolean;
}

export const HardwareMockup: React.FC<HardwareMockupProps> = ({
  dims,
  ledEnabled,
  ledColor,
  middleEnabled,
  bottomHoles,
  topHoles,
  dustFilterSlide,
  showWiring,
  relayPcOn,
  relayLapTopOn,
  relayLapBotOn,
  relayIotOn,
  smokeAlarm,
  doorPcOpen,
  doorLapOpen,
}) => {
  const {
    length: L,
    width: W,
    height: H,
    thickness: t,
    dividerX,
    middleTrayY,
    legHeight: legH,
    wiringDepth,
  } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const innerL = L - t * 2;
  const innerW = W - t * 2;

  const bottomFans = useMemo(
    () => bottomHoles.filter((h) => h.type === 'fan120' || h.type === 'fan140'),
    [bottomHoles]
  );
  const topFans = useMemo(
    () => topHoles.filter((h) => h.type === 'fan120' || h.type === 'fan140'),
    [topHoles]
  );

  const pcBayLeft = -halfL + t;
  const pcBayRight = -halfL + dividerX - t / 2;
  const pcBayCenterX = (pcBayLeft + pcBayRight) / 2;
  const pcBayWidth = Math.max(80, pcBayRight - pcBayLeft);

  const lapBayLeft = -halfL + dividerX + t / 2;
  const lapBayRight = halfL - t;
  const lapBayCenterX = (lapBayLeft + lapBayRight) / 2;
  const lapBayWidth = Math.max(120, lapBayRight - lapBayLeft);

  const oledTex = useMemo(() => createOledScreenTexture(), []);
  useEffect(() => {
    return () => oledTex.dispose();
  }, [oledTex]);

  return (
    <group>
      {/* ================= SLIDE-IN BOTTOM DUST FILTER TRAY ================= */}
      <DustFilterTray3D dims={dims} slideOut={dustFilterSlide} />

      {/* ================= REAR WIRING CHAMBER CABLE HARNESS ================= */}
      {showWiring && <RearWiringHarness3D dims={dims} />}

      {/* ================= LEFT BAY: FULL FRONTAL SHOWCASE MICRO-ATX PC (244x244mm) ================= */}
      <group>
        {/* True-Scale Micro-ATX Motherboard (244 x 244mm) facing forward cleanly above ATX PSU */}
        <group position={[pcBayCenterX - 6, legH + H * 0.62, -halfW + 34]}>
          {/* Matte-Black mATX PCB (244 x 244mm) */}
          <mesh>
            <boxGeometry args={[Math.min(244, pcBayWidth - 26), Math.min(244, H * 0.58), 4]} />
            <meshStandardMaterial color="#141820" roughness={0.55} metalness={0.25} />
          </mesh>
          {/* Rear I/O + VRM Heatsink Shroud with subtle Ice-Blue accent */}
          <mesh position={[-Math.min(88, pcBayWidth * 0.32), 42, 14]}>
            <boxGeometry args={[36, 118, 24]} />
            <meshStandardMaterial color="#1f2735" roughness={0.35} metalness={0.55} />
          </mesh>
          {/* Top VRM Heatsink */}
          <mesh position={[-12, 98, 12]}>
            <boxGeometry args={[102, 20, 18]} />
            <meshStandardMaterial color="#273142" roughness={0.32} metalness={0.6} />
          </mesh>
          {/* CPU Cooler with glowing ring accent */}
          <group position={[-10, 38, 26]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[42, 44, 38, 28]} />
              <meshStandardMaterial color="#181d26" roughness={0.45} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0, 19.5]}>
              <torusGeometry args={[34, 2.2, 8, 28]} />
              <meshStandardMaterial
                color={ledEnabled ? ledColor : '#38bdf8'}
                emissive={ledEnabled ? ledColor : '#38bdf8'}
                emissiveIntensity={ledEnabled ? 1.8 : 0.2}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 0, 20]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[14, 14, 3, 18]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
          {/* 4x DDR4/DDR5 RAM DIMM Sticks */}
          {[56, 65, 74, 83].map((rx, i) => (
            <mesh key={i} position={[rx, 38, 18]}>
              <boxGeometry args={[5.5, 102, 24]} />
              <meshStandardMaterial color="#11161f" roughness={0.3} metalness={0.6} />
            </mesh>
          ))}
          {/* Horizontal Dual-Fan PCIe GPU Card */}
          <mesh position={[4, -46, 52]}>
            <boxGeometry args={[Math.min(220, pcBayWidth - 36), 34, 96]} />
            <meshStandardMaterial color="#1c222d" roughness={0.38} metalness={0.5} />
          </mesh>
        </group>

        {/* ATX PSU sitting cleanly at the back of Bottom Floor */}
        <group position={[pcBayCenterX, legH + t + 42, -halfW + 78]}>
          <mesh>
            <boxGeometry args={[Math.min(144, pcBayWidth - 36), 82, 134]} />
            <meshStandardMaterial color="#161a22" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 41.5, 0]}>
            <cylinderGeometry args={[46, 46, 1.5, 24]} />
            <meshStandardMaterial color="#0b0e14" roughness={0.7} />
          </mesh>
        </group>

        {/* 3.5" / 2.5" HDD mounted neatly beside PSU */}
        <group position={[pcBayRight - 34, legH + t + 11, halfW - 58]}>
          <mesh>
            <boxGeometry args={[52, 20, 88]} />
            <meshStandardMaterial color="#1a1f28" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 10.4, 0]}>
            <boxGeometry args={[42, 1, 70]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.75} />
          </mesh>
        </group>
      </group>

      {/* ================= TOP & BOTTOM SLIM-SHROUDED CASE FANS (SYNCED TO 4-CH RELAY) ================= */}
      <group>
        {/* Bottom Intake Fans: PC 140mm -> CH1, Laptop 120mm -> CH3 */}
        {bottomFans.map((hole) => {
          const isPcFan = hole.type === 'fan140';
          return (
            <MountedCaseFan3D
              key={`bot-fan-${hole.id}`}
              size={isPcFan ? 140 : 120}
              position={[hole.x - innerL / 2, legH + t + 11.5, hole.y - innerW / 2]}
              mountSide="bottom"
              rearWallZ={-halfW + t}
              ledColor={ledColor}
              ledEnabled={ledEnabled}
              fanActive={isPcFan ? relayPcOn : relayLapBotOn}
            />
          );
        })}

        {/* Top Exhaust Fans: PC 140mm -> CH1, Laptop 120mm -> CH2 */}
        {topFans.map((hole) => {
          const isPcFan = hole.type === 'fan140';
          return (
            <MountedCaseFan3D
              key={`top-fan-${hole.id}`}
              size={isPcFan ? 140 : 120}
              position={[hole.x - halfL, legH + H - t - 11.5, hole.y - halfW - wiringDepth]}
              mountSide="top"
              rearWallZ={-halfW + t}
              ledColor={ledColor}
              ledEnabled={ledEnabled}
              fanActive={isPcFan ? relayPcOn : relayLapTopOn}
            />
          );
        })}
      </group>

      {/* ================= RIGHT BAY: DUAL-TIER LAPTOP SERVERS ================= */}
      <group>
        <LaptopUnit
          position={[lapBayCenterX, legH + t + 25, 6]}
          maxWidth={lapBayWidth}
          maxDepth={W - t * 2}
        />

        {middleEnabled && (
          <LaptopUnit
            position={[lapBayCenterX, legH + middleTrayY + t / 2, 6]}
            maxWidth={lapBayWidth}
            maxDepth={W - t * 2}
          />
        )}
      </group>

      {/* ================= IOT SENSORS (3x DHT22, 1x MQ-2 SMOKE, 2x MC-38 DOOR, 12V ADAPTOR) ================= */}
      <group>
        {/* 3x White DHT22 Temperature/Humidity Sensors (PC Bay, Laptop Top, Laptop Bottom) */}
        {[
          { key: 'dht-pc', pos: [pcBayLeft + 34, legH + H - t - 42, -halfW + 18] as [number, number, number] },
          { key: 'dht-lap-top', pos: [lapBayLeft + 34, legH + H - t - 42, -halfW + 18] as [number, number, number] },
          { key: 'dht-lap-bot', pos: [lapBayLeft + 34, legH + middleTrayY - 36, -halfW + 18] as [number, number, number] },
        ].map((dht) => (
          <group key={dht.key} position={dht.pos}>
            <mesh>
              <boxGeometry args={[15, 22, 8]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.45} />
            </mesh>
            <mesh position={[0, -2, 4.3]}>
              <boxGeometry args={[10, 10, 0.8]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* 1x MQ-2 Smoke / Fire Safety Sensor mounted on Inner Ceiling near Center Divider */}
        <group position={[lapBayLeft + 26, legH + H - t - 9, -20]}>
          <mesh>
            <boxGeometry args={[32, 3, 22]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.45} />
          </mesh>
          {/* Iconic metallic stainless steel mesh sensor cylinder */}
          <mesh position={[-3, -8, 0]}>
            <cylinderGeometry args={[8.5, 9.2, 13, 20]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.3} />
          </mesh>
          {/* Live MQ-2 Status LED (Green = Normal, Red = Fire Alarm!) */}
          <mesh position={[10, -2.2, 0]}>
            <sphereGeometry args={[2.2, 10, 10]} />
            <meshStandardMaterial
              color={smokeAlarm ? '#ef4444' : '#22c55e'}
              emissive={smokeAlarm ? '#ef4444' : '#22c55e'}
              emissiveIntensity={3.5}
              toneMapped={false}
            />
          </mesh>
        </group>

        {/* 2x MC-38 Magnetic Door Reed Switches mounted on Top Front Inner Frame */}
        {[
          { key: 'mc38-pc', x: pcBayRight - 28, open: doorPcOpen },
          { key: 'mc38-lap', x: lapBayLeft + 28, open: doorLapOpen },
        ].map((reed) => (
          <group key={reed.key} position={[reed.x, legH + H - t - 7, halfW - 14]}>
            <mesh>
              <boxGeometry args={[28, 8, 12]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
            </mesh>
            {/* Status Indicator Dot: Emerald = Closed, Amber = Door Opened! */}
            <mesh position={[0, -4.5, 4]}>
              <sphereGeometry args={[2.0, 10, 10]} />
              <meshStandardMaterial
                color={reed.open ? '#fbbf24' : '#22c55e'}
                emissive={reed.open ? '#fbbf24' : '#22c55e'}
                emissiveIntensity={3}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* External 12V 5A DC Power Adaptor Brick + Rear Panel Barrel Jack (Independent IoT Power) */}
        <group position={[-85, 16, -halfW - wiringDepth - 58]}>
          {/* Matte-Black 12V 5A Adaptor Brick resting on table behind Rear Cover */}
          <mesh>
            <boxGeometry args={[112, 32, 52]} />
            <meshStandardMaterial color="#141820" roughness={0.5} metalness={0.25} />
          </mesh>
          {/* Green Power-On LED on Adaptor */}
          <mesh position={[44, 16.5, 14]}>
            <sphereGeometry args={[1.8, 10, 10]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          {/* DC Cord plugging into Rear Wiring Cover */}
          <mesh position={[45, 10, 42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[3.2, 3.2, 34, 10]} />
            <meshStandardMaterial color="#0f1218" roughness={0.75} />
          </mesh>
        </group>
      </group>

      {/* ================= RIGHT EXTERIOR WALL: SINGLE UNIFIED IOT BOX (OPSI D) ================= */}
      {/* Minimalist Front OLED 0.96" + Front-Side Intake Louvers + Rear-Side 40mm Cross-Flow Fan */}
      <group position={[halfL + 28, legH + H * 0.5, 0]}>
        {/* Matte-Black Midnight Unified IoT Enclosure (56mm depth x 76mm height x 124mm width) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[56, 76, 124]} />
          <meshStandardMaterial color="#171b23" roughness={0.46} metalness={0.22} />
          <Edges threshold={26} color="#475569" scale={1.001} opacity={0.45} transparent />
        </mesh>

        {/* Left Side of IoT Box (+Z facing viewer front): Intake Louver Ventilation Slots */}
        {[-22, -14, -6, 2, 10, 18, 26].map((ly, i) => (
          <mesh key={`louver-${i}`} position={[-2, ly, 62.4]}>
            <boxGeometry args={[36, 3.4, 1.2]} />
            <meshStandardMaterial color="#090b10" roughness={0.92} />
          </mesh>
        ))}

        {/* Right Side of IoT Box (-Z facing rear): 40mm Cross-Flow Cooling Fan */}
        <group position={[-2, 0, -62.5]} rotation={[0, Math.PI, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[18.5, 18.5, 1.8, 28]} />
            <meshStandardMaterial color="#050810" roughness={0.85} />
          </mesh>
          <SpinningFanBlades
            radius={17}
            ledColor={ledEnabled ? ledColor : '#38bdf8'}
            active={relayIotOn}
          />
          {/* 4x M3 Fan Mount Screws (32mm pitch) */}
          {[
            [-16, -16],
            [16, -16],
            [16, 16],
            [-16, 16],
          ].map(([fx, fy], idx) => (
            <mesh key={`f40s-${idx}`} position={[fx, fy, 1.0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.6, 1.6, 1.2, 10]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>

        {/* Minimalist Outer Faceplate (+X): 4 Silver M3 Corner Bolts + Glowing 0.96" OLED */}
        {[
          [-28, -52],
          [28, -52],
          [28, 52],
          [-28, 52],
        ].map(([sy, sz], idx) => (
          <mesh
            key={`iots-${idx}`}
            position={[28.5, sy, sz]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[2.2, 2.2, 1.5, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* Recessed OLED Bezel Frame */}
        <mesh position={[28.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[48, 26, 1.2]} />
          <meshStandardMaterial color="#0d1118" roughness={0.7} />
        </mesh>

        {/* Live Glowing Ice-Blue 0.96" OLED Telemetry Display */}
        <mesh position={[28.9, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[42, 21]} />
          <meshStandardMaterial
            map={oledTex}
            emissiveMap={oledTex}
            emissive="#A0E6FF"
            emissiveIntensity={1.65}
            roughness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
};
