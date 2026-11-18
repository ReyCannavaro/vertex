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
}> = ({ size, position, mountSide, rearWallZ, ledColor, ledEnabled }) => {
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
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={ledEnabled ? 2.4 : 0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Spinning Fan Rotor neatly recessed inside the slim shroud */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <SpinningFanBlades radius={bladeR} ledColor={activeColor} />
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
 * Slide-Out Magnetic Mesh Dust Filter Tray seated inside the bottom acrylic U-Rail slot.
 */
const DustFilterTray3D: React.FC<{
  dims: CaseDimensions;
  slideOut: number;
}> = ({ dims, slideOut }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentSlideRef = useRef(slideOut);

  const { length: L, width: W, thickness: t, legHeight: legH } = dims;
  const trayW = Math.max(80, L - t * 2 - 42);
  const trayD = Math.max(80, W - t * 2 - 22);
  const frameBar = 10;
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
      groupRef.current.position.z = 10 + currentSlideRef.current;
    }
  });

  return (
    <group ref={groupRef} position={[0, legH - t / 2, 10]}>
      {/* Fine perforated charcoal filter mesh */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[trayW - frameBar * 2, 1.4, trayD - frameBar * 2]} />
        <meshStandardMaterial
          map={meshTex}
          color="#334155"
          roughness={0.85}
          metalness={0.15}
          transparent
          opacity={0.82}
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

      {/* Center stiffener crossbar */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[6, trayH * 0.85, trayD - frameBar * 2]} />
        <meshStandardMaterial color="#1e2430" roughness={0.55} />
      </mesh>

      {/* Front Ergonomic Pull-Handle Tab with subtle Sky-Blue accent */}
      <mesh position={[0, -0.5, trayD / 2 + 7]}>
        <boxGeometry args={[76, trayH + 1.5, 14]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, -0.5, trayD / 2 + 14.2]}>
        <boxGeometry args={[52, 2.2, 1.5]} />
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
  const padW = Math.min(315, maxWidth - 26);
  const padD = Math.min(245, maxDepth - 40);
  const lapW = padW - 14;
  const lapD = padD - 18;

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

  // Curved black braided interconnect cable from Upper Fan Pod down to Lower IoT Box
  const cableGeometry = useMemo(() => {
    const xOut = halfL + 18;
    const upperY = legH + H * 0.72;
    const lowerY = legH + H * 0.28;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xOut, upperY - 46, 12),
      new THREE.Vector3(xOut + 8, (upperY + lowerY) / 2 + 12, 26),
      new THREE.Vector3(xOut + 6, (upperY + lowerY) / 2 - 12, 24),
      new THREE.Vector3(xOut, lowerY + 34, 10),
    ]);
    return new THREE.TubeGeometry(curve, 24, 3.2, 10, false);
  }, [halfL, H, legH]);

  useEffect(() => {
    return () => cableGeometry.dispose();
  }, [cableGeometry]);

  return (
    <group>
      {/* ================= SLIDE-IN BOTTOM DUST FILTER TRAY ================= */}
      <DustFilterTray3D dims={dims} slideOut={dustFilterSlide} />

      {/* ================= REAR WIRING CHAMBER CABLE HARNESS ================= */}
      {showWiring && <RearWiringHarness3D dims={dims} />}

      {/* ================= LEFT BAY: PC SERVER HARDWARE ================= */}
      <group>
        {/* Motherboard (mounted vertically on back-left standoffs) */}
        <group position={[pcBayCenterX, legH + H * 0.62, -W * 0.16]}>
          <mesh>
            <boxGeometry args={[Math.min(180, pcBayWidth - 24), Math.min(200, H * 0.48), 4]} />
            <meshStandardMaterial color="#141820" roughness={0.55} metalness={0.25} />
          </mesh>
          <mesh position={[-Math.min(62, pcBayWidth * 0.28), 32, 14]}>
            <boxGeometry args={[32, 95, 24]} />
            <meshStandardMaterial color="#1f2735" roughness={0.35} metalness={0.55} />
          </mesh>
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
          {[48, 57].map((rx, i) => (
            <mesh key={i} position={[rx, 30, 16]}>
              <boxGeometry args={[5, 86, 22]} />
              <meshStandardMaterial color="#11161f" roughness={0.3} metalness={0.6} />
            </mesh>
          ))}
          <mesh position={[6, -34, 38]}>
            <boxGeometry args={[Math.min(160, pcBayWidth - 34), 22, 72]} />
            <meshStandardMaterial color="#1c222d" roughness={0.4} metalness={0.5} />
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

      {/* ================= TOP & BOTTOM SLIM-SHROUDED CASE FANS (1x 140mm PC + 2x 120mm LAPTOP) ================= */}
      <group>
        {/* Bottom Intake Fans enclosed in Slim Matte-Black Rounded Shrouds */}
        {bottomFans.map((hole) => (
          <MountedCaseFan3D
            key={`bot-fan-${hole.id}`}
            size={hole.type === 'fan140' ? 140 : 120}
            position={[hole.x - innerL / 2, legH + t + 11.5, hole.y - innerW / 2]}
            mountSide="bottom"
            rearWallZ={-halfW + t}
            ledColor={ledColor}
            ledEnabled={ledEnabled}
          />
        ))}

        {/* Top Exhaust Fans enclosed in Slim Matte-Black Rounded Shrouds */}
        {topFans.map((hole) => (
          <MountedCaseFan3D
            key={`top-fan-${hole.id}`}
            size={hole.type === 'fan140' ? 140 : 120}
            position={[hole.x - halfL, legH + H - t - 11.5, hole.y - halfW - wiringDepth]}
            mountSide="top"
            rearWallZ={-halfW + t}
            ledColor={ledColor}
            ledEnabled={ledEnabled}
          />
        ))}
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

        <mesh position={[lapBayLeft + 34, legH + H - t - 42, -W / 2 + 24]}>
          <boxGeometry args={[16, 22, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
      </group>

      {/* ================= RIGHT EXTERIOR WALL: FAN POD + IOT BOX ================= */}
      <group>
        <group position={[halfL + 22, legH + H * 0.72, 0]}>
          <mesh>
            <boxGeometry args={[42, 104, 104]} />
            <meshStandardMaterial color="#181c24" roughness={0.5} metalness={0.22} />
          </mesh>
          {[-30, -18, -6, 6, 18, 30].map((ly, i) => (
            <mesh key={i} position={[0, ly, 52.5]}>
              <boxGeometry args={[28, 4.5, 1.2]} />
              <meshStandardMaterial color="#090b10" roughness={0.9} />
            </mesh>
          ))}
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

        <group position={[halfL + 22, legH + H * 0.28, 0]}>
          <mesh>
            <boxGeometry args={[42, 74, 118]} />
            <meshStandardMaterial color="#181c24" roughness={0.5} metalness={0.22} />
          </mesh>
          {[-20, -10, 0, 10, 20].map((ly, i) => (
            <mesh key={i} position={[0, ly, 59.5]}>
              <boxGeometry args={[26, 4, 1.2]} />
              <meshStandardMaterial color="#090b10" roughness={0.9} />
            </mesh>
          ))}
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

        <mesh geometry={cableGeometry}>
          <meshStandardMaterial color="#111318" roughness={0.75} metalness={0.15} />
        </mesh>
      </group>
    </group>
  );
};
