import * as THREE from 'three';
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { IoTBoxParams } from '../types/cad';

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

  current = unionMerged(current, additions);

  // 4. Batched Subtractions: Pilot holes, Side Louver Vents, USB/Cable Ports, Rear Acrylic Mounts
  const cutters: THREE.BufferGeometry[] = [...pilotCutters];

  // Side Louver Ventilation Grills along Left (-X) & Right (+X) walls (signature look from photo!)
  if (hasSideVents) {
    const usableH = H - r * 2 - 8;
    const slotH = 3.2;
    const slotPitch = 7.2;
    const count = Math.max(3, Math.min(9, Math.floor(usableH / slotPitch)));
    const slotDepthZ = Math.max(10, bodyDepth - t * 2 - 10);
    const startY = centerY - ((count - 1) * slotPitch) / 2;

    for (let i = 0; i < count; i++) {
      const y = startY + i * slotPitch;
      // Cut clean horizontal louver slot through both left and right walls
      cutters.push(
        makeTransformedGeo(
          new THREE.BoxGeometry(L + 8, slotH, slotDepthZ),
          [0, y, bodyCenterZ]
        )
      );
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

  // Rear Acrylic-Wall M3 Mounting Holes + Central Wire Pass-Through on Rear Wall (-Z)
  if (hasWallMount) {
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

  // 1. 4x Corner M3 Countersunk Through-Holes
  const screwOffsets = getFaceplateScrewOffsets(params);
  for (const [sx, sy] of screwOffsets) {
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(1.7, 1.7, cutDepth, 14),
        [sx, centerY + sy, 0],
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

  // 3. Optional Cooling Fan Cutout on Front Faceplate (40mm or 80mm Fan Pod)
  if (hasFan40) {
    const maxAllowedDia = Math.min(L, H) - t * 2 - 14;
    const targetDia = fanSize === 80 ? 76 : 37;
    const dia = Math.max(24, Math.min(targetDia, maxAllowedDia));
    const pitchHalf = fanSize === 80 ? 35.75 : 16; // 71.5mm for 80mm fan, 32mm for 40mm fan

    // Main circular air opening
    cutters.push(
      makeTransformedGeo(
        new THREE.CylinderGeometry(dia / 2, dia / 2, cutDepth, 36),
        [0, centerY, 0],
        [Math.PI / 2, 0, 0]
      )
    );

    // 4x Fan mounting screw holes if they fit cleanly inside the plate
    if (pitchHalf * 2 < Math.min(L, H) - 16) {
      const fanMounts: [number, number][] = [
        [-pitchHalf, -pitchHalf],
        [pitchHalf, -pitchHalf],
        [pitchHalf, pitchHalf],
        [-pitchHalf, pitchHalf],
      ];
      for (const [ox, oy] of fanMounts) {
        cutters.push(
          makeTransformedGeo(
            new THREE.CylinderGeometry(1.8, 1.8, cutDepth, 14),
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
