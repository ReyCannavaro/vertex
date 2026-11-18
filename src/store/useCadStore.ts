import { create } from 'zustand';
import {
  AcrylicPanel,
  AcrylicViewMode,
  ActiveModule,
  CaseDimensions,
  HoleType,
  IoTBoxParams,
  IoTBoxPreset,
  PanelHole,
  PanelId,
  Point2D,
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
 * Generates a U-shaped slide-in dust filter track mounted underneath the Bottom panel.
 * Closed on Rear (y=0), Left, and Right; OPEN at Front (y=h) for tool-less filter pull-out.
 */
function makeUFilterRailOutline(w: number, h: number, railW = 20): Point2D[] {
  const rw = Math.min(railW, Math.floor(w / 6), Math.floor(h / 6));
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
    case 'filter-rail':
      return {
        width: innerL,
        height: innerW,
        outline: makeUFilterRailOutline(innerL, innerW, 20),
      };
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
    label: `M3 ${c.tag}`,
    x: Math.round(c.x),
    y: Math.round(c.y),
    diameter: 3,
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
      name: 'Dust Filter Rail (Slot Bawah)',
      description: 'Rel akrilik U-Track untuk slide-in dust filter dari depan',
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
  const { length: L, width: W, thickness: t, dividerX, legHeight, wiringDepth } = dims;

  for (const spec of specs) {
    const { width, height, outline } = getPanelGeometrySpec(spec.id, dims);
    let holes: PanelHole[] = [];

    if (spec.id === 'filter-rail') {
      // M3 mounting holes along left & right rail arms
      holes = [
        { id: 'fr-m3-1', type: 'm3', label: 'Rail M3 FL', x: 10, y: height - 18, diameter: 3 },
        { id: 'fr-m3-2', type: 'm3', label: 'Rail M3 FR', x: width - 10, y: height - 18, diameter: 3 },
        { id: 'fr-m3-3', type: 'm3', label: 'Rail M3 BL', x: 10, y: 10, diameter: 3 },
        { id: 'fr-m3-4', type: 'm3', label: 'Rail M3 BR', x: width - 10, y: 10, diameter: 3 },
      ];
    } else if (spec.id === 'cable-comb') {
      holes = [
        { id: 'cc-m3-l', type: 'm3', label: 'Comb Mount L', x: 12, y: height - 8, diameter: 3 },
        { id: 'cc-m3-r', type: 'm3', label: 'Comb Mount R', x: width - 12, y: height - 8, diameter: 3 },
      ];
    } else if (spec.id === 'front-left' || spec.id === 'front-right') {
      // Exact M3 screw holes for 2x Butterfly Hinges (hinged edge) + 1x Pull Handle (center edge)
      const isLeft = spec.id === 'front-left';
      const hingeX = isLeft ? 16 : width - 16;
      const handleX = isLeft ? width - 20 : 20;
      const topHingeY = Math.round(height * 0.22);
      const botHingeY = Math.round(height * 0.78);
      const midY = Math.round(height * 0.5);

      holes = [
        // Upper Hinge (2x M3)
        { id: `${spec.id}-h1a`, type: 'm3', label: 'Engsel Atas #1', x: hingeX, y: topHingeY - 12, diameter: 3 },
        { id: `${spec.id}-h1b`, type: 'm3', label: 'Engsel Atas #2', x: hingeX, y: topHingeY + 12, diameter: 3 },
        // Lower Hinge (2x M3)
        { id: `${spec.id}-h2a`, type: 'm3', label: 'Engsel Bawah #1', x: hingeX, y: botHingeY - 12, diameter: 3 },
        { id: `${spec.id}-h2b`, type: 'm3', label: 'Engsel Bawah #2', x: hingeX, y: botHingeY + 12, diameter: 3 },
        // Pull Handle (2x M3)
        { id: `${spec.id}-hdl1`, type: 'm3', label: 'Handle Atas', x: handleX, y: midY - 26, diameter: 3 },
        { id: `${spec.id}-hdl2`, type: 'm3', label: 'Handle Bawah', x: handleX, y: midY + 26, diameter: 3 },
      ];
    } else if (spec.id === 'left' || spec.id === 'right') {
      // Keep bottom corner M3 holes above the chamfered leg cutout!
      holes = makeCornerM3Holes(spec.id, width, height, 14, legHeight + 14);
    } else {
      holes = makeCornerM3Holes(spec.id, width, height, 14);
    }

    if (spec.id === 'right') {
      // Single unified IoT Controller Box mounting pattern (centered on Right Wall main area)
      const mainCenterX = Math.round(W * 0.5);
      const mainH = height - legHeight;
      const mountY = Math.round(mainH * 0.5);
      holes.push(
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
        // 4x M3 rear wall mounting holes matching the IoT Box rear mounting pitch (±38mm x ±22mm)
        { id: 'right-iot-m3-1', type: 'm3', label: 'IoT Mount TL', x: mainCenterX - 38, y: mountY - 22, diameter: 3 },
        { id: 'right-iot-m3-2', type: 'm3', label: 'IoT Mount TR', x: mainCenterX + 38, y: mountY - 22, diameter: 3 },
        { id: 'right-iot-m3-3', type: 'm3', label: 'IoT Mount BR', x: mainCenterX + 38, y: mountY + 22, diameter: 3 },
        { id: 'right-iot-m3-4', type: 'm3', label: 'IoT Mount BL', x: mainCenterX - 38, y: mountY + 22, diameter: 3 }
      );
    } else if (spec.id === 'divider') {
      holes.push({
        id: 'divider-cable-upper',
        type: 'vent',
        label: 'Kabel Laptop Atas -> PC',
        x: Math.round(width * 0.78),
        y: Math.round(height * 0.32),
        width: 36,
        height: 55,
        cornerRadius: 8,
      });
      holes.push({
        id: 'divider-cable-lower',
        type: 'vent',
        label: 'Kabel Power PSU -> Laptop',
        x: Math.round(width * 0.78),
        y: Math.round(height * 0.74),
        width: 36,
        height: 55,
        cornerRadius: 8,
      });
    } else if (spec.id === 'back') {
      // Back wall is rotated 180° around Y: Konva left (small X) = Right Laptop Bay, Konva right (large X) = Left PC Bay
      const pcX = Math.round(width - (dividerX - t) * 0.52);
      const lapLeftX = Math.round((L - dividerX - t) * 0.32);
      const lapRightX = Math.round((L - dividerX - t) * 0.72);
      holes.push(
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
          label: 'Slot Kabel Fan & IoT Pod',
          x: lapRightX,
          y: Math.round(height * 0.54),
          width: 44,
          height: 74,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'rear-cover') {
      // Rear outer cover of the Wiring Chamber: clean bottom main exit + top rear vent
      holes.push(
        {
          id: 'rear-main-exit',
          type: 'vent',
          label: 'Main Power & LAN Exit',
          x: Math.round(width * 0.5),
          y: Math.round(height - 32),
          width: 120,
          height: 28,
          cornerRadius: 8,
        },
        {
          id: 'rear-upper-vent',
          type: 'vent',
          label: 'Rear Chamber Passive Vent',
          x: Math.round(width * 0.5),
          y: Math.round(height * 0.2),
          width: 240,
          height: 22,
          cornerRadius: 8,
        }
      );
    } else if (spec.id === 'middle') {
      holes.push(
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
      holes.push(
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
      // Top spans full depth (W + wiringDepth): Konva y=0 is Rear (-W/2 - wiringDepth), so main chamber starts at y = wiringDepth!
      const rightSpan = L - dividerX;
      const mainCenterY = Math.round(wiringDepth + W * 0.5);
      holes.push(
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
  length: 600,
  width: 360,
  height: 420,
  thickness: 5,
  dividerX: 220,
  middleTrayY: 205,
  legHeight: 38,
  wiringDepth: 48,
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

interface CadStoreState {
  activeModule: ActiveModule;
  acrylicViewMode: AcrylicViewMode;

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

  // Module 2: Parametric IoT Box Builder
  iotBox: IoTBoxParams;

  // Actions
  setActiveModule: (module: ActiveModule) => void;
  setAcrylicViewMode: (mode: AcrylicViewMode) => void;
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

  updateIoTBox: (patch: Partial<IoTBoxParams>) => void;
  applyIoTPreset: (preset: IoTBoxPreset) => void;
  resetIoTBox: () => void;
}

export const useCadStore = create<CadStoreState>((set) => ({
  activeModule: 'acrylic',
  acrylicViewMode: 'split',

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

  iotBox: IOT_PRESETS['controller-pod'],

  setActiveModule: (activeModule) => set({ activeModule }),
  setAcrylicViewMode: (acrylicViewMode) => set({ acrylicViewMode }),
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
          diameter: 3,
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

  updateIoTBox: (patch) =>
    set((state) => ({
      iotBox: {
        ...state.iotBox,
        ...patch,
      },
    })),

  applyIoTPreset: (preset) =>
    set({
      iotBox: { ...IOT_PRESETS[preset] },
    }),

  resetIoTBox: () => set({ iotBox: { ...IOT_PRESETS['controller-pod'] } }),
}));
