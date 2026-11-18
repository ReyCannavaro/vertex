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

export function getPanelSize(
  id: PanelId,
  dims: CaseDimensions
): { width: number; height: number } {
  const { length, width, height, thickness, dividerX } = dims;
  const innerH = Math.max(60, height - thickness * 2);
  const innerW = Math.max(60, width - thickness * 2);
  const rightBayInnerL = Math.max(80, length - dividerX - thickness * 1.5);

  switch (id) {
    case 'bottom':
    case 'top':
      return { width: length, height: width };
    case 'front':
    case 'back':
      return { width: length, height: innerH };
    case 'left':
    case 'right':
    case 'divider':
      return { width: innerW, height: innerH };
    case 'middle':
      // Right-bay laptop shelf spans cleanly between center divider & right outer wall
      return { width: Math.round(rightBayInnerL), height: innerW };
  }
}

function makeCornerM3Holes(
  panelId: PanelId,
  w: number,
  h: number,
  margin = 14
): PanelHole[] {
  const coords = [
    { x: margin, y: margin, tag: 'TL' },
    { x: w - margin, y: margin, tag: 'TR' },
    { x: w - margin, y: h - margin, tag: 'BR' },
    { x: margin, y: h - margin, tag: 'BL' },
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
      description: 'Basis PSU PC, HDD & Cooling Pad Laptop Bawah',
      enabled: true,
    },
    {
      id: 'top',
      name: 'Top (Atap Akrilik)',
      description: 'Penutup Atas Dual-Bay + LED Frame',
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
      name: 'Middle Shelf (Rak Laptop Atas)',
      description: 'Rak Tengah Khusus Bay Kanan (Laptop #2)',
      enabled: true,
    },
    {
      id: 'right',
      name: 'Right Wall (Kanan — IoT & Fan)',
      description: 'Mounting Eksternal Fan Pod Atas & IoT Box Bawah',
      enabled: true,
    },
    {
      id: 'left',
      name: 'Left Wall (Kiri — PC Bay)',
      description: 'Sisi Motherboard PC & Akses I/O',
      enabled: true,
    },
    {
      id: 'back',
      name: 'Back Wall (Belakang)',
      description: 'Lubang Kabel Power, LAN & Exhaust',
      enabled: true,
    },
    {
      id: 'front',
      name: 'Front Panel (Depan)',
      description: 'Panel Kaca Depan (opsional buka/tutup)',
      enabled: false, // Open front by default for clean showcase like open-front inspection, toggleable!
    },
  ];

  const panels = {} as Record<PanelId, AcrylicPanel>;

  for (const spec of specs) {
    const { width, height } = getPanelSize(spec.id, dims);
    const holes: PanelHole[] = makeCornerM3Holes(spec.id, width, height, 14);

    if (spec.id === 'right') {
      // Upper external Fan Pod mounting cutout + air hole
      holes.push({
        id: 'right-fan-pod',
        type: 'fan120',
        label: 'Upper Fan Pod Exhaust',
        x: Math.round(width * 0.5),
        y: Math.round(height * 0.27),
        diameter: 82,
        includeMountHoles: false,
      });
      // Lower IoT Controller Box cable & mounting pass-through
      holes.push({
        id: 'right-iot-cable',
        type: 'vent',
        label: 'IoT Box Cable Pass',
        x: Math.round(width * 0.5),
        y: Math.round(height * 0.72),
        width: 34,
        height: 18,
        cornerRadius: 4,
      });
    } else if (spec.id === 'divider') {
      // Inter-bay cable routing slots between PC Bay and Laptop Bay
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
      // Rear I/O for PC motherboard on left bay + PSU power inlet
      holes.push({
        id: 'back-pc-io',
        type: 'vent',
        label: 'PC Motherboard I/O',
        x: Math.round(dims.length - dims.dividerX * 0.55),
        y: Math.round(height * 0.34),
        width: 50,
        height: 145,
        cornerRadius: 4,
      });
      holes.push({
        id: 'back-psu-inlet',
        type: 'vent',
        label: 'ATX PSU Exhaust & AC',
        x: Math.round(dims.length - dims.dividerX * 0.55),
        y: Math.round(height * 0.8),
        width: 120,
        height: 68,
        cornerRadius: 6,
      });
      // Laptop bay rear exhaust vents
      holes.push({
        id: 'back-laptop-vent-top',
        type: 'vent',
        label: 'Exhaust Laptop Atas',
        x: Math.round((dims.length - dims.dividerX) * 0.5),
        y: Math.round(height * 0.35),
        width: 220,
        height: 28,
        cornerRadius: 8,
      });
      holes.push({
        id: 'back-laptop-vent-bot',
        type: 'vent',
        label: 'Exhaust Laptop Bawah',
        x: Math.round((dims.length - dims.dividerX) * 0.5),
        y: Math.round(height * 0.78),
        width: 220,
        height: 28,
        cornerRadius: 8,
      });
    } else if (spec.id === 'middle') {
      // Ventilation cutout under top laptop cooling pad
      holes.push({
        id: 'middle-cooling-vent',
        type: 'fan120',
        label: 'Laptop Cooling Vent 120mm',
        x: Math.round(width * 0.5),
        y: Math.round(height * 0.5),
        diameter: 115,
        includeMountHoles: true,
      });
    } else if (spec.id === 'bottom') {
      // Bottom intake under PC PSU
      holes.push({
        id: 'bottom-psu-intake',
        type: 'fan120',
        label: 'PSU Intake 120mm',
        x: Math.round(dims.dividerX * 0.52),
        y: Math.round(height * 0.55),
        diameter: 115,
        includeMountHoles: true,
      });
    }

    panels[spec.id] = {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      enabled: spec.enabled,
      width,
      height,
      outline: makeRectOutline(width, height),
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
};

export const IOT_PRESETS: Record<IoTBoxPreset, IoTBoxParams> = {
  'controller-pod': {
    length: 120,
    width: 48,
    height: 76,
    wallThickness: 2.6,
    cornerRadius: 9,
    hasOled: true,
    hasStandoffs: true,
    standoffSpacingX: 76,
    standoffSpacingZ: 48,
    hasSideVents: true,
    hasFan40: false,
    fanSize: 40,
    hasUsbCable: true,
    hasWallMount: true,
    hasLid: true,
    lidExploded: false,
    showVisualHardware: true,
  },
  'fan-pod': {
    length: 108,
    width: 48,
    height: 108,
    wallThickness: 2.8,
    cornerRadius: 10,
    hasOled: false,
    hasStandoffs: false,
    standoffSpacingX: 70,
    standoffSpacingZ: 70,
    hasSideVents: true,
    hasFan40: true,
    fanSize: 80,
    hasUsbCable: true,
    hasWallMount: true,
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
  ledEnabled: boolean;
  ledColor: string;
  showBrackets: boolean;
  showHardwareMockup: boolean;

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
  setLedEnabled: (enabled: boolean) => void;
  setLedColor: (color: string) => void;
  setShowBrackets: (show: boolean) => void;
  setShowHardwareMockup: (show: boolean) => void;

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
  activePanelId: 'right',
  selectedHoleId: null,
  gridSize: 10,
  snapToGrid: true,
  explodeAmount: 0,
  ledEnabled: true,
  ledColor: '#A0E6FF',
  showBrackets: true,
  showHardwareMockup: true,

  iotBox: IOT_PRESETS['controller-pod'],

  setActiveModule: (activeModule) => set({ activeModule }),
  setAcrylicViewMode: (acrylicViewMode) => set({ acrylicViewMode }),
  setActivePanelId: (activePanelId) => set({ activePanelId, selectedHoleId: null }),
  setSelectedHoleId: (selectedHoleId) => set({ selectedHoleId }),
  setGridSize: (gridSize) => set({ gridSize }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setExplodeAmount: (explodeAmount) => set({ explodeAmount }),
  setLedEnabled: (ledEnabled) => set({ ledEnabled }),
  setLedColor: (ledColor) => set({ ledColor }),
  setShowBrackets: (showBrackets) => set({ showBrackets }),
  setShowHardwareMockup: (showHardwareMockup) => set({ showHardwareMockup }),

  updateCaseDims: (patch) =>
    set((state) => {
      const nextDims: CaseDimensions = {
        ...state.caseDims,
        ...patch,
      };
      // Clamp dividerX and middleTrayY cleanly within valid mechanical bounds
      nextDims.dividerX = Math.min(
        Math.max(120, nextDims.dividerX),
        nextDims.length - 160
      );
      nextDims.middleTrayY = Math.min(
        Math.max(nextDims.thickness + 60, nextDims.middleTrayY),
        nextDims.height - nextDims.thickness - 60
      );

      const nextPanels = { ...state.panels };
      (Object.keys(nextPanels) as PanelId[]).forEach((pid) => {
        const oldPanel = nextPanels[pid];
        const { width, height } = getPanelSize(pid, nextDims);
        const clampedHoles = oldPanel.holes.map((h) => ({
          ...h,
          x: Math.min(Math.max(4, h.x), width - 4),
          y: Math.min(Math.max(4, h.y), height - 4),
        }));
        nextPanels[pid] = {
          ...oldPanel,
          width,
          height,
          outline: makeRectOutline(width, height),
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
      const cornerHoles = makeCornerM3Holes(panelId, panel.width, panel.height, margin);
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
