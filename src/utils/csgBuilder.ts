import * as THREE from 'three';
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { IoTBoxParams } from '../types/cad';

const evaluator = new Evaluator();
evaluator.useGroups = false;

function makeBrush(
  geometry: THREE.BufferGeometry,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0]
): Brush {
  // Ensure geometry has non-indexed/uv attributes compatible with three-bvh-csg
  const brush = new Brush(geometry);
  brush.position.set(pos[0], pos[1], pos[2]);
  brush.rotation.set(rot[0], rot[1], rot[2]);
  brush.updateMatrixWorld(true);
  return brush;
}

/**
 * Builds the main parametric ESP32 IoT Box solid mesh geometry using CSG boolean operations.
 * Units: 1 Three.js unit = 1 mm. Base sits at Y = 0 (Y-up in Three.js viewport).
 */
export function buildIoTBoxGeometry(params: IoTBoxParams): THREE.BufferGeometry {
  const {
    length: L,
    width: W,
    height: H,
    wallThickness: t,
    hasOled,
    hasStandoffs,
    standoffSpacingX,
    standoffSpacingZ,
    hasFan40,
    hasUsbCable,
  } = params;

  const innerL = Math.max(20, L - t * 2);
  const innerW = Math.max(20, W - t * 2);

  // 1. Base outer solid box
  let current = makeBrush(new THREE.BoxGeometry(L, H, W), [0, H / 2, 0]);

  // 2. Hollow interior cavity (extend top by +4mm to eliminate coplanar CSG issues)
  const cavityH = H - t + 4;
  const cavity = makeBrush(
    new THREE.BoxGeometry(innerL, cavityH, innerW),
    [0, t + cavityH / 2, 0]
  );
  current = evaluator.evaluate(current, cavity, SUBTRACTION);
  cavity.geometry.dispose();

  // 3. Optional: 4x ESP32 Screw Terminal Standoffs (Union) + pilot screw holes (Subtract)
  if (hasStandoffs) {
    const standoffH = 8;
    const outerR = 3.2;
    const pilotR = 1.35; // M2.5 / M3 self-tapping pilot hole
    const maxSX = Math.max(10, innerL - 12);
    const maxSZ = Math.max(10, innerW - 12);
    const sx = Math.min(standoffSpacingX, maxSX) / 2;
    const sz = Math.min(standoffSpacingZ, maxSZ) / 2;

    const corners: [number, number][] = [
      [-sx, -sz],
      [sx, -sz],
      [sx, sz],
      [-sx, sz],
    ];

    for (const [cx, cz] of corners) {
      // Overlap 0.6mm into floor so union is strictly manifold
      const pillar = makeBrush(
        new THREE.CylinderGeometry(outerR, outerR + 0.4, standoffH + 0.6, 20),
        [cx, t + standoffH / 2 - 0.3, cz]
      );
      current = evaluator.evaluate(current, pillar, ADDITION);
      pillar.geometry.dispose();

      // Subtract screw pilot hole from top of standoff
      const holeDepth = standoffH - 1;
      const pilot = makeBrush(
        new THREE.CylinderGeometry(pilotR, pilotR, holeDepth + 2, 16),
        [cx, t + standoffH - holeDepth / 2 + 1, cz]
      );
      current = evaluator.evaluate(current, pilot, SUBTRACTION);
      pilot.geometry.dispose();
    }
  }

  // 4. Optional: OLED 0.96" I2C cutout on Front panel (+Z face)
  // Standard 0.96" SSD1306 module: viewing window ~25x14mm, 4x M2 holes at 23.5x23.5mm pitch
  if (hasOled && L >= 40 && H >= 34) {
    const oledY = Math.min(H - 14, Math.max(t + 16, H * 0.56));
    const frontZ = W / 2 - t / 2;
    const cutDepth = t + 8;

    const screenCut = makeBrush(
      new THREE.BoxGeometry(25, 14, cutDepth),
      [0, oledY, frontZ]
    );
    current = evaluator.evaluate(current, screenCut, SUBTRACTION);
    screenCut.geometry.dispose();

    const mountOffsets: [number, number][] = [
      [-11.75, -11.75],
      [11.75, -11.75],
      [11.75, 11.75],
      [-11.75, 11.75],
    ];
    for (const [ox, oy] of mountOffsets) {
      if (oledY + oy > t + 3 && oledY + oy < H - 3) {
        const m2 = makeBrush(
          new THREE.CylinderGeometry(1.15, 1.15, cutDepth, 14),
          [ox, oledY + oy, frontZ],
          [Math.PI / 2, 0, 0]
        );
        current = evaluator.evaluate(current, m2, SUBTRACTION);
        m2.geometry.dispose();
      }
    }
  }

  // 5. Optional: 40mm Cooling Fan cutout on Right panel (+X face)
  // Standard 40mm fan: Ø37mm air hole + 4x M3 holes at 32x32mm pitch (±16mm)
  if (hasFan40 && W >= 48 && H >= 44) {
    const fanY = Math.min(H - 22, Math.max(t + 20, H * 0.52));
    const rightX = L / 2 - t / 2;
    const cutDepth = t + 8;
    const maxRadius = Math.min(18.5, (H - t - 6) / 2);

    const airCut = makeBrush(
      new THREE.CylinderGeometry(maxRadius, maxRadius, cutDepth, 32),
      [rightX, fanY, 0],
      [0, 0, Math.PI / 2]
    );
    current = evaluator.evaluate(current, airCut, SUBTRACTION);
    airCut.geometry.dispose();

    const pitch = 16; // 32mm / 2
    const fanMounts: [number, number][] = [
      [-pitch, -pitch],
      [pitch, -pitch],
      [pitch, pitch],
      [-pitch, pitch],
    ];
    for (const [oz, oy] of fanMounts) {
      if (fanY + oy > t + 2.5 && fanY + oy < H - 2.5 && Math.abs(oz) < innerW / 2 - 2) {
        const m3 = makeBrush(
          new THREE.CylinderGeometry(1.65, 1.65, cutDepth, 14),
          [rightX, fanY + oy, oz],
          [0, 0, Math.PI / 2]
        );
        current = evaluator.evaluate(current, m3, SUBTRACTION);
        m3.geometry.dispose();
      }
    }
  }

  // 6. Optional: USB / Sensor Cable pass-through cutout on Left panel (-X face)
  if (hasUsbCable) {
    const leftX = -L / 2 + t / 2;
    const cutDepth = t + 8;
    const usbY = Math.min(H - 10, t + 11);

    // Main USB-C / Micro-USB port cutout (14mm x 9mm)
    const usbCut = makeBrush(
      new THREE.BoxGeometry(cutDepth, 9, 15),
      [leftX, usbY, -Math.min(14, innerW * 0.2)]
    );
    current = evaluator.evaluate(current, usbCut, SUBTRACTION);
    usbCut.geometry.dispose();

    // Round sensor cable grommet hole (Ø8mm) next to USB port
    const sensorCut = makeBrush(
      new THREE.CylinderGeometry(4, 4, cutDepth, 20),
      [leftX, usbY, Math.min(14, innerW * 0.2)],
      [0, 0, Math.PI / 2]
    );
    current = evaluator.evaluate(current, sensorCut, SUBTRACTION);
    sensorCut.geometry.dispose();
  }

  const finalGeo = current.geometry.clone();
  finalGeo.computeVertexNormals();
  current.geometry.dispose();
  return finalGeo;
}

/**
 * Builds a matching snap-fit Lid with inner alignment lip (0.3mm 3D-print tolerance).
 * Local origin at bottom of lid top-plate (y = 0).
 */
export function buildIoTBoxLidGeometry(params: IoTBoxParams): THREE.BufferGeometry {
  const { length: L, width: W, wallThickness: t } = params;
  const clearance = 0.35; // 3D printer tolerance per side
  const lipH = 3.2;
  const lipWall = 2.0;

  // Top flat cap
  const cap = makeBrush(new THREE.BoxGeometry(L, t, W), [0, t / 2, 0]);

  // Outer lip fitting inside the box cavity
  const lipL = Math.max(12, L - t * 2 - clearance * 2);
  const lipW = Math.max(12, W - t * 2 - clearance * 2);
  const lipOuter = makeBrush(
    new THREE.BoxGeometry(lipL, lipH + 0.5, lipW),
    [0, -lipH / 2 + 0.25, 0]
  );

  let lid = evaluator.evaluate(cap, lipOuter, ADDITION);
  cap.geometry.dispose();
  lipOuter.geometry.dispose();

  // Hollow out center of the inner lip so it doesn't collide with tall components
  const lipInnerL = Math.max(6, lipL - lipWall * 2);
  const lipInnerW = Math.max(6, lipW - lipWall * 2);
  const lipInner = makeBrush(
    new THREE.BoxGeometry(lipInnerL, lipH + 2, lipInnerW),
    [0, -lipH / 2 - 0.5, 0]
  );
  lid = evaluator.evaluate(lid, lipInner, SUBTRACTION);
  lipInner.geometry.dispose();

  const finalGeo = lid.geometry.clone();
  finalGeo.computeVertexNormals();
  lid.geometry.dispose();
  return finalGeo;
}
