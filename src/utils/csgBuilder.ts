import * as THREE from 'three';
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BracketParams, IoTBoxParams } from '../types/cad';

const evaluator = new Evaluator();
evaluator.useGroups = false;

/**
 * Ensures any BufferGeometry has clean non-indexed position, normal, and uv attributes
 * so mergeGeometries and three-bvh-csg always succeed without attribute mismatches.
 */
function normalizeGeo(raw: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = raw.index ? raw.toNonIndexed() : raw.clone();
  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }
  if (!geo.attributes.uv) {
    const count = geo.attributes.position.count;
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  // Keep only position, normal, uv so mergeGeometries never complains
  for (const key of Object.keys(geo.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv') {
      geo.deleteAttribute(key);
    }
  }
  return geo;
}

function makeRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const r = Math.min(Math.max(0.5, radius), width / 2 - 0.5, height / 2 - 0.5);
  const hw = width / 2;
  const hh = height / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  shape.closePath();
  return shape;
}

/**
 * Creates a rounded-corner block centered in X/Y and extruded along Z from -depth/2 to +depth/2.
 */
function createRoundedBlockGeo(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel = 0
): THREE.BufferGeometry {
  const shape = makeRoundedRectShape(width, height, radius);
  const effectiveDepth = Math.max(0.5, depth - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: effectiveDepth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.translate(0, 0, -effectiveDepth / 2);
  const norm = normalizeGeo(geo);
  geo.dispose();
  return norm;
}

function makeTransformedGeo(
  raw: THREE.BufferGeometry,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0]
): THREE.BufferGeometry {
  const geo = normalizeGeo(raw);
  raw.dispose();
  const mat = new THREE.Matrix4();
  const euler = new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ');
  mat.compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(euler),
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(mat);
  return geo;
}

function makeBrushFromGeo(geo: THREE.BufferGeometry): Brush {
  const brush = new Brush(geo);
  brush.updateMatrixWorld(true);
  return brush;
}

function subtractMerged(base: Brush, cutters: THREE.BufferGeometry[]): Brush {
  if (cutters.length === 0) return base;
  const merged = mergeGeometries(cutters, false);
  cutters.forEach((g) => g.dispose());
  if (!merged) return base;
  const cutBrush = makeBrushFromGeo(merged);
  const result = evaluator.evaluate(base, cutBrush, SUBTRACTION);
  base.geometry.dispose();
  cutBrush.geometry.dispose();
  return result;
}

function unionMerged(base: Brush, additions: THREE.BufferGeometry[]): Brush {
  if (additions.length === 0) return base;
  const merged = mergeGeometries(additions, false);
  additions.forEach((g) => g.dispose());
  if (!merged) return base;
  const addBrush = makeBrushFromGeo(merged);
  const result = evaluator.evaluate(base, addBrush, ADDITION);
  base.geometry.dispose();
  addBrush.geometry.dispose();
  return result;
}

function getFanSpecs(fanSize: 40 | 80 | 120 | 140): {
  airDia: number;
  pitchHalf: number;
  mountHoleR: number;
} {
  switch (fanSize) {
    case 40:
      return { airDia: 37, pitchHalf: 16, mountHoleR: 1.65 };
    case 80:
      return { airDia: 76, pitchHalf: 35.75, mountHoleR: 2.25 };
    case 120:
      return { airDia: 115, pitchHalf: 52.5, mountHoleR: 2.25 };
    case 140:
      return { airDia: 135, pitchHalf: 62.25, mountHoleR: 2.25 };
  }
}

/**
 * Standard DIN 934 M3 Hex Nut captive pocket (5.5mm across flats + 0.3mm 3D-print tolerance -> circumradius 3.35mm).
 * Using a 6-sided CylinderGeometry creates a crisp press-fit hexagonal nut recess so M3 nuts never spin.
 */
function makeM3HexPocketGeo(
  pos: [number, number, number],
  rot: [number, number, number],
  depth = 2.6
): THREE.BufferGeometry {
  return makeTransformedGeo(
    new THREE.CylinderGeometry(3.35, 3.35, depth, 6),
    pos,
    rot
  );
}

/**
 * Computes the 4 corner screw X/Y coordinates (centered around 0,0) shared by both
 * the main pod housing bosses and the front faceplate screw holes.
 */
export function getFaceplateScrewOffsets(params: IoTBoxParams): [number, number][] {
  const inset = Math.max(params.wallThickness + 5.2, Math.min(params.cornerRadius * 0.85 + 2.5, 11));
  const sx = Math.max(8, params.length / 2 - inset);
  const sy = Math.max(8, params.height / 2 - inset);
  return [
    [-sx, -sy],
    [sx, -sy],
    [sx, sy],
    [-sx, sy],
  ];
}

/**
 * Builds the redesigned Midnight Rounded Pod Housing (rear-to-front open shell)
 * inspired by the wall-mounted ESP32 OLED & Fan Pods on the Hybrid Mini Data Center.
 *
 * Orientation:
 * - X: Pod horizontal width (length)
 * - Y: Pod vertical height (bottom rests at Y = 0, center at Y = H/2)
 * - Z: Pod depth from rear mounting wall (-W/2) to front faceplate seam (+W/2 - t)
 */
export function buildIoTBoxGeometry(params: IoTBoxParams): THREE.BufferGeometry {
  const {
    length: L,
    width: W,
    height: H,
    wallThickness: t,
    cornerRadius: r,
    hasStandoffs,
    standoffSpacingX,
    standoffSpacingZ,
    hasSideVents,
    hasFan40,
    fanPlacement,
    fanSize,
    throughAirflow,
    hasUsbCable,
    hasWallMount,
    hasLid,
  } = params;

  const lidThick = hasLid ? t : 0;
  const bodyDepth = Math.max(18, W - lidThick);
  const bodyCenterZ = -lidThick / 2;
  const centerY = H / 2;

  const innerL = Math.max(20, L - t * 2);
  const innerH = Math.max(20, H - t * 2);
  const innerR = Math.max(1.5, r - t);

  // 1. Outer rounded pod shell (with subtle chamfered front/back bevel)
  const outerGeo = makeTransformedGeo(
    createRoundedBlockGeo(L, H, bodyDepth, r, 0.8),
    [0, centerY, bodyCenterZ]
  );
  let current = makeBrushFromGeo(outerGeo);

  // 2. Hollow interior cavity opening towards front (+Z)
  const cavityDepth = bodyDepth - t + 6;
  const cavityZ = bodyCenterZ - bodyDepth / 2 + t + cavityDepth / 2;
  const cavityGeo = makeTransformedGeo(
    createRoundedBlockGeo(innerL, innerH, cavityDepth, innerR, 0),
    [0, centerY, cavityZ]
  );
  current = subtractMerged(current, [cavityGeo]);

  // 3. Additions: 4x Corner M3 Screw Bosses + Optional 4x ESP32 Screw Terminal Standoffs
  const additions: THREE.BufferGeometry[] = [];
  const pilotCutters: THREE.BufferGeometry[] = [];

  const backWallInnerZ = bodyCenterZ - bodyDepth / 2 + t;
  const frontRimZ = bodyCenterZ + bodyDepth / 2;

  // 4 Corner Screw Bosses connecting back wall to front faceplate
  const screwOffsets = getFaceplateScrewOffsets(params);
  const bossLen = Math.max(6, bodyDepth - t - 0.6);
  for (const [bx, by] of screwOffsets) {
    additions.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(3.4, 3.8, bossLen + 0.8, 16),
        [bx, centerY + by, backWallInnerZ + bossLen / 2 - 0.4],
        [Math.PI / 2, 0, 0]
      )
    );
    // M3 self-tapping pilot hole from front rim inward
    const pilotDepth = Math.min(12, bossLen - 1);
    pilotCutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(1.4, 1.4, pilotDepth + 3, 14),
        [bx, centerY + by, frontRimZ - pilotDepth / 2 + 1.5],
        [Math.PI / 2, 0, 0]
      )
    );
  }

  // Optional 4x ESP32 Screw Terminal Standoffs protruding from rear wall inside
  if (hasStandoffs) {
    const standoffH = Math.min(9, bodyDepth - t - 8);
    if (standoffH >= 4) {
      const maxSX = Math.max(12, innerL - 22);
      const maxSY = Math.max(12, innerH - 22);
      const sx = Math.min(standoffSpacingX, maxSX) / 2;
      const sy = Math.min(standoffSpacingZ, maxSY) / 2;

      const standoffPts: [number, number][] = [
        [-sx, -sy],
        [sx, -sy],
        [sx, sy],
        [-sx, sy],
      ];

      for (const [ox, oy] of standoffPts) {
        additions.push(
          makeTransformedGeo(
            new THREE.CylinderGeometry(3.1, 3.5, standoffH + 0.8, 16),
            [ox, centerY + oy, backWallInnerZ + standoffH / 2 - 0.4],
            [Math.PI / 2, 0, 0]
          )
        );
        pilotCutters.push(
          makeTransformedGeo(
            new THREE.CylinderGeometry(1.3, 1.3, standoffH + 1, 14),
            [ox, centerY + oy, backWallInnerZ + standoffH / 2 + 1.5],
            [Math.PI / 2, 0, 0]
          )
        );
      }
    }
  }

  // Raised Internal M3 Captive Hex-Nut Boss Pads on Rear Acrylic-Wall Mounts (so thin 2.6mm walls hold full M3 hex nuts!)
  if (hasWallMount && !(throughAirflow && hasFan40 && fanPlacement === 'front')) {
    const mx = Math.min(innerL * 0.34, 42);
    const my = Math.min(innerH * 0.32, 32);
    const bossH = 3.2;
    const mountPts: [number, number][] = [
      [-mx, -my],
      [mx, -my],
      [mx, my],
      [-mx, my],
    ];
    for (const [ox, oy] of mountPts) {
      additions.push(
        makeTransformedGeo(
          new THREE.CylinderGeometry(5.2, 5.6, bossH + 0.6, 6),
          [ox, centerY + oy, backWallInnerZ + bossH / 2 - 0.3],
          [Math.PI / 2, 0, 0]
        )
      );
      // Drop-in hexagonal M3 nut pocket recessed cleanly into the raised inner boss
      pilotCutters.push(
        makeM3HexPocketGeo(
          [ox, centerY + oy, backWallInnerZ + bossH - 1.1],
          [Math.PI / 2, 0, 0],
          3.2
        )
      );
    }
  }

  current = unionMerged(current, additions);

  // 4. Batched Subtractions: Pilot holes, Side Louver Vents, USB/Cable Ports, Rear Acrylic Mounts
  const cutters: THREE.BufferGeometry[] = [...pilotCutters];

  const hasSideFan = hasFan40 && fanPlacement === 'side';

  // Side Louver Ventilation Grills:
  // - When Side Cross-Flow Fan is active (Opsi D): cut intake louvers ONLY on Left (-X) wall!
  // - Otherwise: cut passive louver slots symmetrically on both Left (-X) and Right (+X) walls.
  if (hasSideVents) {
    const usableH = H - r * 2 - 8;
    const slotH = 3.2;
    const slotPitch = 7.2;
    const count = Math.max(3, Math.min(9, Math.floor(usableH / slotPitch)));
    const slotDepthZ = Math.max(10, bodyDepth - t * 2 - 10);
    const startY = centerY - ((count - 1) * slotPitch) / 2;

    for (let i = 0; i < count; i++) {
      const y = startY + i * slotPitch;
      if (hasSideFan) {
        // Intake louvers strictly on Left Wall (-X) opposite the Right Wall 40mm Fan
        cutters.push(
          makeTransformedGeo(
            new THREE.BoxGeometry(t + 10, slotH, slotDepthZ),
            [-L / 2 + t / 2, y, bodyCenterZ]
          )
        );
      } else {
        // Passive louvers across both Left & Right walls
        cutters.push(
          makeTransformedGeo(
            new THREE.BoxGeometry(L + 8, slotH, slotDepthZ),
            [0, y, bodyCenterZ]
          )
        );
      }
    }
  }

  // Right-Side Cross-Flow Cooling Fan Cutout (+X wall) — Opsi D!
  if (hasSideFan) {
    const { airDia, pitchHalf, mountHoleR } = getFanSpecs(fanSize);
    const rightX = L / 2 - t / 2;
    const cutDepth = t + 10;
    const maxAllowedDia = Math.min(innerH - 6, bodyDepth - t - 6);
    const dia = Math.max(18, Math.min(airDia, maxAllowedDia));

    // Main circular fan cutout on Right Wall (+X)
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(dia / 2, dia / 2, cutDepth, 32),
        [rightX, centerY, bodyCenterZ],
        [0, 0, Math.PI / 2]
      )
    );

    // 4x Fan mounting screw holes if pitch fits cleanly on the side wall
    if (pitchHalf * 2 < innerH - 6 && pitchHalf * 2 < bodyDepth - t - 4) {
      const fanMounts: [number, number][] = [
        [-pitchHalf, -pitchHalf],
        [pitchHalf, -pitchHalf],
        [pitchHalf, pitchHalf],
        [-pitchHalf, pitchHalf],
      ];
      for (const [oy, oz] of fanMounts) {
        cutters.push(
          makeTransformedGeo(
            new THREE.CylinderGeometry(mountHoleR, mountHoleR, cutDepth, 14),
            [rightX, centerY + oy, bodyCenterZ + oz],
            [0, 0, Math.PI / 2]
          )
        );
      }
    }
  }

  // USB / Sensor & Interconnect Cable Pass-Through Ports on Bottom Wall (Y = 0)
  if (hasUsbCable) {
    const portZ = bodyCenterZ - 2;
    const wallCutH = t + 8;
    // Rectangular USB-C / power connector cutout
    cutters.push(
      makeTransformedGeo(
        new THREE.BoxGeometry(16, wallCutH, 10),
        [-Math.min(18, innerL * 0.2), t / 2, portZ]
      )
    );
    // Round Ø9mm braided cable grommet port (connects to Upper Fan Pod / Case interior)
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(4.5, 4.5, wallCutH, 18),
        [Math.min(18, innerL * 0.2), t / 2, portZ]
      )
    );
  }

  // Through-Airflow Rear Wall Cutout (only for Front-Mounted Slim Fan Shrouds 120mm / 140mm)
  if (throughAirflow && hasFan40 && fanPlacement === 'front') {
    const rearZ = bodyCenterZ - bodyDepth / 2 + t / 2;
    const cutDepth = t + 8;
    const { airDia, pitchHalf, mountHoleR } = getFanSpecs(fanSize);
    const maxAllowedDia = Math.min(innerL, innerH) - 4;
    const dia = Math.max(24, Math.min(airDia, maxAllowedDia));

    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(dia / 2, dia / 2, cutDepth, 36),
        [0, centerY, rearZ],
        [Math.PI / 2, 0, 0]
      )
    );

    if (pitchHalf * 2 < Math.min(L, H) - 10) {
      const fanMounts: [number, number][] = [
        [-pitchHalf, -pitchHalf],
        [pitchHalf, -pitchHalf],
        [pitchHalf, pitchHalf],
        [-pitchHalf, pitchHalf],
      ];
      for (const [ox, oy] of fanMounts) {
        cutters.push(
          makeTransformedGeo(
            new THREE.CylinderGeometry(mountHoleR, mountHoleR, cutDepth, 14),
            [ox, centerY + oy, rearZ],
            [Math.PI / 2, 0, 0]
          )
        );
      }
    }
  } else if (hasWallMount) {
    // Rear Acrylic-Wall M3 Mounting Holes + Central Wire Pass-Through on Rear Wall (-Z)
    const rearZ = bodyCenterZ - bodyDepth / 2 + t / 2;
    const cutDepth = t + 8;
    const mx = Math.min(innerL * 0.34, 42);
    const my = Math.min(innerH * 0.32, 32);

    const mountPts: [number, number][] = [
      [-mx, -my],
      [mx, -my],
      [mx, my],
      [-mx, my],
    ];
    for (const [ox, oy] of mountPts) {
      cutters.push(
        makeTransformedGeo(
          new THREE.CylinderGeometry(1.7, 1.7, cutDepth, 14),
          [ox, centerY + oy, rearZ],
          [Math.PI / 2, 0, 0]
        )
      );
    }
    // Central cable pass-through hole into the acrylic case
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(8, 8, cutDepth, 20),
        [0, centerY, rearZ],
        [Math.PI / 2, 0, 0]
      )
    );
  }

  current = subtractMerged(current, cutters);

  const finalGeo = current.geometry.clone();
  finalGeo.computeVertexNormals();
  current.geometry.dispose();
  return finalGeo;
}

/**
 * Builds the matching Rounded Front Faceplate / Lid with:
 * - 4x M3 corner screw holes
 * - Optional OLED 0.96" I2C display cutout (+ 4x M2 mount holes)
 * - Optional 40mm or 80mm Fan opening (+ 4x mount holes)
 *
 * Centered at X=0, Y=H/2, faceplate Z spans [-t/2, +t/2] in local space.
 */
export function buildIoTBoxLidGeometry(params: IoTBoxParams): THREE.BufferGeometry {
  const {
    length: L,
    height: H,
    wallThickness: t,
    cornerRadius: r,
    hasOled,
    hasFan40,
    fanPlacement,
    fanSize,
  } = params;

  const centerY = H / 2;

  // Base rounded front plate with subtle front bevel
  const plateGeo = makeTransformedGeo(
    createRoundedBlockGeo(L, H, t, r, 0.7),
    [0, centerY, 0]
  );
  let lid = makeBrushFromGeo(plateGeo);

  const cutters: THREE.BufferGeometry[] = [];
  const cutDepth = t + 8;

  // 1. 4x Corner M3 Countersunk Through-Holes + Flush Bolt-Head Pockets on Front Face (+Z)
  const screwOffsets = getFaceplateScrewOffsets(params);
  for (const [sx, sy] of screwOffsets) {
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(1.7, 1.7, cutDepth, 14),
        [sx, centerY + sy, 0],
        [Math.PI / 2, 0, 0]
      ),
      makeTransformedGeo(
        new THREE.CylinderGeometry(3.1, 3.1, 2.0, 16),
        [sx, centerY + sy, t / 2 - 0.2],
        [Math.PI / 2, 0, 0]
      )
    );
  }

  // 2. Optional 0.96" I2C OLED Cutout Window (26mm x 14mm) + 4x M2 Mount Holes
  if (hasOled && L >= 52 && H >= 40) {
    // Main active display window
    cutters.push(
      makeTransformedGeo(new THREE.BoxGeometry(26, 14, cutDepth), [0, centerY, 0])
    );
    // Subtle recessed outer bezel pocket on front face
    cutters.push(
      makeTransformedGeo(
        new THREE.BoxGeometry(30, 18, 1.2),
        [0, centerY, t / 2]
      )
    );
    // 4x M2 mount holes (23.5mm pitch)
    const oledMounts: [number, number][] = [
      [-11.75, -11.75],
      [11.75, -11.75],
      [11.75, 11.75],
      [-11.75, 11.75],
    ];
    for (const [ox, oy] of oledMounts) {
      cutters.push(
        makeTransformedGeo(
          new THREE.CylinderGeometry(1.1, 1.1, cutDepth, 12),
          [ox, centerY + oy, 0],
          [Math.PI / 2, 0, 0]
        )
      );
    }
  }

  // 3. Optional Cooling Fan Cutout on Front Faceplate (only when fanPlacement === 'front')
  if (hasFan40 && fanPlacement === 'front') {
    const { airDia, pitchHalf, mountHoleR } = getFanSpecs(fanSize);
    const maxAllowedDia = Math.min(L, H) - t * 2 - 8;
    const dia = Math.max(24, Math.min(airDia, maxAllowedDia));

    // Main circular air opening
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(dia / 2, dia / 2, cutDepth, 40),
        [0, centerY, 0],
        [Math.PI / 2, 0, 0]
      )
    );

    // 4x Fan mounting screw holes if they fit cleanly inside the plate
    if (pitchHalf * 2 < Math.min(L, H) - 10) {
      const fanMounts: [number, number][] = [
        [-pitchHalf, -pitchHalf],
        [pitchHalf, -pitchHalf],
        [pitchHalf, pitchHalf],
        [-pitchHalf, pitchHalf],
      ];
      for (const [ox, oy] of fanMounts) {
        cutters.push(
          makeTransformedGeo(
            new THREE.CylinderGeometry(mountHoleR, mountHoleR, cutDepth, 14),
            [ox, centerY + oy, 0],
            [Math.PI / 2, 0, 0]
          )
        );
      }
    }
  }

  lid = subtractMerged(lid, cutters);

  const finalGeo = lid.geometry.clone();
  finalGeo.computeVertexNormals();
  lid.geometry.dispose();
  return finalGeo;
}

export interface BracketBoltSpec {
  position: [number, number, number];
  rotation: [number, number, number];
}

/**
 * Returns the exact 3D bolt head positions & rotations for visual preview in Module 2
 * (bolts are visual-only and never exported to STL).
 */
export function getBracketBoltPositions(params: BracketParams): BracketBoltSpec[] {
  const { type, armLength: arm, thickness: t, armWidth: w, holeOffset } = params;
  const off = Math.min(Math.max(w * 0.65, holeOffset), arm - 4.5);

  if (type === 't-bracket') {
    const topY = arm + w / 2;
    const z = t / 2 + 0.7;
    return [
      { position: [-off, topY, z], rotation: [Math.PI / 2, 0, 0] },
      { position: [off, topY, z], rotation: [Math.PI / 2, 0, 0] },
      { position: [0, topY - off, z], rotation: [Math.PI / 2, 0, 0] },
    ];
  }

  if (type === 'cross-bracket') {
    const cy = arm;
    const z = t / 2 + 0.7;
    return [
      { position: [-off, cy, z], rotation: [Math.PI / 2, 0, 0] },
      { position: [off, cy, z], rotation: [Math.PI / 2, 0, 0] },
      { position: [0, cy + off, z], rotation: [Math.PI / 2, 0, 0] },
      { position: [0, cy - off, z], rotation: [Math.PI / 2, 0, 0] },
    ];
  }

  if (type === 'l-bracket') {
    const x0 = -arm / 2;
    return [
      { position: [x0 + off, t + 0.7, 0], rotation: [0, 0, 0] },
      { position: [x0 + t + 0.7, off, 0], rotation: [0, 0, Math.PI / 2] },
    ];
  }

  // corner-3way
  const half = arm / 2;
  const off3 = Math.min(Math.max(t + 6, holeOffset), arm - 5);
  return [
    // X-arm bolt (front face)
    { position: [-half + off3, w / 2, -half - 0.7], rotation: [Math.PI / 2, 0, 0] },
    // Y-arm bolt (front face)
    { position: [-half + w / 2, off3, -half - 0.7], rotation: [Math.PI / 2, 0, 0] },
    // Z-arm bolt (left face)
    { position: [-half - 0.7, w / 2, -half + off3], rotation: [0, 0, Math.PI / 2] },
  ];
}

/**
 * Builds watertight, 3D-printable structural acrylic mounting brackets using three-bvh-csg:
 * - 'corner-3way'   : 3-axis outer corner armor bracket (8x for case outer corners)
 * - 't-bracket'     : T-joint clamp plate with 3x M3 countersunk holes (6x for Divider & Middle Shelf)
 * - 'cross-bracket' : 4-way (+) clamp plate with 4x M3 countersunk holes (2x for Divider x Middle Shelf)
 * - 'l-bracket'     : Heavy-duty 90° L-bracket with dual reinforcement gussets (10x for rear shelf/foot/comb)
 *
 * Units: 1 Three.js unit = 1 mm. Bottom sits cleanly at Y = 0.
 */
export function buildBracketGeometry(params: BracketParams): THREE.BufferGeometry {
  const { type, armLength: arm, thickness: t, armWidth: w, screwDiameter: dia, holeOffset } =
    params;
  const rHole = Math.max(1.2, dia / 2);
  const rHead = rHole + 1.45;
  const off = Math.min(Math.max(w * 0.65, holeOffset), arm - 4.5);

  if (type === 't-bracket') {
    const topY = arm + w / 2;
    const hBar = makeTransformedGeo(
      createRoundedBlockGeo(arm * 2, w, t, 3, 0.5),
      [0, topY, 0]
    );
    const vStem = makeTransformedGeo(
      createRoundedBlockGeo(w, arm + w * 0.5, t, 3, 0.5),
      [0, (arm + w * 0.5) / 2, 0]
    );

    let body = makeBrushFromGeo(hBar);
    body = unionMerged(body, [vStem]);

    const holePts: [number, number][] = [
      [-off, topY],
      [off, topY],
      [0, topY - off],
    ];
    const cutters: THREE.BufferGeometry[] = [];
    for (const [hx, hy] of holePts) {
      cutters.push(
        // M3 clearance shaft
        makeTransformedGeo(
          new THREE.CylinderGeometry(rHole, rHole, t + 6, 18),
          [hx, hy, 0],
          [Math.PI / 2, 0, 0]
        ),
        // Front countersunk M3 bolt-head recess (+Z)
        makeTransformedGeo(
          new THREE.CylinderGeometry(rHead, rHead, 2.2, 18),
          [hx, hy, t / 2 - 0.4],
          [Math.PI / 2, 0, 0]
        ),
        // Rear hexagonal M3 captive nut pocket (-Z)
        makeM3HexPocketGeo([hx, hy, -t / 2 + 0.7], [Math.PI / 2, 0, 0], 2.4)
      );
    }
    body = subtractMerged(body, cutters);
    const out = body.geometry.clone();
    out.computeVertexNormals();
    body.geometry.dispose();
    return out;
  }

  if (type === 'cross-bracket') {
    const cy = arm;
    const hBar = makeTransformedGeo(
      createRoundedBlockGeo(arm * 2, w, t, 3, 0.5),
      [0, cy, 0]
    );
    const vBar = makeTransformedGeo(
      createRoundedBlockGeo(w, arm * 2, t, 3, 0.5),
      [0, cy, 0]
    );

    let body = makeBrushFromGeo(hBar);
    body = unionMerged(body, [vBar]);

    const holePts: [number, number][] = [
      [-off, cy],
      [off, cy],
      [0, cy + off],
      [0, cy - off],
    ];
    const cutters: THREE.BufferGeometry[] = [];
    for (const [hx, hy] of holePts) {
      cutters.push(
        // M3 clearance shaft
        makeTransformedGeo(
          new THREE.CylinderGeometry(rHole, rHole, t + 6, 18),
          [hx, hy, 0],
          [Math.PI / 2, 0, 0]
        ),
        // Front countersunk M3 bolt-head recess (+Z)
        makeTransformedGeo(
          new THREE.CylinderGeometry(rHead, rHead, 2.2, 18),
          [hx, hy, t / 2 - 0.4],
          [Math.PI / 2, 0, 0]
        ),
        // Rear hexagonal M3 captive nut pocket (-Z)
        makeM3HexPocketGeo([hx, hy, -t / 2 + 0.7], [Math.PI / 2, 0, 0], 2.4)
      );
    }
    body = subtractMerged(body, cutters);
    const out = body.geometry.clone();
    out.computeVertexNormals();
    body.geometry.dispose();
    return out;
  }

  if (type === 'l-bracket') {
    const x0 = -arm / 2;
    const baseLeg = makeTransformedGeo(
      new THREE.BoxGeometry(arm, t, w),
      [0, t / 2, 0]
    );
    const upLeg = makeTransformedGeo(
      new THREE.BoxGeometry(t, arm, w),
      [x0 + t / 2, arm / 2, 0]
    );

    // Dual triangular side reinforcement gussets (ribs) for high load stiffness
    const gussetSize = Math.max(8, arm - t - 4);
    const tri = new THREE.Shape();
    tri.moveTo(0, 0);
    tri.lineTo(gussetSize, 0);
    tri.lineTo(0, gussetSize);
    tri.closePath();
    const ribRaw = new THREE.ExtrudeGeometry(tri, {
      depth: 2.6,
      bevelEnabled: false,
    });
    const ribFront = makeTransformedGeo(
      ribRaw.clone(),
      [x0 + t - 0.3, t - 0.3, w / 2 - 2.6]
    );
    const ribBack = makeTransformedGeo(
      ribRaw,
      [x0 + t - 0.3, t - 0.3, -w / 2]
    );

    let body = makeBrushFromGeo(baseLeg);
    body = unionMerged(body, [upLeg, ribFront, ribBack]);

    const cutters: THREE.BufferGeometry[] = [
      // Bottom leg M3 hole + top captive hex nut pocket
      makeTransformedGeo(
        new THREE.CylinderGeometry(rHole, rHole, t + 8, 18),
        [x0 + off, t / 2, 0]
      ),
      makeM3HexPocketGeo([x0 + off, t - 0.7, 0], [0, 0, 0], 2.5),
      // Vertical leg M3 hole + inner captive hex nut pocket
      makeTransformedGeo(
        new THREE.CylinderGeometry(rHole, rHole, t + 8, 18),
        [x0 + t / 2, off, 0],
        [0, 0, Math.PI / 2]
      ),
      makeM3HexPocketGeo([x0 + t - 0.7, off, 0], [0, 0, Math.PI / 2], 2.5),
    ];

    body = subtractMerged(body, cutters);
    const out = body.geometry.clone();
    out.computeVertexNormals();
    body.geometry.dispose();
    return out;
  }

  // Default: 'corner-3way' — 3-Axis Outer Corner Armor Bracket wrapping X, Y, Z edges
  const half = arm / 2;
  const off3 = Math.min(Math.max(t + 6, holeOffset), arm - 5);

  const armX = makeTransformedGeo(
    new THREE.BoxGeometry(arm, w, t),
    [0, w / 2, -half + t / 2]
  );
  const armY = makeTransformedGeo(
    new THREE.BoxGeometry(w, arm, t),
    [-half + w / 2, arm / 2, -half + t / 2]
  );
  const armZ = makeTransformedGeo(
    new THREE.BoxGeometry(t, w, arm),
    [-half + t / 2, w / 2, 0]
  );
  // Bottom flange tying X & Z arms cleanly under the corner
  const basePlate = makeTransformedGeo(
    new THREE.BoxGeometry(arm, t, arm),
    [0, t / 2, 0]
  );
  // Trim outer diagonal pocket of basePlate so it stays sleek L-shaped
  const baseTrim = makeTransformedGeo(
    new THREE.BoxGeometry(arm - w + 2, t + 6, arm - w + 2),
    [w / 2 + 1, t / 2, w / 2 + 1]
  );

  let body = makeBrushFromGeo(armX);
  body = unionMerged(body, [armY, armZ, basePlate]);

  const cutters: THREE.BufferGeometry[] = [
    baseTrim,
    // M3 hole + outer countersunk head + inner hex nut pocket on X-arm
    makeTransformedGeo(
      new THREE.CylinderGeometry(rHole, rHole, t + 8, 18),
      [-half + off3, w / 2, -half + t / 2],
      [Math.PI / 2, 0, 0]
    ),
    makeTransformedGeo(
      new THREE.CylinderGeometry(rHead, rHead, 2.0, 16),
      [-half + off3, w / 2, -half + 0.3],
      [Math.PI / 2, 0, 0]
    ),
    makeM3HexPocketGeo([-half + off3, w / 2, -half + t - 0.6], [Math.PI / 2, 0, 0], 2.4),

    // M3 hole + outer countersunk head + inner hex nut pocket on Y-arm
    makeTransformedGeo(
      new THREE.CylinderGeometry(rHole, rHole, t + 8, 18),
      [-half + w / 2, off3, -half + t / 2],
      [Math.PI / 2, 0, 0]
    ),
    makeTransformedGeo(
      new THREE.CylinderGeometry(rHead, rHead, 2.0, 16),
      [-half + w / 2, off3, -half + 0.3],
      [Math.PI / 2, 0, 0]
    ),
    makeM3HexPocketGeo([-half + w / 2, off3, -half + t - 0.6], [Math.PI / 2, 0, 0], 2.4),

    // M3 hole + outer countersunk head + inner hex nut pocket on Z-arm
    makeTransformedGeo(
      new THREE.CylinderGeometry(rHole, rHole, t + 8, 18),
      [-half + t / 2, w / 2, -half + off3],
      [0, 0, Math.PI / 2]
    ),
    makeTransformedGeo(
      new THREE.CylinderGeometry(rHead, rHead, 2.0, 16),
      [-half + 0.3, w / 2, -half + off3],
      [0, 0, Math.PI / 2]
    ),
    makeM3HexPocketGeo([-half + t - 0.6, w / 2, -half + off3], [0, 0, Math.PI / 2], 2.4),
  ];

  body = subtractMerged(body, cutters);
  const out = body.geometry.clone();
  out.computeVertexNormals();
  body.geometry.dispose();
  return out;
}
