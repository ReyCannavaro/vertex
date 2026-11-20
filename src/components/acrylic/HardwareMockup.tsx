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
    ctx.fillText('VERTEX 3-TIER RACK', 14, 28);

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 38);
    ctx.lineTo(244, 38);
    ctx.stroke();

    ctx.fillStyle = '#A0E6FF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('T1:34C T2:36C T3:35C', 14, 66);
    ctx.fillText('FAN : 4× 120mm AUTO', 14, 92);
    ctx.fillText('LAPTOPS: 3× ONLINE', 14, 116);
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
 * Single-Bay Slide-In Magnetic Dust Filter Tray
 * sliding cleanly through the front opening of the bottom E-Track rail.
 */
const DustFilterTray3D: React.FC<{
  dims: CaseDimensions;
  slideOut: number;
}> = ({ dims, slideOut }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentSlideRef = useRef(slideOut);

  const { length: L, width: W, thickness: t, legHeight: legH } = dims;
  const rw = 18;
  const trayW = Math.max(100, L - t * 2 - rw * 2 - 4);
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
      {/* Single Wide Dust Filter for 3-Tier Chassis */}
      <SingleFilterTray
        centerX={0}
        trayW={trayW}
        trayD={trayD}
        trayH={trayH}
        meshTex={meshTex}
      />
    </group>
  );
};

/**
 * Visualizes neatly combed cables inside the Rear Acrylic Wiring Chamber:
 * - 3x Laptop DC Power cables (Tier 1, Tier 2, Tier 3)
 * - 3x Cobalt-Blue Cat6 Server LAN cables (Tier 1, Tier 2, Tier 3)
 * - Cyan WS2812B LED & PWM Fan Control cables
 */
const RearWiringHarness3D: React.FC<{ dims: CaseDimensions }> = ({ dims }) => {
  const { length: L, width: W, height: H, thickness: t, legHeight: legH, wiringDepth } =
    dims;
  const shelf1Y = dims.shelf1Y ?? 140;
  const shelf2Y = dims.shelf2Y ?? 280;
  const halfL = L / 2;
  const halfW = W / 2;
  const zChamber = -halfW - wiringDepth * 0.52;
  const zInside = -halfW + 18;
  const zExit = -halfW - wiringDepth - 14;
  const combY = legH + H * 0.52;
  const rightPodX = halfL - 38;

  const cables = useMemo(() => {
    const specs: Array<{ pts: [number, number, number][]; radius: number; color: string }> = [
      // 1. Tier 3 (Top) Laptop DC Power Cable
      {
        pts: [
          [-60, legH + shelf2Y + 45, zInside],
          [-60, legH + shelf2Y + 45, zChamber],
          [-60, combY, zChamber - 4],
          [-60, legH + 62, zChamber],
          [10, legH + 38, zChamber],
          [10, legH + 34, zExit],
        ],
        radius: 3.2,
        color: '#1e2430',
      },
      // 2. Tier 2 (Middle) Laptop DC Power Cable
      {
        pts: [
          [-30, legH + shelf1Y + 45, zInside],
          [-30, legH + shelf1Y + 45, zChamber],
          [-30, legH + 58, zChamber],
          [24, legH + 38, zChamber],
          [24, legH + 34, zExit],
        ],
        radius: 3.2,
        color: '#1e2430',
      },
      // 3. Tier 1 (Bottom) Laptop DC Power Cable
      {
        pts: [
          [0, legH + t + 45, zInside],
          [0, legH + t + 45, zChamber],
          [38, legH + 38, zChamber],
          [38, legH + 34, zExit],
        ],
        radius: 3.2,
        color: '#1e2430',
      },
      // 4. Cat6 Uplink Ethernet Tier 3 (Top)
      {
        pts: [
          [60, legH + shelf2Y + 45, zInside],
          [60, legH + shelf2Y + 45, zChamber],
          [60, combY, zChamber - 4],
          [60, legH + 68, zChamber],
          [-10, legH + 38, zChamber],
          [-10, legH + 34, zExit],
        ],
        radius: 2.8,
        color: '#2563eb',
      },
      // 5. Cat6 Uplink Ethernet Tier 2 (Middle)
      {
        pts: [
          [85, legH + shelf1Y + 45, zInside],
          [85, legH + shelf1Y + 45, zChamber],
          [85, legH + 62, zChamber],
          [-24, legH + 38, zChamber],
          [-24, legH + 34, zExit],
        ],
        radius: 2.8,
        color: '#3b82f6',
      },
      // 6. Cat6 Uplink Ethernet Tier 1 (Bottom)
      {
        pts: [
          [110, legH + t + 45, zInside],
          [110, legH + t + 45, zChamber],
          [-38, legH + 38, zChamber],
          [-38, legH + 34, zExit],
        ],
        radius: 2.8,
        color: '#60a5fa',
      },
      // 7. Cyan WS2812B & Top Fan PWM Harness (Right IoT Pod -> Top Fans)
      {
        pts: [
          [rightPodX, legH + H * 0.28, zInside],
          [rightPodX, legH + H * 0.28, zChamber],
          [rightPodX, combY, zChamber - 4],
          [rightPodX, legH + H - t - 22, zChamber],
          [0, legH + H - t - 22, zChamber],
          [-halfL + 60, legH + H - t - 22, zChamber],
        ],
        radius: 2.4,
        color: '#38bdf8',
      },
      // 8. Cyan Sensor & Bottom Fan PWM Harness
      {
        pts: [
          [rightPodX - 18, legH + H * 0.28, zInside],
          [rightPodX - 18, legH + H * 0.24, zChamber],
          [rightPodX - 18, legH + 26, zChamber],
          [0, legH + 26, zChamber],
          [-halfL + 60, legH + 26, zChamber],
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
  }, [L, W, H, t, legH, wiringDepth, shelf1Y, shelf2Y, zChamber, zInside, zExit, combY, rightPodX, halfL]);

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
  middle2Enabled?: boolean;
  bottomHoles: PanelHole[];
  topHoles: PanelHole[];
  dustFilterSlide: number;
  showWiring: boolean;
  relayTier1On?: boolean;
  relayTier2On?: boolean;
  relayTier3On?: boolean;
  relayPcOn?: boolean;
  relayLapTopOn?: boolean;
  relayLapBotOn?: boolean;
  relayIotOn: boolean;
  smokeAlarm: boolean;
  doorLeftOpen?: boolean;
  doorRightOpen?: boolean;
  doorPcOpen?: boolean;
  doorLapOpen?: boolean;
  explodeAmount: number;
  explodeMode: 'frame' | 'all';
}

/**
 * Smoothly glides any hardware subsystem along its CAD exploded-assembly vector at 60fps
 * when "Mode Explode: Semua (Full)" is active.
 */
const ExplodeGroup: React.FC<{
  amount: number;
  dir: [number, number, number];
  children: React.ReactNode;
}> = ({ amount, dir, children }) => {
  const ref = useRef<THREE.Group>(null);
  const curRef = useRef<[number, number, number]>([
    dir[0] * amount,
    dir[1] * amount,
    dir[2] * amount,
  ]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const cur = curRef.current;
    cur[0] = THREE.MathUtils.damp(cur[0], dir[0] * amount, 7.5, dt);
    cur[1] = THREE.MathUtils.damp(cur[1], dir[1] * amount, 7.5, dt);
    cur[2] = THREE.MathUtils.damp(cur[2], dir[2] * amount, 7.5, dt);
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

export const HardwareMockup: React.FC<HardwareMockupProps> = ({
  dims,
  ledEnabled,
  ledColor,
  middleEnabled,
  middle2Enabled = true,
  bottomHoles,
  topHoles,
  dustFilterSlide,
  showWiring,
  relayTier1On,
  relayTier2On,
  relayTier3On,
  relayPcOn,
  relayLapTopOn,
  relayLapBotOn,
  relayIotOn,
  smokeAlarm,
  doorLeftOpen,
  doorRightOpen,
  doorPcOpen,
  doorLapOpen,
  explodeAmount,
  explodeMode,
}) => {
  const devE = explodeMode === 'all' ? explodeAmount : 0;
  const {
    length: L,
    width: W,
    height: H,
    thickness: t,
    legHeight: legH,
    wiringDepth,
  } = dims;
  const halfL = L / 2;
  const halfW = W / 2;
  const innerL = L - t * 2;
  const innerW = W - t * 2;
  const shelf1Y = dims.shelf1Y ?? 140;
  const shelf2Y = dims.shelf2Y ?? 280;

  const botFanActive = relayTier1On ?? relayLapBotOn ?? false;
  const topFanActive = relayTier3On ?? relayLapTopOn ?? false;
  const isLeftDoorOpen = doorLeftOpen ?? doorPcOpen ?? false;
  const isRightDoorOpen = doorRightOpen ?? doorLapOpen ?? false;

  const bottomFans = useMemo(
    () => bottomHoles.filter((h) => h.type === 'fan120' || h.type === 'fan140'),
    [bottomHoles]
  );
  const topFans = useMemo(
    () => topHoles.filter((h) => h.type === 'fan120' || h.type === 'fan140'),
    [topHoles]
  );

  const oledTex = useMemo(() => createOledScreenTexture(), []);
  useEffect(() => {
    return () => oledTex.dispose();
  }, [oledTex]);

  return (
    <group>
      {/* ================= SLIDE-IN BOTTOM DUST FILTER TRAY ================= */}
      <ExplodeGroup amount={devE} dir={[0, -0.75, 0.25]}>
        <DustFilterTray3D dims={dims} slideOut={dustFilterSlide} />
      </ExplodeGroup>

      {/* ================= REAR WIRING CHAMBER CABLE HARNESS ================= */}
      {showWiring && (
        <ExplodeGroup amount={devE} dir={[0, 0, -0.62]}>
          <RearWiringHarness3D dims={dims} />
        </ExplodeGroup>
      )}

      {/* ================= 3-TIER LAPTOP SERVERS (TIER 1, TIER 2, TIER 3) ================= */}
      <group>
        {/* Tier 1: Bottom Floor Laptop */}
        <ExplodeGroup amount={devE} dir={[0, -0.15, 0.35]}>
          <LaptopUnit
            position={[0, legH + t + 25, 6]}
            maxWidth={innerL}
            maxDepth={innerW}
          />
        </ExplodeGroup>

        {/* Tier 2: Middle Shelf 1 Laptop */}
        {middleEnabled && (
          <ExplodeGroup amount={devE} dir={[0, 0.12, 0.42]}>
            <LaptopUnit
              position={[0, legH + shelf1Y + t / 2, 6]}
              maxWidth={innerL}
              maxDepth={innerW}
            />
          </ExplodeGroup>
        )}

        {/* Tier 3: Middle Shelf 2 Laptop */}
        {middle2Enabled && (
          <ExplodeGroup amount={devE} dir={[0, 0.38, 0.48]}>
            <LaptopUnit
              position={[0, legH + shelf2Y + t / 2, 6]}
              maxWidth={innerL}
              maxDepth={innerW}
            />
          </ExplodeGroup>
        )}
      </group>

      {/* ================= TOP & BOTTOM SLIM-SHROUDED CASE FANS (SYNCED TO RELAY) ================= */}
      <group>
        {/* Bottom Intake Fans (2× 120mm) */}
        <ExplodeGroup amount={devE} dir={[0, -0.22, 0]}>
          {bottomFans.map((hole) => (
            <MountedCaseFan3D
              key={`bot-fan-${hole.id}`}
              size={120}
              position={[hole.x - innerL / 2, legH + t + 11.5, hole.y - innerW / 2]}
              mountSide="bottom"
              rearWallZ={-halfW + t}
              ledColor={ledColor}
              ledEnabled={ledEnabled}
              fanActive={botFanActive}
            />
          ))}
        </ExplodeGroup>

        {/* Top Exhaust Fans (2× 120mm) */}
        <ExplodeGroup amount={devE} dir={[0, 0.62, 0]}>
          {topFans.map((hole) => (
            <MountedCaseFan3D
              key={`top-fan-${hole.id}`}
              size={120}
              position={[hole.x - halfL, legH + H - t - 11.5, hole.y - halfW - wiringDepth]}
              mountSide="top"
              rearWallZ={-halfW + t}
              ledColor={ledColor}
              ledEnabled={ledEnabled}
              fanActive={topFanActive}
            />
          ))}
        </ExplodeGroup>
      </group>

      {/* ================= IOT SENSORS (3x BLACK DHT21/AM2301, 1x MQ-2 ON STANDOFFS, 2x MC-38 REED) ================= */}
      {(() => {
        const dhtZ = -halfW + t + 6.75; // Flush against Back Partition inner face

        const dhtUnits: Array<{
          key: string;
          pos: [number, number, number];
          rotZ: number;
        }> = [
          // 1. Tier 1 (Bottom) DHT21/AM2301
          {
            key: 'dht21-tier1',
            pos: [0, legH + t + 55, dhtZ],
            rotZ: 0,
          },
          // 2. Tier 2 (Middle) DHT21/AM2301
          {
            key: 'dht21-tier2',
            pos: [0, legH + shelf1Y + 55, dhtZ],
            rotZ: 0,
          },
          // 3. Tier 3 (Top) DHT21/AM2301
          {
            key: 'dht21-tier3',
            pos: [0, legH + shelf2Y + 55, dhtZ],
            rotZ: 0,
          },
        ];

        const mq2WorldX = 0;
        const mq2WorldZ = -halfW + 56;
        const mq2TopY = legH + H - t;
        const standoffH = 10;

        return (
          <group>
            {/* 3x Black AOSONG DHT21 / AM2301 Modules on Back Partition */}
            <ExplodeGroup amount={devE} dir={[0, 0, -0.35]}>
              {dhtUnits.map((dht) => (
                <group key={dht.key} position={dht.pos} rotation={[0, 0, dht.rotZ]}>
                  {/* Matte-Black Slotted Casing (27 × 52 × 13.5 mm) */}
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[27, 52, 13.5]} />
                    <meshStandardMaterial color="#141820" roughness={0.48} metalness={0.18} />
                  </mesh>
                  {/* Ventilated Sensor Slotted Louver Grille on front face */}
                  {[-14, -7, 0, 7, 14].map((vy, vi) => (
                    <mesh key={vi} position={[0, vy, 6.95]}>
                      <boxGeometry args={[18, 2.4, 0.8]} />
                      <meshStandardMaterial color="#07090e" roughness={0.95} />
                    </mesh>
                  ))}
                  {/* Integrated Top Mounting Ear Tab + Silver M3 Bolt */}
                  <mesh position={[0, 29.5, -5.0]}>
                    <boxGeometry args={[12, 9, 3.5]} />
                    <meshStandardMaterial color="#141820" roughness={0.5} />
                  </mesh>
                  <mesh position={[0, 30, -2.8]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[2.1, 2.1, 2.2, 12]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
                  </mesh>
                  {/* Cable Strain-Relief Collar at bottom + 3-Wire Lead */}
                  <mesh position={[0, -27.5, -1.5]}>
                    <cylinderGeometry args={[3.4, 3.4, 4, 12]} />
                    <meshStandardMaterial color="#11141c" roughness={0.7} />
                  </mesh>
                  {[
                    { x: -1.8, color: '#ef4444' }, // Red = VCC
                    { x: 0, color: '#eab308' }, // Yellow = DATA
                    { x: 1.8, color: '#1e293b' }, // Black = GND
                  ].map((wire, wi) => (
                    <group key={wi}>
                      <mesh position={[wire.x, -30.5, -1.5]}>
                        <cylinderGeometry args={[0.75, 0.75, 5, 8]} />
                        <meshStandardMaterial color={wire.color} roughness={0.6} />
                      </mesh>
                      <mesh position={[wire.x, -32, -5.2]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.75, 0.75, 8.5, 8]} />
                        <meshStandardMaterial color={wire.color} roughness={0.6} />
                      </mesh>
                    </group>
                  ))}
                </group>
              ))}
            </ExplodeGroup>

            {/* 1x MQ-2 Smoke / Fire Safety Sensor on 4x 10mm M3 Standoffs */}
            <ExplodeGroup amount={devE} dir={[0, 0.92, 0]}>
              <group position={[mq2WorldX, mq2TopY, mq2WorldZ]}>
                {[
                  [-7, -13],
                  [7, -13],
                  [7, 13],
                  [-7, 13],
                ].map(([sx, sz], si) => (
                  <group key={`mq2-so-${si}`} position={[sx, -standoffH / 2, sz]}>
                    <mesh>
                      <cylinderGeometry args={[2.3, 2.3, standoffH, 6]} />
                      <meshStandardMaterial color="#d4a017" metalness={0.82} roughness={0.28} />
                    </mesh>
                    <mesh position={[0, -standoffH / 2 - 1.8, 0]}>
                      <cylinderGeometry args={[2.0, 2.0, 1.5, 10]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
                    </mesh>
                  </group>
                ))}

                {/* Blue MQ-2 Module PCB */}
                <mesh position={[0, -standoffH - 0.8, 0]}>
                  <boxGeometry args={[20, 1.6, 32]} />
                  <meshStandardMaterial color="#1d4ed8" roughness={0.42} metalness={0.18} />
                </mesh>
                <mesh position={[0, -standoffH - 8.5, 2]}>
                  <cylinderGeometry args={[8.4, 9.2, 13.5, 22]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.28} />
                </mesh>
                <mesh position={[0, -standoffH - 15.2, 2]}>
                  <cylinderGeometry args={[7.6, 8.3, 1.4, 22]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.45} />
                </mesh>
                <mesh position={[-4.5, -standoffH - 3.6, -10.5]}>
                  <boxGeometry args={[6.5, 4.5, 6.5]} />
                  <meshStandardMaterial color="#2563eb" roughness={0.5} />
                </mesh>
                <mesh position={[5.2, -standoffH - 2.2, -10.5]}>
                  <sphereGeometry args={[1.9, 10, 10]} />
                  <meshStandardMaterial
                    color={smokeAlarm ? '#ef4444' : '#22c55e'}
                    emissive={smokeAlarm ? '#ef4444' : '#22c55e'}
                    emissiveIntensity={3.5}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            </ExplodeGroup>

            {/* 2x White MC-38 Magnetic Door Reed Switches */}
            <ExplodeGroup amount={devE} dir={[0, 0.96, 0]}>
              {[
                { key: 'mc38-left', x: -halfL * 0.45, open: isLeftDoorOpen },
                { key: 'mc38-right', x: halfL * 0.45, open: isRightDoorOpen },
              ].map((reed) => (
                <group key={reed.key} position={[reed.x, mq2TopY - 4.5, halfW - 16]}>
                  <mesh position={[0, 4.1, 0]}>
                    <boxGeometry args={[27, 1.0, 14]} />
                    <meshStandardMaterial color="#e7e0c9" roughness={0.85} />
                  </mesh>
                  <mesh position={[0, 0, 2.5]}>
                    <boxGeometry args={[27, 7.5, 8]} />
                    <meshStandardMaterial color="#f1f5f9" roughness={0.42} />
                  </mesh>
                  <mesh position={[0, 2.2, -3.2]}>
                    <boxGeometry args={[27, 3.0, 6]} />
                    <meshStandardMaterial color="#f1f5f9" roughness={0.42} />
                  </mesh>
                  {[-9, 9].map((sx, si) => (
                    <mesh key={si} position={[sx, 0.2, -3.5]}>
                      <cylinderGeometry args={[1.6, 1.6, 1.4, 10]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
                    </mesh>
                  ))}
                  <mesh position={[0, -4.2, 4.5]}>
                    <sphereGeometry args={[1.8, 10, 10]} />
                    <meshStandardMaterial
                      color={reed.open ? '#fbbf24' : '#22c55e'}
                      emissive={reed.open ? '#fbbf24' : '#22c55e'}
                      emissiveIntensity={3}
                      toneMapped={false}
                    />
                  </mesh>
                </group>
              ))}
            </ExplodeGroup>
          </group>
        );
      })()}

      {/* ================= REAR CHAMBER POWER BRICKS (SEATED ON REAR FLOOR + 4x CRADLES) ================= */}
      {showWiring && (
        <ExplodeGroup amount={devE} dir={[0, -0.45, -0.78]}>
          <group position={[0, legH + t, -halfW - Math.min(22, wiringDepth * 0.38)]}>
            {/* 1. Mini 4-Outlet PDU Power Strip seated on Rear Floor */}
            <group position={[-halfL + 120, 24, 0]}>
              <mesh>
                <boxGeometry args={[175, 46, 28]} />
                <meshStandardMaterial color="#181c24" roughness={0.5} metalness={0.22} />
              </mesh>
              {[-54, -18, 18, 54].map((sx, i) => (
                <mesh key={`sock-${i}`} position={[sx, 0, -14.5]}>
                  <cylinderGeometry args={[11, 11, 1.5, 16]} />
                  <meshStandardMaterial color="#0b0e14" roughness={0.85} />
                </mesh>
              ))}
              <mesh position={[-76, 0, -14.4]}>
                <boxGeometry args={[10, 16, 2.2]} />
                <meshStandardMaterial
                  color="#ef4444"
                  emissive="#ef4444"
                  emissiveIntensity={2.2}
                  toneMapped={false}
                />
              </mesh>
              {[-64, 64].map((rx, i) => (
                <mesh key={`pdu-s-${i}`} position={[rx, -1, 2]}>
                  <boxGeometry args={[10, 48, 32]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.75} />
                </mesh>
              ))}
            </group>

            {/* 2. Four Vertically-Seated Power Bricks inside 3D-Printed U-Cradle Holsters on Rear Floor */}
            {[
              { key: 'brick-iot', x: -20, w: 50, h: 106, d: 30, led: '#22c55e' },
              { key: 'brick-lap1', x: 50, w: 46, h: 100, d: 28, led: '#38bdf8' },
              { key: 'brick-lap2', x: 115, w: 46, h: 100, d: 28, led: '#38bdf8' },
              { key: 'brick-lap3', x: 175, w: 46, h: 100, d: 28, led: '#38bdf8' },
            ].map((b) => (
              <group key={b.key} position={[b.x, 0, 0]}>
                <mesh position={[0, b.h / 2 + 4, 0]}>
                  <boxGeometry args={[b.w, b.h, b.d]} />
                  <meshStandardMaterial color="#141820" roughness={0.48} metalness={0.25} />
                </mesh>
                <mesh position={[b.w / 2 - 9, b.h - 8, -b.d / 2 - 0.6]}>
                  <sphereGeometry args={[1.8, 10, 10]} />
                  <meshStandardMaterial
                    color={b.led}
                    emissive={b.led}
                    emissiveIntensity={2.8}
                    toneMapped={false}
                  />
                </mesh>

                {/* 3D-Printed U-Cradle */}
                <group position={[0, 20, 0]}>
                  <mesh position={[0, -18, 0]}>
                    <boxGeometry args={[b.w + 8, 4, b.d + 6]} />
                    <meshStandardMaterial color="#1e2430" roughness={0.48} metalness={0.2} />
                  </mesh>
                  {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * (b.w / 2 + 2.2), 0, 0]}>
                      <boxGeometry args={[3.8, 40, b.d + 6]} />
                      <meshStandardMaterial color="#1e2430" roughness={0.48} metalness={0.2} />
                    </mesh>
                  ))}
                  <mesh position={[0, -4, -b.d / 2 - 2.2]}>
                    <boxGeometry args={[b.w + 8, 18, 3.6]} />
                    <meshStandardMaterial color="#1e2430" roughness={0.48} metalness={0.2} />
                  </mesh>
                  <mesh position={[0, 0, b.d / 2 + 2.2]}>
                    <boxGeometry args={[b.w + 34, 40, 4.2]} />
                    <meshStandardMaterial color="#1a202c" roughness={0.5} metalness={0.2} />
                  </mesh>
                </group>
              </group>
            ))}

            {/* Main AC Power Cord */}
            <mesh position={[-24, 24, -wiringDepth * 0.5 - 12]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[4.4, 4.4, 36, 12]} />
              <meshStandardMaterial color="#0f1218" roughness={0.75} />
            </mesh>
          </group>
        </ExplodeGroup>
      )}

      {/* ================= RIGHT EXTERIOR WALL: SINGLE UNIFIED IOT BOX (OPSI D • 196×126×64mm) ================= */}
      <ExplodeGroup amount={devE} dir={[1.45, 0, 0]}>
        <group position={[halfL + 32, legH + H * 0.5, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[64, 126, 196]} />
            <meshStandardMaterial color="#171b23" roughness={0.46} metalness={0.22} />
            <Edges threshold={26} color="#475569" scale={1.001} opacity={0.45} transparent />
          </mesh>

          {/* Louvers */}
          {[-36, -27, -18, -9, 0, 9, 18, 27, 36].map((ly, i) => (
            <mesh key={`louver-${i}`} position={[-2, ly, 98.4]}>
              <boxGeometry args={[42, 3.6, 1.2]} />
              <meshStandardMaterial color="#090b10" roughness={0.92} />
            </mesh>
          ))}

          {/* 40mm Fan */}
          <group position={[-2, 0, -98.5]} rotation={[0, Math.PI, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[18.5, 18.5, 1.8, 28]} />
              <meshStandardMaterial color="#050810" roughness={0.85} />
            </mesh>
            <SpinningFanBlades
              radius={17}
              ledColor={ledEnabled ? ledColor : '#38bdf8'}
              active={relayIotOn}
            />
          </group>

          {/* Faceplate Screws */}
          {[
            [-53, -88],
            [53, -88],
            [53, 88],
            [-53, 88],
          ].map(([sy, sz], idx) => (
            <mesh
              key={`iots-${idx}`}
              position={[32.5, sy, sz]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[2.2, 2.2, 1.5, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
            </mesh>
          ))}

          {/* Recessed OLED Bezel Frame */}
          <mesh position={[32.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[48, 26, 1.2]} />
            <meshStandardMaterial color="#0d1118" roughness={0.7} />
          </mesh>

          {/* Live Glowing Ice-Blue 0.96" OLED Telemetry Display */}
          <mesh position={[32.9, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
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
      </ExplodeGroup>
    </group>
  );
};
