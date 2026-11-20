import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AcrylicPanel,
  AcrylicViewMode,
  ActiveModule,
  BracketParams,
  BracketType,
  CableFilterCategory,
  CaseDimensions,
  HoleType,
  IoTBoxParams,
  IoTBoxPreset,
  IoTSimState,
  PanelHole,
  PanelId,
  Point2D,
  PrintPartCategory,
} from '../types/cad';

function makeRectOutline(width: number, height: number): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
}

/**
 * Generates an industrial chamfered bridge-foot outline for Left & Right side walls.
 * Bottom extends down by `legH` forming sturdy front & rear acrylic feet with a 45° airflow arch.
 */
function makeSideLegOutline(totalW: number, mainH: number, legH: number): Point2D[] {
  if (legH <= 2) return makeRectOutline(totalW, mainH);
  const footW = Math.min(62, Math.max(36, Math.round(totalW * 0.16)));
  const chamfer = Math.min(28, Math.round(legH * 0.85));
  const totalH = mainH + legH;

  return [
    { x: 0, y: 0 },
    { x: totalW, y: 0 },
    { x: totalW, y: totalH },
    { x: totalW - footW, y: totalH },
    { x: totalW - footW - chamfer, y: mainH },
    { x: footW + chamfer, y: mainH },
    { x: footW, y: totalH },
    { x: 0, y: totalH },
  ];
}

/**
 * Generates a Single-Bay U-Shaped slide-in dust filter track mounted underneath the Bottom panel.
 * Features solid left, right, and rear borders with an open front for pulling out the filter tray.
 */
function makeSingleBayFilterRailOutline(
  w: number,
  h: number,
  railW = 18
): Point2D[] {
  const rw = Math.min(railW, Math.floor(w / 8), Math.floor(h / 6));

  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: w - rw, y: h },
    { x: w - rw, y: rw },
    { x: rw, y: rw },
    { x: rw, y: h },
    { x: 0, y: h },
  ];
}

/**
 * Generates a laser-cut acrylic cable management comb bar with evenly-spaced teeth slots
 * mounted inside the Rear Wiring Chamber to organize PC, Laptop, Fan & LED cables.
 */
function makeCableCombOutline(w: number, d: number): Point2D[] {
  const slotCount = Math.max(6, Math.min(12, Math.floor(w / 55)));
  const marginX = 28;
  const usableW = Math.max(60, w - marginX * 2);
  const pitch = usableW / slotCount;
  const slotW = Math.min(14, Math.max(8, Math.round(pitch * 0.34)));
  const slotDepth = Math.max(8, Math.round(d * 0.58));

  // Spine along bottom of Konva (y = d -> touches back wall), comb slots cut from top (y = 0 -> toward rear cover)
  const pts: Point2D[] = [{ x: 0, y: 0 }];

  for (let i = 0; i < slotCount; i++) {
    const cx = marginX + pitch * (i + 0.5);
    const x0 = Math.round(cx - slotW / 2);
    const x1 = Math.round(cx + slotW / 2);
    pts.push({ x: x0, y: 0 });
    pts.push({ x: x0, y: slotDepth });
    pts.push({ x: x1, y: slotDepth });
    pts.push({ x: x1, y: 0 });
  }

  pts.push({ x: w, y: 0 });
  pts.push({ x: w, y: d });
  pts.push({ x: 0, y: d });

  return pts;
}

export function getPanelGeometrySpec(
  id: PanelId,
  dims: CaseDimensions
): { width: number; height: number; outline: Point2D[] } {
  const { length: L, width: W, height: H, thickness: t, legHeight, wiringDepth } = dims;
  const totalW = W + wiringDepth;
  const innerL = Math.max(80, L - t * 2);
  const innerW = Math.max(60, W - t * 2);
  const wallH = Math.max(80, H - t); // vertical walls span from y=legHeight to y=legHeight+H-t
  const combDepth = Math.max(18, wiringDepth - t - 4);
  const doorW = Math.max(60, Math.round(L / 2 - t - 1));
  const doorH = Math.max(80, wallH - 2);

  switch (id) {
    case 'top':
      return { width: L, height: totalW, outline: makeRectOutline(L, totalW) };
    case 'bottom':
      return { width: innerL, height: innerW, outline: makeRectOutline(innerL, innerW) };
    case 'filter-rail':
      return {
        width: innerL,
        height: innerW,
        outline: makeSingleBayFilterRailOutline(innerL, innerW, 18),
      };
    case 'front-left':
      return { width: doorW, height: doorH, outline: makeRectOutline(doorW, doorH) };
    case 'front-right':
      return { width: doorW, height: doorH, outline: makeRectOutline(doorW, doorH) };
    case 'back':
    case 'rear-cover':
      return { width: innerL, height: wallH, outline: makeRectOutline(innerL, wallH) };
    case 'left':
    case 'right':
      return {
        width: totalW,
        height: wallH + legHeight,
        outline: makeSideLegOutline(totalW, wallH, legHeight),
      };
    case 'middle':
    case 'middle-2':
      return {
        width: innerL,
        height: innerW,
        outline: makeRectOutline(innerL, innerW),
      };
    case 'cable-comb':
      return {
        width: innerL,
        height: combDepth,
        outline: makeCableCombOutline(innerL, combDepth),
      };
    case 'rear-floor': {
      const rearFloorDepth = Math.max(20, wiringDepth - t);
      return {
        width: innerL,
        height: rearFloorDepth,
        outline: makeRectOutline(innerL, rearFloorDepth),
      };
    }
  }
}

function makeCornerM3Holes(
  panelId: PanelId,
  w: number,
  h: number,
  margin = 14,
  bottomMargin = margin
): PanelHole[] {
  const coords = [
    { x: margin, y: margin, tag: 'TL' },
    { x: w - margin, y: margin, tag: 'TR' },
    { x: w - margin, y: h - bottomMargin, tag: 'BR' },
    { x: margin, y: h - bottomMargin, tag: 'BL' },
  ];
  return coords.map((c, idx) => ({
    id: `${panelId}-m3-${c.tag}-${idx}`,
    type: 'm3' as const,
    label: `Braket M3 ${c.tag}`,
    x: Math.round(c.x),
    y: Math.round(c.y),
    diameter: 3.2, // M3 clearance hole for laser-cut 5mm cast acrylic
  }));
}

function createInitialPanels(dims: CaseDimensions): Record<PanelId, AcrylicPanel> {
  const specs: Array<{
    id: PanelId;
    name: string;
    description: string;
    enabled: boolean;
  }> = [
    {
      id: 'bottom',
      name: 'Bottom (Lantai Dasar Tier 1)',
      description: 'Lantai dasar untuk Laptop Server #1 + 2× Fan 120mm Intake',
      enabled: true,
    },
    {
      id: 'filter-rail',
      name: 'Dust Filter Rail (Slide-in Track)',
      description: 'Rel akrilik bawah untuk laci filter debu 2× Fan 120mm',
      enabled: true,
    },
    {
      id: 'middle',
      name: 'Middle Shelf 1 (Rak Tier 2)',
      description: 'Rak tingkat 2 untuk Laptop Server #2 + 2× Ventilasi Airflow 120mm',
      enabled: true,
    },
    {
      id: 'middle-2',
      name: 'Middle Shelf 2 (Rak Tier 3)',
      description: 'Rak tingkat 3 untuk Laptop Server #3 + 2× Ventilasi Airflow 120mm',
      enabled: true,
    },
    {
      id: 'top',
      name: 'Top (Atap Akrilik)',
      description: 'Atap akrilik + 2× Exhaust 120mm + Sensor Asap MQ-2',
      enabled: true,
    },
    {
      id: 'left',
      name: 'Left Wall + Kaki Akrilik',
      description: 'Dinding kiri chamfer bridge feet + engsel pintu kiri',
      enabled: true,
    },
    {
      id: 'right',
      name: 'Right Wall + Kaki (IoT Box)',
      description: 'Dinding kanan + kaki chamfer + mounting 1 unit IoT Box (196×126×64mm)',
      enabled: true,
    },
    {
      id: 'back',
      name: 'Back Partition (Partisi Belakang)',
      description: 'Sekat belakang: 3× grommet kabel laptop + 3× mounting DHT21/AM2301',
      enabled: true,
    },
    {
      id: 'cable-comb',
      name: 'Cable Comb (Sisir Kabel)',
      description: 'Sisir akrilik perapih kabel charger laptop, LAN & sensor di ruang belakang',
      enabled: true,
    },
    {
      id: 'rear-floor',
      name: 'Rear Floor (Lantai Ruang Belakang)',
      description: 'Lantai berventilasi untuk dudukan 3× Charger Laptop 65W + 1× Adaptor IoT',
      enabled: true,
    },
    {
      id: 'rear-cover',
      name: 'Rear Wiring Cover (Tutup Belakang)',
      description: 'Penutup ruang kabel belakang + lubang keluar kabel AC & LAN',
      enabled: true,
    },
    {
      id: 'front-left',
      name: 'Front Door Kiri (Engsel Kupu-kupu)',
      description: 'Pintu kaca berengsel kiri + handle magnet',
      enabled: true,
    },
    {
      id: 'front-right',
      name: 'Front Door Kanan (Engsel Kupu-kupu)',
      description: 'Pintu kaca berengsel kanan + handle magnet',
      enabled: true,
    },
  ];

  const panels = {} as Record<PanelId, AcrylicPanel>;
  const { length: L, width: W, height: H, thickness: t, shelf1Y, shelf2Y, legHeight, wiringDepth } = dims;
  const m3 = 3.2; // Standard M3 bolt clearance diameter (mm)

  for (const spec of specs) {
    const { width, height, outline } = getPanelGeometrySpec(spec.id, dims);
    let holes: PanelHole[] = [];

    if (spec.id === 'filter-rail') {
      // 4x M3 through-holes matching the bottom panel
      holes = [
        { id: 'fr-m3-1', type: 'm3', label: 'Rail M3 Depan-Kiri', x: 9, y: height - 18, diameter: m3 },
        { id: 'fr-m3-2', type: 'm3', label: 'Rail M3 Depan-Kanan', x: width - 9, y: height - 18, diameter: m3 },
        { id: 'fr-m3-3', type: 'm3', label: 'Rail M3 Belakang-Kiri', x: 9, y: 9, diameter: m3 },
        { id: 'fr-m3-4', type: 'm3', label: 'Rail M3 Belakang-Kanan', x: width - 9, y: 9, diameter: m3 },
      ];
    } else if (spec.id === 'cable-comb') {
      holes = [
        { id: 'cc-m3-l', type: 'm3', label: 'Comb L-Bracket Kiri', x: 14, y: height - 8, diameter: m3 },
        { id: 'cc-m3-m', type: 'm3', label: 'Comb L-Bracket Tengah', x: Math.round(width / 2), y: height - 8, diameter: m3 },
        { id: 'cc-m3-r', type: 'm3', label: 'Comb L-Bracket Kanan', x: width - 14, y: height - 8, diameter: m3 },
      ];
    } else if (spec.id === 'rear-floor') {
      // Ventilated Rear Chamber Floor supporting Mini PDU & 4x Power Bricks (IoT 12V + 3x Laptop 65W)
      const midY = Math.round(height / 2);
      const ventH = Math.max(12, Math.min(26, height - 22));
      holes = [
        { id: 'rf-m3-fl', type: 'm3', label: 'L-Bracket Kiri Depan', x: 14, y: height - 10, diameter: m3 },
        { id: 'rf-m3-bl', type: 'm3', label: 'L-Bracket Kiri Belakang', x: 14, y: 10, diameter: m3 },
        { id: 'rf-m3-fr', type: 'm3', label: 'L-Bracket Kanan Depan', x: width - 14, y: height - 10, diameter: m3 },
        { id: 'rf-m3-br', type: 'm3', label: 'L-Bracket Kanan Belakang', x: width - 14, y: 10, diameter: m3 },
        { id: 'rf-m3-mid', type: 'm3', label: 'L-Bracket Tengah Belakang', x: Math.round(width / 2), y: height - 10, diameter: m3 },
        // 4x Bottom Cool-Air Intake Slots directly underneath the 4 Charger/Adaptor Bricks
        { id: 'rf-vent-iot', type: 'vent', label: 'Ventilasi Adaptor 12V IoT', x: Math.round(width * 0.16), y: midY, width: 72, height: ventH, cornerRadius: 5 },
        { id: 'rf-vent-lap1', type: 'vent', label: 'Ventilasi Charger Laptop #1', x: Math.round(width * 0.40), y: midY, width: 72, height: ventH, cornerRadius: 5 },
        { id: 'rf-vent-lap2', type: 'vent', label: 'Ventilasi Charger Laptop #2', x: Math.round(width * 0.64), y: midY, width: 72, height: ventH, cornerRadius: 5 },
        { id: 'rf-vent-lap3', type: 'vent', label: 'Ventilasi Charger Laptop #3', x: Math.round(width * 0.86), y: midY, width: 72, height: ventH, cornerRadius: 5 },
      ];
    } else if (spec.id === 'front-left' || spec.id === 'front-right') {
      const isLeft = spec.id === 'front-left';
      const hingeX = isLeft ? 16 : width - 16;
      const handleX = isLeft ? width - 20 : 20;
      const topHingeY = Math.round(height * 0.22);
      const botHingeY = Math.round(height * 0.78);
      const midY = Math.round(height * 0.5);

      holes = [
        // Upper Butterfly Hinge (2x M3)
        { id: `${spec.id}-h1a`, type: 'm3', label: 'Engsel Atas #1 (M3)', x: hingeX, y: topHingeY - 12, diameter: m3 },
        { id: `${spec.id}-h1b`, type: 'm3', label: 'Engsel Atas #2 (M3)', x: hingeX, y: topHingeY + 12, diameter: m3 },
        // Lower Butterfly Hinge (2x M3)
        { id: `${spec.id}-h2a`, type: 'm3', label: 'Engsel Bawah #1 (M3)', x: hingeX, y: botHingeY - 12, diameter: m3 },
        { id: `${spec.id}-h2b`, type: 'm3', label: 'Engsel Bawah #2 (M3)', x: hingeX, y: botHingeY + 12, diameter: m3 },
        // Pull Handle (2x M3)
        { id: `${spec.id}-hdl1`, type: 'm3', label: 'Handle Atas (M3)', x: handleX, y: midY - 26, diameter: m3 },
        { id: `${spec.id}-hdl2`, type: 'm3', label: 'Handle Bawah (M3)', x: handleX, y: midY + 26, diameter: m3 },
        // Magnetic Catch Strike Plate (1x M3 near top inner edge)
        { id: `${spec.id}-mag1`, type: 'm3', label: 'Pelat Magnet Catch (M3)', x: handleX, y: 26, diameter: m3 },
      ];
    } else if (spec.id === 'left' || spec.id === 'right') {
      // 4 outer corner M3 holes (above chamfered leg arch)
      holes = makeCornerM3Holes(spec.id, width, height, 14, legHeight + 14);
    } else {
      holes = makeCornerM3Holes(spec.id, width, height, 14);
    }

    if (spec.id === 'left') {
      // On Left wall (rotated -90° Y): Konva x=0 is REAR (-Z), x=totalW is FRONT (+Z)!
      const mainH = height - legHeight;
      const topHingeY = Math.round(mainH * 0.22);
      const botHingeY = Math.round(mainH * 0.78);
      const frontHingeX = width - 15;
      const backPartX = wiringDepth + 14;
      const shelf1KonvaY = Math.round(mainH - shelf1Y);
      const shelf2KonvaY = Math.round(mainH - shelf2Y);

      holes.push(
        // Stationary Butterfly Hinge Mounts for Front Left Door (4x M3)
        { id: 'left-hinge-t1', type: 'm3', label: 'Engsel Pintu Kiri Atas #1', x: frontHingeX, y: topHingeY - 11, diameter: m3 },
        { id: 'left-hinge-t2', type: 'm3', label: 'Engsel Pintu Kiri Atas #2', x: frontHingeX, y: topHingeY + 11, diameter: m3 },
        { id: 'left-hinge-b1', type: 'm3', label: 'Engsel Pintu Kiri Bawah #1', x: frontHingeX, y: botHingeY - 11, diameter: m3 },
        { id: 'left-hinge-b2', type: 'm3', label: 'Engsel Pintu Kiri Bawah #2', x: frontHingeX, y: botHingeY + 11, diameter: m3 },
        // Middle Shelf 1 (Tier 2) Underside L-Bracket Mounts (2x M3)
        { id: 'left-s1-f', type: 'm3', label: 'L-Bracket Rak 1 Depan', x: width - 28, y: shelf1KonvaY + 14, diameter: m3 },
        { id: 'left-s1-b', type: 'm3', label: 'L-Bracket Rak 1 Belakang', x: wiringDepth + 28, y: shelf1KonvaY + 14, diameter: m3 },
        // Middle Shelf 2 (Tier 3) Underside L-Bracket Mounts (2x M3)
        { id: 'left-s2-f', type: 'm3', label: 'L-Bracket Rak 2 Depan', x: width - 28, y: shelf2KonvaY + 14, diameter: m3 },
        { id: 'left-s2-b', type: 'm3', label: 'L-Bracket Rak 2 Belakang', x: wiringDepth + 28, y: shelf2KonvaY + 14, diameter: m3 },
        // Back Partition L-Bracket Mounts (2x M3)
        { id: 'left-back-m3-t', type: 'm3', label: 'Braket Back Partition Atas', x: backPartX, y: 36, diameter: m3 },
        { id: 'left-back-m3-b', type: 'm3', label: 'Braket Back Partition Bawah', x: backPartX, y: mainH - 36, diameter: m3 },
        // Cable Comb Side Mount (1x M3)
        { id: 'left-comb-m3', type: 'm3', label: 'Mount Cable Comb', x: Math.round(wiringDepth * 0.5), y: Math.round(mainH * 0.48), diameter: m3 }
      );
    } else if (spec.id === 'right') {
      // On Right wall (rotated +90° Y): Konva x=0 is FRONT (+Z), x=totalW is REAR (-Z)!
      const mainCenterX = Math.round(W * 0.5);
      const mainH = height - legHeight;
      const mountY = Math.round(mainH * 0.5);
      const topHingeY = Math.round(mainH * 0.22);
      const botHingeY = Math.round(mainH * 0.78);
      const shelf1KonvaY = Math.round(mainH - shelf1Y);
      const shelf2KonvaY = Math.round(mainH - shelf2Y);

      holes.push(
        // Stationary Butterfly Hinge Mounts for Front Right Door (4x M3)
        { id: 'right-hinge-t1', type: 'm3', label: 'Engsel Pintu Kanan Atas #1', x: 15, y: topHingeY - 11, diameter: m3 },
        { id: 'right-hinge-t2', type: 'm3', label: 'Engsel Pintu Kanan Atas #2', x: 15, y: topHingeY + 11, diameter: m3 },
        { id: 'right-hinge-b1', type: 'm3', label: 'Engsel Pintu Kanan Bawah #1', x: 15, y: botHingeY - 11, diameter: m3 },
        { id: 'right-hinge-b2', type: 'm3', label: 'Engsel Pintu Kanan Bawah #2', x: 15, y: botHingeY + 11, diameter: m3 },
        // Middle Shelf 1 (Tier 2) Underside L-Bracket Mounts (2x M3)
        { id: 'right-s1-f', type: 'm3', label: 'L-Bracket Rak 1 Depan', x: 28, y: shelf1KonvaY + 14, diameter: m3 },
        { id: 'right-s1-b', type: 'm3', label: 'L-Bracket Rak 1 Belakang', x: W - 28, y: shelf1KonvaY + 14, diameter: m3 },
        // Middle Shelf 2 (Tier 3) Underside L-Bracket Mounts (2x M3)
        { id: 'right-s2-f', type: 'm3', label: 'L-Bracket Rak 2 Depan', x: 28, y: shelf2KonvaY + 14, diameter: m3 },
        { id: 'right-s2-b', type: 'm3', label: 'L-Bracket Rak 2 Belakang', x: W - 28, y: shelf2KonvaY + 14, diameter: m3 },
        // Back Partition L-Bracket Mounts (2x M3)
        { id: 'right-back-m3-t', type: 'm3', label: 'Braket Back Partition Atas', x: W - 14, y: 36, diameter: m3 },
        { id: 'right-back-m3-b', type: 'm3', label: 'Braket Back Partition Bawah', x: W - 14, y: mainH - 36, diameter: m3 },
        // Cable Comb Side Mount (1x M3)
        { id: 'right-comb-m3', type: 'm3', label: 'Mount Cable Comb', x: Math.round(W + wiringDepth * 0.5), y: Math.round(mainH * 0.48), diameter: m3 },
        // Single unified IoT Box (196×126×64mm) mounting pattern: wide cable slot + 4x M3 (±56×±48mm) matching CSG captive hex nuts 1:1!
        {
          id: 'right-iot-cable',
          type: 'vent',
          label: 'IoT Box Cable Pass-Through',
          x: mainCenterX,
          y: mountY + 21,
          width: 40,
          height: 20,
          cornerRadius: 5,
        },
        { id: 'right-iot-m3-1', type: 'm3', label: 'IoT Box Mount TL (M3)', x: mainCenterX - 56, y: mountY - 48, diameter: m3 },
        { id: 'right-iot-m3-2', type: 'm3', label: 'IoT Box Mount TR (M3)', x: mainCenterX + 56, y: mountY - 48, diameter: m3 },
        { id: 'right-iot-m3-3', type: 'm3', label: 'IoT Box Mount BR (M3)', x: mainCenterX + 56, y: mountY + 48, diameter: m3 },
        { id: 'right-iot-m3-4', type: 'm3', label: 'IoT Box Mount BL (M3)', x: mainCenterX - 56, y: mountY + 48, diameter: m3 }
      );
    } else if (spec.id === 'back') {
      const s1KonvaY = Math.round(height - shelf1Y);
      const s2KonvaY = Math.round(height - shelf2Y);
      const combY = Math.round(height * 0.48);

      holes.push(
        // L-Bracket Mounts supporting Shelf 1 & Shelf 2 along Back Partition
        { id: 'back-s1-l1', type: 'm3', label: 'L-Bracket Rak 1 Kiri', x: Math.round(width * 0.32), y: s1KonvaY + 12, diameter: m3 },
        { id: 'back-s1-l2', type: 'm3', label: 'L-Bracket Rak 1 Kanan', x: Math.round(width * 0.68), y: s1KonvaY + 12, diameter: m3 },
        { id: 'back-s2-l1', type: 'm3', label: 'L-Bracket Rak 2 Kiri', x: Math.round(width * 0.32), y: s2KonvaY + 12, diameter: m3 },
        { id: 'back-s2-l2', type: 'm3', label: 'L-Bracket Rak 2 Kanan', x: Math.round(width * 0.68), y: s2KonvaY + 12, diameter: m3 },
        // 3x Cable Comb Rear L-Bracket Mounts
        { id: 'back-comb-1', type: 'm3', label: 'Mount Cable Comb #1', x: 24, y: combY, diameter: m3 },
        { id: 'back-comb-2', type: 'm3', label: 'Mount Cable Comb #2', x: Math.round(width / 2), y: combY, diameter: m3 },
        { id: 'back-comb-3', type: 'm3', label: 'Mount Cable Comb #3', x: width - 24, y: combY, diameter: m3 },
        // 3x DHT21 / AM2301 Sensor Mounting M3 Holes + Ø8mm Wire Pass-Throughs (zero hanging cables!)
        // Tier 3 (Top) DHT21:
        { id: 'back-dht-t3-m3', type: 'm3', label: 'Mount DHT21 Tier 3 (M3)', x: Math.round(width * 0.2), y: Math.round(s2KonvaY * 0.5) - 16, diameter: m3 },
        { id: 'back-dht-t3-wire', type: 'm3', label: 'Kabel DHT21 Tier 3 (Ø8mm)', x: Math.round(width * 0.2), y: Math.round(s2KonvaY * 0.5) + 20, diameter: 8 },
        // Tier 2 (Middle) DHT21:
        { id: 'back-dht-t2-m3', type: 'm3', label: 'Mount DHT21 Tier 2 (M3)', x: Math.round(width * 0.2), y: Math.round((s1KonvaY + s2KonvaY) * 0.5) - 16, diameter: m3 },
        { id: 'back-dht-t2-wire', type: 'm3', label: 'Kabel DHT21 Tier 2 (Ø8mm)', x: Math.round(width * 0.2), y: Math.round((s1KonvaY + s2KonvaY) * 0.5) + 20, diameter: 8 },
        // Tier 1 (Bottom) DHT21:
        { id: 'back-dht-t1-m3', type: 'm3', label: 'Mount DHT21 Tier 1 (M3)', x: Math.round(width * 0.2), y: Math.round((height + s1KonvaY) * 0.5) - 16, diameter: m3 },
        { id: 'back-dht-t1-wire', type: 'm3', label: 'Kabel DHT21 Tier 1 (Ø8mm)', x: Math.round(width * 0.2), y: Math.round((height + s1KonvaY) * 0.5) + 20, diameter: 8 },
        // 1x MQ-2 Smoke Sensor Cable Pass-Through
        { id: 'back-mq2-wire', type: 'm3', label: 'Kabel MQ-2 Asap (Ø8mm)', x: Math.round(width * 0.5), y: 18, diameter: 8 },
        // 8x M3 Adaptor Cradle Mounting Holes (for 4x 3D-Printed Power Brick Cradles on Rear Side!)
        { id: 'back-cradle-iot-a', type: 'm3', label: 'Cradle Adaptor IoT A', x: Math.round(width * 0.16 - 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-iot-b', type: 'm3', label: 'Cradle Adaptor IoT B', x: Math.round(width * 0.16 + 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-lap1-a', type: 'm3', label: 'Cradle Charger Lap 1A', x: Math.round(width * 0.40 - 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-lap1-b', type: 'm3', label: 'Cradle Charger Lap 1B', x: Math.round(width * 0.40 + 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-lap2-a', type: 'm3', label: 'Cradle Charger Lap 2A', x: Math.round(width * 0.64 - 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-lap2-b', type: 'm3', label: 'Cradle Charger Lap 2B', x: Math.round(width * 0.64 + 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-lap3-a', type: 'm3', label: 'Cradle Charger Lap 3A', x: Math.round(width * 0.86 - 32), y: height - 26, diameter: m3 },
        { id: 'back-cradle-lap3-b', type: 'm3', label: 'Cradle Charger Lap 3B', x: Math.round(width * 0.86 + 32), y: height - 26, diameter: m3 },
        // 3x Laptop Cable Grommet Cutouts into Rear Wiring Chamber (Tier 1, Tier 2, Tier 3)
        {
          id: 'back-lap-wire-t3',
          type: 'vent',
          label: 'Slot Kabel Laptop Tier 3 (Atas)',
          x: Math.round(width * 0.5),
          y: Math.round(s2KonvaY * 0.5),
          width: 90,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'back-lap-wire-t2',
          type: 'vent',
          label: 'Slot Kabel Laptop Tier 2 (Tengah)',
          x: Math.round(width * 0.5),
          y: Math.round((s1KonvaY + s2KonvaY) * 0.5),
          width: 90,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'back-lap-wire-t1',
          type: 'vent',
          label: 'Slot Kabel Laptop Tier 1 (Bawah)',
          x: Math.round(width * 0.5),
          y: Math.round((height + s1KonvaY) * 0.5),
          width: 90,
          height: 28,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'rear-cover') {
      // Rear outer cover: 4 corner Thumb-Screw M3 + Main Power/LAN Exits + Top Charger Chimney Vents
      holes.push(
        {
          id: 'rear-dc-jack-12v',
          type: 'm3',
          label: 'Aux DC Jack 12V (Ø11mm)',
          x: Math.round(width * 0.5 + 92),
          y: Math.round(height - 32),
          diameter: 11,
        },
        {
          id: 'rear-main-exit',
          type: 'vent',
          label: 'Main AC & Triple LAN Exit',
          x: Math.round(width * 0.5),
          y: Math.round(height - 32),
          width: 130,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'rear-lower-intake-vent',
          type: 'vent',
          label: 'Charger Bay Intake Vent',
          x: Math.round(width * 0.72),
          y: Math.round(height - 32),
          width: 140,
          height: 20,
          cornerRadius: 8,
        },
        {
          id: 'rear-upper-vent',
          type: 'vent',
          label: 'Rear Chamber Heat Exhaust Vent',
          x: Math.round(width * 0.5),
          y: Math.round(height * 0.18),
          width: 260,
          height: 22,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'middle' || spec.id === 'middle-2') {
      const isShelf1 = spec.id === 'middle';
      const labelPrefix = isShelf1 ? 'Rak 1' : 'Rak 2';
      // 6x Underside Heavy-Duty L-Bracket M3 Holes (2 Left + 2 Right + 2 Rear!)
      holes.push(
        { id: `${spec.id}-l-left-f`, type: 'm3', label: `L-Bracket Kiri Depan (${labelPrefix})`, x: 14, y: height - 28, diameter: m3 },
        { id: `${spec.id}-l-left-b`, type: 'm3', label: `L-Bracket Kiri Belakang (${labelPrefix})`, x: 14, y: 28, diameter: m3 },
        { id: `${spec.id}-l-right-f`, type: 'm3', label: `L-Bracket Kanan Depan (${labelPrefix})`, x: width - 14, y: height - 28, diameter: m3 },
        { id: `${spec.id}-l-right-b`, type: 'm3', label: `L-Bracket Kanan Belakang (${labelPrefix})`, x: width - 14, y: 28, diameter: m3 },
        { id: `${spec.id}-rear-l1`, type: 'm3', label: `L-Bracket Belakang #1 (${labelPrefix})`, x: Math.round(width * 0.32), y: 14, diameter: m3 },
        { id: `${spec.id}-rear-l2`, type: 'm3', label: `L-Bracket Belakang #2 (${labelPrefix})`, x: Math.round(width * 0.68), y: 14, diameter: m3 },
        // 2x 120mm vertical chimney airflow cutouts
        {
          id: `${spec.id}-cooling-vent-1`,
          type: 'fan120',
          label: `${labelPrefix} Airflow Pass #1 (120mm)`,
          x: Math.round(width * 0.3),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: false,
        },
        {
          id: `${spec.id}-cooling-vent-2`,
          type: 'fan120',
          label: `${labelPrefix} Airflow Pass #2 (120mm)`,
          x: Math.round(width * 0.7),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: false,
        }
      );
    } else if (spec.id === 'bottom') {
      holes.push(
        // 4x E-Track Dust Filter Rail Through-Bolt M3 Holes (1:1 aligned with filter-rail!)
        { id: 'bot-rail-fl', type: 'm3', label: 'Filter Rail M3 FL', x: 9, y: height - 18, diameter: m3 },
        { id: 'bot-rail-fr', type: 'm3', label: 'Filter Rail M3 FR', x: width - 9, y: height - 18, diameter: m3 },
        { id: 'bot-rail-bl', type: 'm3', label: 'Filter Rail M3 BL', x: 9, y: 9, diameter: m3 },
        { id: 'bot-rail-br', type: 'm3', label: 'Filter Rail M3 BR', x: width - 9, y: 9, diameter: m3 },
        // Bottom Intake Fans (2x 120mm Fans)
        {
          id: 'bottom-fan120-1',
          type: 'fan120',
          label: 'Laptop Intake 120mm #1',
          x: Math.round(width * 0.3),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: true,
        },
        {
          id: 'bottom-fan120-2',
          type: 'fan120',
          label: 'Laptop Intake 120mm #2',
          x: Math.round(width * 0.7),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: true,
        }
      );
    } else if (spec.id === 'top') {
      const mainCenterY = Math.round(wiringDepth + W * 0.5);
      holes.push(
        // Center Magnetic Door Catch Latch M3 Mount (front center)
        { id: 'top-catch-m3', type: 'm3', label: 'Magnetic Catch Pintu Depan', x: Math.round(width * 0.5), y: height - 14, diameter: m3 },
        // 2x MC-38 Door Reed Switch Mounting Holes (18mm pitch for Left & Right doors!)
        { id: 'top-mc38-l1', type: 'm3', label: 'MC-38 Pintu Kiri #1 (M3)', x: Math.round(width * 0.5) - 52, y: height - 16, diameter: m3 },
        { id: 'top-mc38-l2', type: 'm3', label: 'MC-38 Pintu Kiri #2 (M3)', x: Math.round(width * 0.5) - 34, y: height - 16, diameter: m3 },
        { id: 'top-mc38-r1', type: 'm3', label: 'MC-38 Pintu Kanan #1 (M3)', x: Math.round(width * 0.5) + 34, y: height - 16, diameter: m3 },
        { id: 'top-mc38-r2', type: 'm3', label: 'MC-38 Pintu Kanan #2 (M3)', x: Math.round(width * 0.5) + 52, y: height - 16, diameter: m3 },
        // 1x MQ-2 Smoke Sensor 4-Corner M3 Standoff Mount Holes (10mm thermal air-gap standoffs!)
        { id: 'top-mq2-1', type: 'm3', label: 'Standoff MQ-2 TL (M3)', x: Math.round(width * 0.5) - 14, y: wiringDepth + 45 - 13, diameter: m3 },
        { id: 'top-mq2-2', type: 'm3', label: 'Standoff MQ-2 TR (M3)', x: Math.round(width * 0.5) + 14, y: wiringDepth + 45 - 13, diameter: m3 },
        { id: 'top-mq2-3', type: 'm3', label: 'Standoff MQ-2 BR (M3)', x: Math.round(width * 0.5) + 14, y: wiringDepth + 45 + 13, diameter: m3 },
        { id: 'top-mq2-4', type: 'm3', label: 'Standoff MQ-2 BL (M3)', x: Math.round(width * 0.5) - 14, y: wiringDepth + 45 + 13, diameter: m3 },
        // Top Exhaust Fans (2x 120mm Fans)
        {
          id: 'top-fan120-1',
          type: 'fan120',
          label: 'Laptop Exhaust 120mm #1',
          x: Math.round(width * 0.3),
          y: mainCenterY,
          diameter: 115,
          includeMountHoles: true,
        },
        {
          id: 'top-fan120-2',
          type: 'fan120',
          label: 'Laptop Exhaust 120mm #2',
          x: Math.round(width * 0.7),
          y: mainCenterY,
          diameter: 115,
          includeMountHoles: true,
        }
      );
    }

    panels[spec.id] = {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      enabled: spec.enabled,
      width,
      height,
      outline,
      holes,
    };
  }

  return panels;
}

const DEFAULT_CASE_DIMS: CaseDimensions = {
  length: 460, // 3-Tier Dedicated Laptop Rack (46 cm): 45 cm inner width fits 38 cm 15.6" laptops + 3.5 cm side cable clearance
  width: 330,  // 33 cm depth (32 cm inner depth)
  height: 440, // 44 cm height: ~14 cm headroom per laptop tier with active chimney cooling
  thickness: 5,
  shelf1Y: 140, // Shelf 1 (Tier 2) at Y = 140 mm
  shelf2Y: 280, // Shelf 2 (Tier 3) at Y = 280 mm
  legHeight: 38,
  wiringDepth: 62, // 62mm Rear Wiring Chamber for 3x Laptop Chargers + 12V IoT Adaptor + Mini PDU
  dividerX: 230,
  middleTrayY: 140,
};

export const IOT_PRESETS: Record<IoTBoxPreset, IoTBoxParams> = {
  'controller-pod': {
    // Opsi D (Roomy 1:1 Real-Scale 196×126×64mm): Fits ESP32 38-Pin Extender (78×63) + 4-Ch 5V Relay (73×50)
    // + Buck XL4015 (54×24) + Buzzer (32×13) + Level Shifter (16×13) + Wago + 40mm 5V Cross-Flow Fan + OLED 0.96"!
    length: 196,
    width: 64,
    height: 126,
    wallThickness: 3.0,
    cornerRadius: 9,
    hasOled: true,
    hasStandoffs: true,
    standoffSpacingX: 72,
    standoffSpacingZ: 56,
    hasSideVents: true,
    hasFan40: true,
    fanPlacement: 'side',
    fanSize: 40,
    throughAirflow: false,
    hasUsbCable: true,
    hasWallMount: true,
    hasLid: true,
    lidExploded: false,
    showVisualHardware: true,
  },
  'fan-shroud-120': {
    // Exact snug fit for standard 120x120x25mm fans (e.g., Deepcool XFAN 120 / Thermalright TL-C12C):
    // Inner cavity = 122.4 x 122.4 x 26.4mm (1.2mm side clearance + rubber pad room), clamped via 4x M4x40mm bolts!
    length: 128,
    width: 32,
    height: 128,
    wallThickness: 2.8,
    cornerRadius: 8,
    hasOled: false,
    hasStandoffs: false,
    standoffSpacingX: 90,
    standoffSpacingZ: 90,
    hasSideVents: false,
    hasFan40: true,
    fanPlacement: 'front',
    fanSize: 120,
    throughAirflow: true,
    hasUsbCable: true,
    hasWallMount: false,
    hasLid: true,
    lidExploded: false,
    showVisualHardware: true,
  },
  'fan-shroud-140': {
    // Exact snug fit for standard 140x140x25mm fans (e.g., Thermalright TL-C14C):
    // Inner cavity = 142.4 x 142.4 x 26.4mm (1.2mm side clearance + rubber pad room), clamped via 4x M4x40mm bolts!
    length: 148,
    width: 32,
    height: 148,
    wallThickness: 2.8,
    cornerRadius: 9,
    hasOled: false,
    hasStandoffs: false,
    standoffSpacingX: 105,
    standoffSpacingZ: 105,
    hasSideVents: false,
    hasFan40: true,
    fanPlacement: 'front',
    fanSize: 140,
    throughAirflow: true,
    hasUsbCable: true,
    hasWallMount: false,
    hasLid: true,
    lidExploded: false,
    showVisualHardware: true,
  },
};

const DEFAULT_BRACKET_PARAMS: BracketParams = {
  type: 'l-bracket',
  armLength: 28,
  thickness: 6,
  armWidth: 16,
  acrylicGap: 5.2, // 5mm Cast Acrylic + 0.2mm snug 3D-print slide tolerance
  brickWidth: 48, // Standard 45W-65W Laptop Charger & 12V 5A Adaptor width
  brickDepth: 32, // Standard charger brick thickness
  screwDiameter: 3.4,
  holeOffset: 16,
  showPreviewBolts: true,
};

const DEFAULT_IOT_SIM: IoTSimState = {
  tempTier1: 34,
  tempTier2: 36,
  tempTier3: 38,
  humidity: 52,
  smokePpm: 115,
  autoMode: true,
  relayFansTier1: true,
  relayFansTier2: true,
  relayFansTier3: true,
  relayIotFan: true,
  wireFilter: 'all',
  selectedNodeId: 'esp32',
  tempPc: 34,
  tempLapBot: 34,
  tempLapTop: 38,
  relayPcFans: true,
  relayLapBotFans: true,
  relayLapTopFans: true,
};

interface CadStoreState {
  activeModule: ActiveModule;
  acrylicViewMode: AcrylicViewMode;
  iotVizViewMode: AcrylicViewMode;

  // Module 1: Dual-Bay Acrylic Case Builder
  caseDims: CaseDimensions;
  panels: Record<PanelId, AcrylicPanel>;
  activePanelId: PanelId;
  selectedHoleId: string | null;
  gridSize: number;
  snapToGrid: boolean;
  explodeAmount: number;
  explodeMode: 'frame' | 'all'; // 'frame' = acrylic panels only, 'all' = panels + all hardware & IoT devices!
  dustFilterSlide: number; // 0 = seated under bottom, >0 = slid forward out of slot
  doorLeftAngle: number; // degrees (0 = closed, 130 = wide open outward)
  doorRightAngle: number; // degrees (0 = closed, 130 = wide open outward)
  ledEnabled: boolean;
  ledColor: string;
  showBrackets: boolean;
  showHardwareMockup: boolean;
  showWiring: boolean;
  cableFilter: CableFilterCategory;

  // Module 2: Parametric IoT Box & 3D-Printed Hardware Builder
  printPartCategory: PrintPartCategory;
  iotBox: IoTBoxParams;
  bracketParams: BracketParams;

  // Module 3: Live IoT Electronics & Wiring Visualizer
  iotSim: IoTSimState;

  // Actions
  setActiveModule: (module: ActiveModule) => void;
  setAcrylicViewMode: (mode: AcrylicViewMode) => void;
  setIotVizViewMode: (mode: AcrylicViewMode) => void;
  setActivePanelId: (id: PanelId) => void;
  setSelectedHoleId: (id: string | null) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setExplodeAmount: (amount: number) => void;
  setExplodeMode: (mode: 'frame' | 'all') => void;
  setDustFilterSlide: (slide: number) => void;
  setDoorLeftAngle: (deg: number) => void;
  setDoorRightAngle: (deg: number) => void;
  toggleAllDoors: () => void;
  toggleDemoMaintenance: () => void;
  setLedEnabled: (enabled: boolean) => void;
  setLedColor: (color: string) => void;
  setShowBrackets: (show: boolean) => void;
  setShowHardwareMockup: (show: boolean) => void;
  setShowWiring: (show: boolean) => void;
  setCableFilter: (filter: CableFilterCategory) => void;

  updateCaseDims: (patch: Partial<CaseDimensions>) => void;
  togglePanelEnabled: (id: PanelId) => void;
  addHoleToActivePanel: (type: HoleType) => void;
  updateHole: (panelId: PanelId, holeId: string, patch: Partial<PanelHole>) => void;
  deleteHole: (panelId: PanelId, holeId: string) => void;
  autoPlaceCornerM3: (panelId: PanelId, margin?: number) => void;
  clearPanelHoles: (panelId: PanelId) => void;
  resetAcrylicCase: () => void;

  setPrintPartCategory: (cat: PrintPartCategory) => void;
  updateIoTBox: (patch: Partial<IoTBoxParams>) => void;
  applyIoTPreset: (preset: IoTBoxPreset) => void;
  resetIoTBox: () => void;
  selectBracketType: (type: BracketType) => void;
  updateBracketParams: (patch: Partial<BracketParams>) => void;
  resetBracketParams: () => void;

  updateIoTSim: (patch: Partial<IoTSimState>) => void;
  toggleSmokeTest: () => void;
  resetIoTSim: () => void;

  exportProjectJson: () => string;
  importProjectJson: (raw: string) => boolean;
}

export const useCadStore = create<CadStoreState>()(
  persist(
    (set, get) => ({
  activeModule: 'acrylic',
  acrylicViewMode: 'split',
  iotVizViewMode: 'split',

  caseDims: DEFAULT_CASE_DIMS,
  panels: createInitialPanels(DEFAULT_CASE_DIMS),
  activePanelId: 'left',
  selectedHoleId: null,
  gridSize: 10,
  snapToGrid: true,
  explodeAmount: 0,
  explodeMode: 'frame',
  dustFilterSlide: 0,
  doorLeftAngle: 0,
  doorRightAngle: 0,
  ledEnabled: true,
  ledColor: '#A0E6FF',
  showBrackets: true,
  showHardwareMockup: true,
  showWiring: true,
  cableFilter: 'all',

  printPartCategory: 'enclosure',
  iotBox: IOT_PRESETS['controller-pod'],
  bracketParams: DEFAULT_BRACKET_PARAMS,
  iotSim: DEFAULT_IOT_SIM,

  setActiveModule: (activeModule) => set({ activeModule }),
  setAcrylicViewMode: (acrylicViewMode) => set({ acrylicViewMode }),
  setIotVizViewMode: (iotVizViewMode) => set({ iotVizViewMode }),
  setActivePanelId: (activePanelId) => set({ activePanelId, selectedHoleId: null }),
  setSelectedHoleId: (selectedHoleId) => set({ selectedHoleId }),
  setGridSize: (gridSize) => set({ gridSize }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setExplodeAmount: (explodeAmount) => set({ explodeAmount }),
  setExplodeMode: (explodeMode) =>
    set((state) => ({
      explodeMode,
      explodeAmount: state.explodeAmount === 0 ? 85 : state.explodeAmount,
    })),
  setDustFilterSlide: (dustFilterSlide) => set({ dustFilterSlide }),
  setDoorLeftAngle: (doorLeftAngle) => set({ doorLeftAngle }),
  setDoorRightAngle: (doorRightAngle) => set({ doorRightAngle }),
  toggleAllDoors: () =>
    set((state) => {
      const anyOpen = state.doorLeftAngle > 10 || state.doorRightAngle > 10;
      return {
        doorLeftAngle: anyOpen ? 0 : 118,
        doorRightAngle: anyOpen ? 0 : 118,
      };
    }),
  toggleDemoMaintenance: () =>
    set((state) => {
      const isOpen =
        state.doorLeftAngle > 10 || state.doorRightAngle > 10 || state.dustFilterSlide > 10;
      return {
        doorLeftAngle: isOpen ? 0 : 122,
        doorRightAngle: isOpen ? 0 : 122,
        dustFilterSlide: isOpen ? 0 : 125,
      };
    }),
  setLedEnabled: (ledEnabled) => set({ ledEnabled }),
  setLedColor: (ledColor) => set({ ledColor }),
  setShowBrackets: (showBrackets) => set({ showBrackets }),
  setShowHardwareMockup: (showHardwareMockup) => set({ showHardwareMockup }),
  setShowWiring: (showWiring) => set({ showWiring }),
  setCableFilter: (cableFilter) => set({ cableFilter }),

  updateCaseDims: (patch) =>
    set((state) => {
      const nextDims: CaseDimensions = {
        ...state.caseDims,
        ...patch,
      };
      nextDims.length = Math.max(380, Math.min(800, nextDims.length));
      nextDims.width = Math.max(280, Math.min(600, nextDims.width));
      nextDims.height = Math.max(360, Math.min(700, nextDims.height));
      nextDims.shelf1Y = Math.max(60, Math.min(nextDims.shelf2Y - 50, nextDims.shelf1Y));
      nextDims.shelf2Y = Math.max(nextDims.shelf1Y + 50, Math.min(nextDims.height - 60, nextDims.shelf2Y));
      nextDims.legHeight = Math.min(Math.max(0, nextDims.legHeight), 80);
      nextDims.wiringDepth = Math.min(Math.max(24, nextDims.wiringDepth), 90);
      if (nextDims.dividerX === undefined) nextDims.dividerX = Math.round(nextDims.length / 2);
      if (nextDims.middleTrayY === undefined) nextDims.middleTrayY = nextDims.shelf1Y;

      const nextPanels = { ...state.panels };
      (Object.keys(nextPanels) as PanelId[]).forEach((pid) => {
        const oldPanel = nextPanels[pid];
        const { width, height, outline } = getPanelGeometrySpec(pid, nextDims);
        const clampedHoles = oldPanel.holes.map((h) => ({
          ...h,
          x: Math.min(Math.max(4, h.x), width - 4),
          y: Math.min(Math.max(4, h.y), height - 4),
        }));
        nextPanels[pid] = {
          ...oldPanel,
          width,
          height,
          outline,
          holes: clampedHoles,
        };
      });

      return { caseDims: nextDims, panels: nextPanels };
    }),

  togglePanelEnabled: (id) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: {
          ...state.panels[id],
          enabled: !state.panels[id].enabled,
        },
      },
    })),

  addHoleToActivePanel: (type) =>
    set((state) => {
      const panel = state.panels[state.activePanelId];
      const cx = Math.round(panel.width / 2);
      const cy = Math.round(panel.height / 2);
      const uid = `${panel.id}-${type}-${Date.now().toString(36)}`;

      let newHole: PanelHole;
      if (type === 'm3') {
        newHole = {
          id: uid,
          type: 'm3',
          label: `M3 Screw #${panel.holes.filter((h) => h.type === 'm3').length + 1}`,
          x: cx,
          y: cy,
          diameter: 3.2,
        };
      } else if (type === 'fan120') {
        newHole = {
          id: uid,
          type: 'fan120',
          label: `Fan 120mm #${panel.holes.filter((h) => h.type === 'fan120').length + 1}`,
          x: cx,
          y: cy,
          diameter: 115,
          includeMountHoles: true,
        };
      } else if (type === 'fan140') {
        newHole = {
          id: uid,
          type: 'fan140',
          label: `Fan 140mm #${panel.holes.filter((h) => h.type === 'fan140').length + 1}`,
          x: cx,
          y: cy,
          diameter: 135,
          includeMountHoles: true,
        };
      } else {
        newHole = {
          id: uid,
          type: 'vent',
          label: `Vent / Cable #${panel.holes.filter((h) => h.type === 'vent').length + 1}`,
          x: cx,
          y: cy,
          width: 60,
          height: 24,
          cornerRadius: 4,
        };
      }

      return {
        panels: {
          ...state.panels,
          [panel.id]: {
            ...panel,
            holes: [...panel.holes, newHole],
          },
        },
        selectedHoleId: newHole.id,
      };
    }),

  updateHole: (panelId, holeId, patch) =>
    set((state) => {
      const panel = state.panels[panelId];
      return {
        panels: {
          ...state.panels,
          [panelId]: {
            ...panel,
            holes: panel.holes.map((h) => (h.id === holeId ? { ...h, ...patch } : h)),
          },
        },
      };
    }),

  deleteHole: (panelId, holeId) =>
    set((state) => {
      const panel = state.panels[panelId];
      return {
        panels: {
          ...state.panels,
          [panelId]: {
            ...panel,
            holes: panel.holes.filter((h) => h.id !== holeId),
          },
        },
        selectedHoleId: state.selectedHoleId === holeId ? null : state.selectedHoleId,
      };
    }),

  autoPlaceCornerM3: (panelId, margin = 14) =>
    set((state) => {
      const panel = state.panels[panelId];
      const existingNonAuto = panel.holes.filter((h) => !h.id.startsWith(`${panelId}-m3-`));
      const bottomMargin =
        panelId === 'left' || panelId === 'right' ? state.caseDims.legHeight + margin : margin;
      const cornerHoles = makeCornerM3Holes(
        panelId,
        panel.width,
        panel.height,
        margin,
        bottomMargin
      );
      return {
        panels: {
          ...state.panels,
          [panelId]: {
            ...panel,
            holes: [...cornerHoles, ...existingNonAuto],
          },
        },
      };
    }),

  clearPanelHoles: (panelId) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [panelId]: {
          ...state.panels[panelId],
          holes: [],
        },
      },
      selectedHoleId: null,
    })),

  resetAcrylicCase: () =>
    set({
      caseDims: DEFAULT_CASE_DIMS,
      panels: createInitialPanels(DEFAULT_CASE_DIMS),
      selectedHoleId: null,
      explodeAmount: 0,
      dustFilterSlide: 0,
      doorLeftAngle: 0,
      doorRightAngle: 0,
    }),

  setPrintPartCategory: (printPartCategory) => set({ printPartCategory }),

  updateIoTBox: (patch) =>
    set((state) => ({
      iotBox: {
        ...state.iotBox,
        ...patch,
      },
    })),

  applyIoTPreset: (preset) =>
    set({
      printPartCategory: 'enclosure',
      iotBox: { ...IOT_PRESETS[preset] },
    }),

  resetIoTBox: () => set({ iotBox: { ...IOT_PRESETS['controller-pod'] } }),

  selectBracketType: (type) =>
    set((state) => ({
      printPartCategory: 'bracket',
      bracketParams: {
        ...state.bracketParams,
        type,
      },
    })),

  updateBracketParams: (patch) =>
    set((state) => ({
      bracketParams: {
        ...state.bracketParams,
        ...patch,
      },
    })),

  resetBracketParams: () => set({ bracketParams: { ...DEFAULT_BRACKET_PARAMS } }),

  updateIoTSim: (patch) =>
    set((state) => ({
      iotSim: {
        ...state.iotSim,
        ...patch,
      },
    })),

  toggleSmokeTest: () =>
    set((state) => ({
      iotSim: {
        ...state.iotSim,
        smokePpm: state.iotSim.smokePpm >= 450 ? 115 : 680,
      },
    })),

  resetIoTSim: () => set({ iotSim: { ...DEFAULT_IOT_SIM } }),

  exportProjectJson: () => {
    const s = get();
    return JSON.stringify(
      {
        schema: 'vertex-cad-v2',
        exportedAt: new Date().toISOString(),
        caseDims: s.caseDims,
        panels: s.panels,
        iotBox: s.iotBox,
        bracketParams: s.bracketParams,
        iotSim: s.iotSim,
        ledEnabled: s.ledEnabled,
        ledColor: s.ledColor,
      },
      null,
      2
    );
  },

  importProjectJson: (raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.caseDims || !parsed.panels) {
        return false;
      }
      set((state) => ({
        caseDims: { ...DEFAULT_CASE_DIMS, ...parsed.caseDims },
        panels: { ...state.panels, ...parsed.panels },
        iotBox: parsed.iotBox ? { ...IOT_PRESETS['controller-pod'], ...parsed.iotBox } : state.iotBox,
        bracketParams: parsed.bracketParams
          ? { ...DEFAULT_BRACKET_PARAMS, ...parsed.bracketParams }
          : state.bracketParams,
        iotSim: parsed.iotSim ? { ...DEFAULT_IOT_SIM, ...parsed.iotSim } : state.iotSim,
        ledEnabled: typeof parsed.ledEnabled === 'boolean' ? parsed.ledEnabled : state.ledEnabled,
        ledColor: typeof parsed.ledColor === 'string' ? parsed.ledColor : state.ledColor,
        selectedHoleId: null,
      }));
      return true;
    } catch {
      return false;
    }
  },
}),
    {
      name: 'vertex-cad-project-v8',
      version: 8,
      partialize: (state) => ({
        caseDims: state.caseDims,
        panels: state.panels,
        iotBox: state.iotBox,
        bracketParams: state.bracketParams,
        iotSim: state.iotSim,
        ledEnabled: state.ledEnabled,
        ledColor: state.ledColor,
        showBrackets: state.showBrackets,
        showHardwareMockup: state.showHardwareMockup,
        showWiring: state.showWiring,
        cableFilter: state.cableFilter,
      }),
    }
  )
);
