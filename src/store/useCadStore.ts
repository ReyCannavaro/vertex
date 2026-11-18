import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AcrylicPanel,
  AcrylicViewMode,
  ActiveModule,
  BracketParams,
  BracketType,
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
 * Generates an anti-sag chamfered center support foot runner mounted directly under
 * the center spine of filter-rail / divider (Y = 0 to legH - t) to prevent sagging on 70cm spans.
 */
function makeCenterFootOutline(depthW: number, footH: number): Point2D[] {
  const h = Math.max(8, footH);
  const footW = Math.min(58, Math.max(34, Math.round(depthW * 0.16)));
  const chamfer = Math.min(22, Math.round(h * 0.72));
  const topBeam = Math.max(8, Math.round(h * 0.34));

  return [
    { x: 0, y: 0 },
    { x: depthW, y: 0 },
    { x: depthW, y: h },
    { x: depthW - footW, y: h },
    { x: depthW - footW - chamfer, y: topBeam },
    { x: footW + chamfer, y: topBeam },
    { x: footW, y: h },
    { x: 0, y: h },
  ];
}

/**
 * Generates a Dual-Bay E-Shaped slide-in dust filter track mounted underneath the Bottom panel.
 * Features a center spine aligned with Divider & Center Foot, creating 2 independent front pull-out slots:
 * Left Slot (PC Bay Filter) and Right Slot (Laptop Bay Filter).
 */
function makeDualBayFilterRailOutline(
  w: number,
  h: number,
  splitX: number,
  railW = 18
): Point2D[] {
  const rw = Math.min(railW, Math.floor(w / 8), Math.floor(h / 6));
  const cHalf = 10; // 20mm center divider rail directly above Center Foot
  const sx = Math.min(Math.max(rw + cHalf + 20, splitX), w - rw - cHalf - 20);

  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: w - rw, y: h },
    { x: w - rw, y: rw },
    { x: sx + cHalf, y: rw },
    { x: sx + cHalf, y: h },
    { x: sx - cHalf, y: h },
    { x: sx - cHalf, y: rw },
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
  const { length: L, width: W, height: H, thickness: t, dividerX, legHeight, wiringDepth } = dims;
  const totalW = W + wiringDepth;
  const innerL = Math.max(80, L - t * 2);
  const innerW = Math.max(60, W - t * 2);
  const wallH = Math.max(80, H - t); // vertical walls span from y=legHeight to y=legHeight+H-t
  const dividerH = Math.max(60, H - t * 2);
  const rightBayInnerL = Math.max(80, L - dividerX - t * 1.5);
  const combDepth = Math.max(18, wiringDepth - t - 4);

  switch (id) {
    case 'top':
      return { width: L, height: totalW, outline: makeRectOutline(L, totalW) };
    case 'bottom':
      return { width: innerL, height: innerW, outline: makeRectOutline(innerL, innerW) };
    case 'filter-rail': {
      const splitX = Math.round(dividerX - t);
      return {
        width: innerL,
        height: innerW,
        outline: makeDualBayFilterRailOutline(innerL, innerW, splitX, 18),
      };
    }
    case 'center-foot': {
      const footH = Math.max(8, legHeight - t);
      return {
        width: innerW,
        height: footH,
        outline: makeCenterFootOutline(innerW, footH),
      };
    }
    case 'front-left': {
      const doorW = Math.max(60, Math.round(dividerX - t - 1));
      const doorH = Math.max(80, wallH - 2);
      return { width: doorW, height: doorH, outline: makeRectOutline(doorW, doorH) };
    }
    case 'front-right': {
      const doorW = Math.max(80, Math.round(L - dividerX - t - 1));
      const doorH = Math.max(80, wallH - 2);
      return { width: doorW, height: doorH, outline: makeRectOutline(doorW, doorH) };
    }
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
    case 'divider':
      return { width: innerW, height: dividerH, outline: makeRectOutline(innerW, dividerH) };
    case 'middle':
      return {
        width: Math.round(rightBayInnerL),
        height: innerW,
        outline: makeRectOutline(Math.round(rightBayInnerL), innerW),
      };
    case 'cable-comb':
      return {
        width: innerL,
        height: combDepth,
        outline: makeCableCombOutline(innerL, combDepth),
      };
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
      name: 'Bottom (Lantai Dasar)',
      description: '1× Fan 140mm PC + 2× Fan 120mm Laptop',
      enabled: true,
    },
    {
      id: 'filter-rail',
      name: 'Dust Filter Rail (Dual-Bay E-Track)',
      description: 'Rel akrilik 2-slot terpisah untuk Filter Bay PC & Bay Laptop',
      enabled: true,
    },
    {
      id: 'center-foot',
      name: 'Center Foot (Kaki Penyangga Tengah)',
      description: 'Kaki akrilik anti-melengkung di bawah Sekat Tengah (70cm span)',
      enabled: true,
    },
    {
      id: 'top',
      name: 'Top (Atap Akrilik)',
      description: '1× Exhaust 140mm PC + 2× Exhaust 120mm Laptop',
      enabled: true,
    },
    {
      id: 'divider',
      name: 'Divider (Sekat Tengah)',
      description: 'Pemisah Bay PC (Kiri) & Bay Laptop (Kanan)',
      enabled: true,
    },
    {
      id: 'middle',
      name: 'Middle Shelf (Rak Laptop)',
      description: 'Rak Tengah Bay Kanan + 2× Airflow 120mm',
      enabled: true,
    },
    {
      id: 'left',
      name: 'Left Wall + Kaki Akrilik',
      description: 'Dinding Kiri dengan kaki chamfer menyatu + ruang wiring',
      enabled: true,
    },
    {
      id: 'right',
      name: 'Right Wall + Kaki (IoT Box)',
      description: 'Dinding Kanan + kaki chamfer + mounting 1 unit IoT Box',
      enabled: true,
    },
    {
      id: 'back',
      name: 'Back Partition (Slot Kabel)',
      description: 'Sekat belakang dengan grommet jalur kabel ke ruang wiring',
      enabled: true,
    },
    {
      id: 'cable-comb',
      name: 'Cable Comb (Sisir Kabel)',
      description: 'Sisir akrilik 10-slot di ruang belakang untuk rapikan kabel',
      enabled: true,
    },
    {
      id: 'rear-cover',
      name: 'Rear Wiring Cover (Tutup Belakang)',
      description: 'Penutup ruang kabel belakang + jalur keluar AC & LAN',
      enabled: true,
    },
    {
      id: 'front-left',
      name: 'Front Door PC (Engsel Kiri)',
      description: 'Pintu kaca berengsel khusus Bay PC + handle magnet',
      enabled: true,
    },
    {
      id: 'front-right',
      name: 'Front Door Laptop (Engsel Kanan)',
      description: 'Pintu kaca berengsel khusus Bay Laptop + handle magnet',
      enabled: true,
    },
  ];

  const panels = {} as Record<PanelId, AcrylicPanel>;
  const { length: L, width: W, height: H, thickness: t, dividerX, middleTrayY, legHeight, wiringDepth } = dims;
  const m3 = 3.2; // Standard M3 bolt clearance diameter (mm)

  for (const spec of specs) {
    const { width, height, outline } = getPanelGeometrySpec(spec.id, dims);
    let holes: PanelHole[] = [];

    if (spec.id === 'filter-rail') {
      const splitX = Math.round(dividerX - t);
      // 6x M3 mounting holes aligned 1:1 with Bottom panel through-holes
      holes = [
        { id: 'fr-m3-1', type: 'm3', label: 'Rail M3 Depan-Kiri', x: 9, y: height - 18, diameter: m3 },
        { id: 'fr-m3-2', type: 'm3', label: 'Rail M3 Depan-Kanan', x: width - 9, y: height - 18, diameter: m3 },
        { id: 'fr-m3-3', type: 'm3', label: 'Rail M3 Belakang-Kiri', x: 9, y: 9, diameter: m3 },
        { id: 'fr-m3-4', type: 'm3', label: 'Rail M3 Belakang-Kanan', x: width - 9, y: 9, diameter: m3 },
        { id: 'fr-m3-c1', type: 'm3', label: 'Rail Tengah Depan', x: splitX, y: height - 18, diameter: m3 },
        { id: 'fr-m3-c2', type: 'm3', label: 'Rail Tengah Belakang', x: splitX, y: 9, diameter: m3 },
      ];
    } else if (spec.id === 'center-foot') {
      // M3 L-Bracket mounting holes on front & rear solid feet of center anti-sag runner
      holes = [
        { id: 'cf-m3-f1', type: 'm3', label: 'Kaki Tengah Depan #1', x: 18, y: Math.min(10, Math.round(height * 0.3)), diameter: m3 },
        { id: 'cf-m3-f2', type: 'm3', label: 'Kaki Tengah Depan #2', x: 34, y: Math.min(10, Math.round(height * 0.3)), diameter: m3 },
        { id: 'cf-m3-b1', type: 'm3', label: 'Kaki Tengah Belakang #1', x: width - 34, y: Math.min(10, Math.round(height * 0.3)), diameter: m3 },
        { id: 'cf-m3-b2', type: 'm3', label: 'Kaki Tengah Belakang #2', x: width - 18, y: Math.min(10, Math.round(height * 0.3)), diameter: m3 },
      ];
    } else if (spec.id === 'cable-comb') {
      holes = [
        { id: 'cc-m3-l', type: 'm3', label: 'Comb L-Bracket Kiri', x: 14, y: height - 8, diameter: m3 },
        { id: 'cc-m3-m', type: 'm3', label: 'Comb L-Bracket Tengah', x: Math.round(width / 2), y: height - 8, diameter: m3 },
        { id: 'cc-m3-r', type: 'm3', label: 'Comb L-Bracket Kanan', x: width - 14, y: height - 8, diameter: m3 },
      ];
    } else if (spec.id === 'front-left' || spec.id === 'front-right') {
      // Exact M3 screw holes for 2x Butterfly Hinges + Pull Handle + Magnetic Catch + MC-38 Door Magnet
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
        // Magnetic Catch Strike Plate + MC-38 Magnet Block (2x M3 near top edge)
        { id: `${spec.id}-mag1`, type: 'm3', label: 'Pelat Magnet Catch (M3)', x: handleX, y: 26, diameter: m3 },
        { id: `${spec.id}-mc38`, type: 'm3', label: 'Magnet Sensor MC-38 (M3)', x: isLeft ? width - 30 : 30, y: 12, diameter: m3 },
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
      holes.push(
        // Stationary Butterfly Hinge Mounts for Front Left PC Door (4x M3)
        { id: 'left-hinge-t1', type: 'm3', label: 'Engsel Pintu PC Atas #1', x: frontHingeX, y: topHingeY - 11, diameter: m3 },
        { id: 'left-hinge-t2', type: 'm3', label: 'Engsel Pintu PC Atas #2', x: frontHingeX, y: topHingeY + 11, diameter: m3 },
        { id: 'left-hinge-b1', type: 'm3', label: 'Engsel Pintu PC Bawah #1', x: frontHingeX, y: botHingeY - 11, diameter: m3 },
        { id: 'left-hinge-b2', type: 'm3', label: 'Engsel Pintu PC Bawah #2', x: frontHingeX, y: botHingeY + 11, diameter: m3 },
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
      const shelfY = Math.round(mainH - middleTrayY);
      holes.push(
        // Stationary Butterfly Hinge Mounts for Front Right Laptop Door (4x M3)
        { id: 'right-hinge-t1', type: 'm3', label: 'Engsel Pintu Laptop Atas #1', x: 15, y: topHingeY - 11, diameter: m3 },
        { id: 'right-hinge-t2', type: 'm3', label: 'Engsel Pintu Laptop Atas #2', x: 15, y: topHingeY + 11, diameter: m3 },
        { id: 'right-hinge-b1', type: 'm3', label: 'Engsel Pintu Laptop Bawah #1', x: 15, y: botHingeY - 11, diameter: m3 },
        { id: 'right-hinge-b2', type: 'm3', label: 'Engsel Pintu Laptop Bawah #2', x: 15, y: botHingeY + 11, diameter: m3 },
        // Middle Laptop Shelf Underside L-Bracket Mounts (2x M3 matching middle shelf!)
        { id: 'right-shelf-f', type: 'm3', label: 'L-Bracket Bawah Rak Depan', x: 28, y: shelfY + 14, diameter: m3 },
        { id: 'right-shelf-b', type: 'm3', label: 'L-Bracket Bawah Rak Belakang', x: W - 28, y: shelfY + 14, diameter: m3 },
        // Back Partition L-Bracket Mounts (2x M3)
        { id: 'right-back-m3-t', type: 'm3', label: 'Braket Back Partition Atas', x: W - 14, y: 36, diameter: m3 },
        { id: 'right-back-m3-b', type: 'm3', label: 'Braket Back Partition Bawah', x: W - 14, y: mainH - 36, diameter: m3 },
        // Cable Comb Side Mount (1x M3)
        { id: 'right-comb-m3', type: 'm3', label: 'Mount Cable Comb', x: Math.round(W + wiringDepth * 0.5), y: Math.round(mainH * 0.48), diameter: m3 },
        // Single unified IoT Box mounting pattern (cable pass-through + 4x M3 matching IoT Box captive hex nuts!)
        {
          id: 'right-iot-cable',
          type: 'vent',
          label: 'IoT Box Cable Pass-Through',
          x: mainCenterX,
          y: mountY,
          width: 30,
          height: 20,
          cornerRadius: 6,
        },
        { id: 'right-iot-m3-1', type: 'm3', label: 'IoT Box Mount TL (M3)', x: mainCenterX - 38, y: mountY - 22, diameter: m3 },
        { id: 'right-iot-m3-2', type: 'm3', label: 'IoT Box Mount TR (M3)', x: mainCenterX + 38, y: mountY - 22, diameter: m3 },
        { id: 'right-iot-m3-3', type: 'm3', label: 'IoT Box Mount BR (M3)', x: mainCenterX + 38, y: mountY + 22, diameter: m3 },
        { id: 'right-iot-m3-4', type: 'm3', label: 'IoT Box Mount BL (M3)', x: mainCenterX - 38, y: mountY + 22, diameter: m3 }
      );
    } else if (spec.id === 'divider') {
      const shelfY = Math.round(height - middleTrayY + t);
      holes.push(
        // Underside L-Bracket Mounts supporting Middle Laptop Shelf (2x M3 matching middle shelf!)
        { id: 'div-shelf-f', type: 'm3', label: 'L-Bracket Bawah Rak Depan', x: width - 28, y: shelfY + 14, diameter: m3 },
        { id: 'div-shelf-b', type: 'm3', label: 'L-Bracket Bawah Rak Belakang', x: 28, y: shelfY + 14, diameter: m3 },
        // Magnetic Door Catch Mounts near top-front edge (2x M3)
        { id: 'div-catch-1', type: 'm3', label: 'Magnetic Catch Atas', x: width - 14, y: 22, diameter: m3 },
        { id: 'div-catch-2', type: 'm3', label: 'Magnetic Catch Bawah', x: width - 14, y: 36, diameter: m3 },
        // Inter-bay cable routing slots
        {
          id: 'divider-cable-upper',
          type: 'vent',
          label: 'Kabel Laptop Atas -> PC',
          x: Math.round(width * 0.78),
          y: Math.round(height * 0.32),
          width: 36,
          height: 55,
          cornerRadius: 8,
        },
        {
          id: 'divider-cable-lower',
          type: 'vent',
          label: 'Kabel Power PSU -> Laptop',
          x: Math.round(width * 0.78),
          y: Math.round(height * 0.74),
          width: 36,
          height: 55,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'back') {
      // Back wall is rotated 180° around Y: Konva left (small X) = Laptop Bay, Konva right (large X) = PC Bay
      const pcX = Math.round(width - (dividerX - t) * 0.52);
      const lapSpan = L - dividerX - t;
      const lapLeftX = Math.round(lapSpan * 0.32);
      const lapRightX = Math.round(lapSpan * 0.72);
      const shelfY = Math.round(height - middleTrayY);
      const combY = Math.round(height * 0.48);

      holes.push(
        // 4x Micro-ATX Motherboard Brass Standoff Mounting Holes (standard 203x215mm span on PC Bay!)
        { id: 'back-matx-1', type: 'm3', label: 'Standoff mATX TL', x: pcX - 95, y: 65, diameter: m3 },
        { id: 'back-matx-2', type: 'm3', label: 'Standoff mATX TR', x: pcX + 95, y: 65, diameter: m3 },
        { id: 'back-matx-3', type: 'm3', label: 'Standoff mATX BR', x: pcX + 95, y: 255, diameter: m3 },
        { id: 'back-matx-4', type: 'm3', label: 'Standoff mATX BL', x: pcX - 95, y: 255, diameter: m3 },
        // 2x Rear Anti-Sag L-Bracket Holes supporting Middle Laptop Shelf
        { id: 'back-shelf-l1', type: 'm3', label: 'L-Bracket Rak Laptop #1', x: lapLeftX, y: shelfY + 12, diameter: m3 },
        { id: 'back-shelf-l2', type: 'm3', label: 'L-Bracket Rak Laptop #2', x: lapRightX, y: shelfY + 12, diameter: m3 },
        // 3x Cable Comb Rear L-Bracket Mounts
        { id: 'back-comb-1', type: 'm3', label: 'Mount Cable Comb #1', x: 24, y: combY, diameter: m3 },
        { id: 'back-comb-2', type: 'm3', label: 'Mount Cable Comb #2', x: Math.round(width / 2), y: combY, diameter: m3 },
        { id: 'back-comb-3', type: 'm3', label: 'Mount Cable Comb #3', x: width - 24, y: combY, diameter: m3 },
        // 3x DHT22 Sensor Mounting Screw Holes (PC Bay, Laptop Top, Laptop Bottom)
        { id: 'back-dht-pc', type: 'm3', label: 'Mount DHT22 PC', x: width - 34, y: 42, diameter: m3 },
        { id: 'back-dht-lt', type: 'm3', label: 'Mount DHT22 Lap Atas', x: Math.round(lapSpan - 34), y: 42, diameter: m3 },
        { id: 'back-dht-lb', type: 'm3', label: 'Mount DHT22 Lap Bawah', x: Math.round(lapSpan - 34), y: shelfY + 38, diameter: m3 },
        // Cable Grommet Cutouts into Rear Wiring Chamber
        {
          id: 'back-pc-io',
          type: 'vent',
          label: 'PC Motherboard & 24-Pin Grommet',
          x: pcX,
          y: Math.round(height * 0.32),
          width: 48,
          height: 130,
          cornerRadius: 8,
        },
        {
          id: 'back-psu-wire',
          type: 'vent',
          label: 'ATX PSU Cable Grommet',
          x: pcX,
          y: Math.round(height * 0.78),
          width: 110,
          height: 64,
          cornerRadius: 8,
        },
        {
          id: 'back-lap-wire-top',
          type: 'vent',
          label: 'Slot Kabel Laptop Atas',
          x: lapLeftX,
          y: Math.round(height * 0.36),
          width: 90,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'back-lap-wire-bot',
          type: 'vent',
          label: 'Slot Kabel Laptop Bawah',
          x: lapLeftX,
          y: Math.round(height * 0.76),
          width: 90,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'back-iot-wire-slot',
          type: 'vent',
          label: 'Slot Kabel Fan & IoT Box',
          x: lapRightX,
          y: Math.round(height * 0.54),
          width: 44,
          height: 74,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'rear-cover') {
      // Rear outer cover: 4 corner Thumb-Screw M3 + Single Main Power/LAN Exit + Top & Bottom Charger Chimney Vents
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
          label: '1-Cable Main AC & LAN Exit',
          x: Math.round(width * 0.5),
          y: Math.round(height - 32),
          width: 120,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'rear-lower-intake-vent',
          type: 'vent',
          label: 'Charger Bay Intake Vent',
          x: Math.round(width * 0.72),
          y: Math.round(height - 32),
          width: 180,
          height: 20,
          cornerRadius: 8,
        },
        {
          id: 'rear-upper-vent',
          type: 'vent',
          label: 'Rear Chamber Heat Exhaust Vent',
          x: Math.round(width * 0.5),
          y: Math.round(height * 0.18),
          width: 300,
          height: 22,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'middle') {
      // 6x Underside Heavy-Duty L-Bracket M3 Holes (3-side load-bearing support: 2 Left + 2 Right + 2 Rear!)
      holes.push(
        { id: 'mid-l-left-f', type: 'm3', label: 'L-Bracket Kiri Depan (Divider)', x: 14, y: height - 28, diameter: m3 },
        { id: 'mid-l-left-b', type: 'm3', label: 'L-Bracket Kiri Belakang (Divider)', x: 14, y: 28, diameter: m3 },
        { id: 'mid-l-right-f', type: 'm3', label: 'L-Bracket Kanan Depan (Right Wall)', x: width - 14, y: height - 28, diameter: m3 },
        { id: 'mid-l-right-b', type: 'm3', label: 'L-Bracket Kanan Belakang (Right Wall)', x: width - 14, y: 28, diameter: m3 },
        { id: 'mid-rear-l1', type: 'm3', label: 'L-Bracket Belakang #1 (Back)', x: Math.round(width * 0.32), y: 14, diameter: m3 },
        { id: 'mid-rear-l2', type: 'm3', label: 'L-Bracket Belakang #2 (Back)', x: Math.round(width * 0.72), y: 14, diameter: m3 },
        // 2x 120mm vertical chimney airflow cutouts
        {
          id: 'middle-cooling-vent-1',
          type: 'fan120',
          label: 'Laptop Airflow Pass #1 (120mm)',
          x: Math.round(width * 0.28),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: false,
        },
        {
          id: 'middle-cooling-vent-2',
          type: 'fan120',
          label: 'Laptop Airflow Pass #2 (120mm)',
          x: Math.round(width * 0.72),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: false,
        }
      );
    } else if (spec.id === 'bottom') {
      const pcSpan = dividerX - t;
      const rightSpan = width - pcSpan;
      const splitX = Math.round(pcSpan);
      holes.push(
        // 6x E-Track Dust Filter Rail & Divider Through-Bolt M3 Holes (1:1 aligned with filter-rail!)
        { id: 'bot-rail-fl', type: 'm3', label: 'Filter Rail M3 FL', x: 9, y: height - 18, diameter: m3 },
        { id: 'bot-rail-fr', type: 'm3', label: 'Filter Rail M3 FR', x: width - 9, y: height - 18, diameter: m3 },
        { id: 'bot-rail-bl', type: 'm3', label: 'Filter Rail M3 BL', x: 9, y: 9, diameter: m3 },
        { id: 'bot-rail-br', type: 'm3', label: 'Filter Rail M3 BR', x: width - 9, y: 9, diameter: m3 },
        { id: 'bot-div-f', type: 'm3', label: 'Divider & Rail Tengah Depan', x: splitX, y: height - 18, diameter: m3 },
        { id: 'bot-div-b', type: 'm3', label: 'Divider & Rail Tengah Belakang', x: splitX, y: 9, diameter: m3 },
        // Bottom Intake Fans (1x 140mm PC + 2x 120mm Laptop)
        {
          id: 'bottom-pc-fan140',
          type: 'fan140',
          label: 'PC Bay Intake 140mm',
          x: Math.round(pcSpan * 0.5),
          y: Math.round(height * 0.62),
          diameter: 135,
          includeMountHoles: true,
        },
        {
          id: 'bottom-lap-fan120-1',
          type: 'fan120',
          label: 'Laptop Intake 120mm #1',
          x: Math.round(pcSpan + rightSpan * 0.28),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: true,
        },
        {
          id: 'bottom-lap-fan120-2',
          type: 'fan120',
          label: 'Laptop Intake 120mm #2',
          x: Math.round(pcSpan + rightSpan * 0.72),
          y: Math.round(height * 0.5),
          diameter: 115,
          includeMountHoles: true,
        }
      );
    } else if (spec.id === 'top') {
      // Top spans full depth (W + wiringDepth): Konva y=0 is Rear (-W/2 - wiringDepth), y=height is Front (+W/2)
      const rightSpan = L - dividerX;
      const mainCenterY = Math.round(wiringDepth + W * 0.5);
      holes.push(
        // Divider Top T-Bracket M3 Holes (front & rear of main chamber)
        { id: 'top-div-f', type: 'm3', label: 'Braket T Divider Depan', x: dividerX, y: height - 14, diameter: m3 },
        { id: 'top-div-b', type: 'm3', label: 'Braket T Divider Belakang', x: dividerX, y: wiringDepth + 14, diameter: m3 },
        // 2x MC-38 Door Reed Switch Mounting Holes (above Left PC Door & Right Laptop Door)
        { id: 'top-mc38-pc1', type: 'm3', label: 'Sensor Pintu PC #1', x: dividerX - 38, y: height - 14, diameter: m3 },
        { id: 'top-mc38-pc2', type: 'm3', label: 'Sensor Pintu PC #2', x: dividerX - 18, y: height - 14, diameter: m3 },
        { id: 'top-mc38-lap1', type: 'm3', label: 'Sensor Pintu Laptop #1', x: dividerX + 18, y: height - 14, diameter: m3 },
        { id: 'top-mc38-lap2', type: 'm3', label: 'Sensor Pintu Laptop #2', x: dividerX + 38, y: height - 14, diameter: m3 },
        // MQ-2 Smoke Sensor Ceiling Mount Holes (2x M3)
        { id: 'top-mq2-1', type: 'm3', label: 'Mount Sensor Asap MQ-2 #1', x: dividerX + 18, y: mainCenterY - 20, diameter: m3 },
        { id: 'top-mq2-2', type: 'm3', label: 'Mount Sensor Asap MQ-2 #2', x: dividerX + 34, y: mainCenterY - 20, diameter: m3 },
        // Top Exhaust Fans (1x 140mm PC + 2x 120mm Laptop)
        {
          id: 'top-pc-fan140',
          type: 'fan140',
          label: 'PC Bay Exhaust 140mm',
          x: Math.round(dividerX * 0.5),
          y: mainCenterY,
          diameter: 135,
          includeMountHoles: true,
        },
        {
          id: 'top-lap-fan120-1',
          type: 'fan120',
          label: 'Laptop Exhaust 120mm #1',
          x: Math.round(dividerX + rightSpan * 0.28),
          y: mainCenterY,
          diameter: 115,
          includeMountHoles: true,
        },
        {
          id: 'top-lap-fan120-2',
          type: 'fan120',
          label: 'Laptop Exhaust 120mm #2',
          x: Math.round(dividerX + rightSpan * 0.72),
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
  length: 700, // Opsi 2 Full Showcase (70 cm): 28.5 cm PC Bay (mATX 24.4cm frontal) + 41.5 cm Laptop Bay (15.6" + colokan samping)
  width: 360,
  height: 420,
  thickness: 5,
  dividerX: 285,
  middleTrayY: 205,
  legHeight: 38,
  wiringDepth: 62, // 62mm All-in-One Rear Wiring Chamber (fits 2x Laptop Chargers + 12V IoT Adaptor + Mini PDU!)
};

export const IOT_PRESETS: Record<IoTBoxPreset, IoTBoxParams> = {
  'controller-pod': {
    // Opsi D: Minimalist Front OLED 0.96" + Right-Side 40mm Cross-Flow Fan + Left-Side Intake Louvers
    length: 124,
    width: 56,
    height: 76,
    wallThickness: 2.6,
    cornerRadius: 9,
    hasOled: true,
    hasStandoffs: true,
    standoffSpacingX: 76,
    standoffSpacingZ: 48,
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
    length: 134,
    width: 28,
    height: 134,
    wallThickness: 2.6,
    cornerRadius: 11,
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
    length: 154,
    width: 28,
    height: 154,
    wallThickness: 2.8,
    cornerRadius: 12,
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
  screwDiameter: 3.4,
  holeOffset: 16,
  showPreviewBolts: true,
};

const DEFAULT_IOT_SIM: IoTSimState = {
  tempPc: 38,
  tempLapTop: 42,
  tempLapBot: 39,
  humidity: 52,
  smokePpm: 115,
  autoMode: true,
  relayPcFans: true,
  relayLapTopFans: true,
  relayLapBotFans: true,
  relayIotFan: true,
  wireFilter: 'all',
  selectedNodeId: 'esp32',
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
  dustFilterSlide: number; // 0 = seated under bottom, >0 = slid forward out of slot
  doorLeftAngle: number; // degrees (0 = closed, 130 = wide open outward)
  doorRightAngle: number; // degrees (0 = closed, 130 = wide open outward)
  ledEnabled: boolean;
  ledColor: string;
  showBrackets: boolean;
  showHardwareMockup: boolean;
  showWiring: boolean;

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
  dustFilterSlide: 0,
  doorLeftAngle: 0,
  doorRightAngle: 0,
  ledEnabled: true,
  ledColor: '#A0E6FF',
  showBrackets: true,
  showHardwareMockup: true,
  showWiring: true,

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

  updateCaseDims: (patch) =>
    set((state) => {
      const nextDims: CaseDimensions = {
        ...state.caseDims,
        ...patch,
      };
      nextDims.dividerX = Math.min(Math.max(120, nextDims.dividerX), nextDims.length - 160);
      nextDims.middleTrayY = Math.min(
        Math.max(nextDims.thickness + 60, nextDims.middleTrayY),
        nextDims.height - nextDims.thickness - 60
      );
      nextDims.legHeight = Math.min(Math.max(0, nextDims.legHeight), 80);
      nextDims.wiringDepth = Math.min(Math.max(24, nextDims.wiringDepth), 90);

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
      name: 'vertex-cad-project-v2',
      version: 2,
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
      }),
    }
  )
);
