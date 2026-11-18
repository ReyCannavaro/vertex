import { create } from 'zustand';
import {
  AcrylicPanel,
  AcrylicViewMode,
  ActiveModule,
  CaseDimensions,
  HoleType,
  IoTBoxParams,
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

function getPanelSize(id: PanelId, dims: CaseDimensions): { width: number; height: number } {
  const { length, width, height, thickness } = dims;
  const innerH = Math.max(40, height - thickness * 2);
  const innerW = Math.max(40, width - thickness * 2);
  const innerL = Math.max(40, length - thickness * 2);

  switch (id) {
    case 'bottom':
    case 'top':
      return { width: length, height: width };
    case 'front':
    case 'back':
      return { width: length, height: innerH };
    case 'left':
    case 'right':
      return { width: innerW, height: innerH };
    case 'middle':
      // 1mm clearance per side so the laptop tray slides cleanly inside the case
      return { width: Math.max(30, innerL - 2), height: Math.max(30, innerW - 2) };
  }
}

function makeCornerM3Holes(panelId: PanelId, w: number, h: number, margin = 12): PanelHole[] {
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
  const specs: Array<{ id: PanelId; name: string; description: string; enabled: boolean }> = [
    { id: 'bottom', name: 'Bottom (Lantai)', description: 'Basis PSU & Motherboard PC', enabled: true },
    { id: 'top', name: 'Top (Atap)', description: 'Exhaust Kipas 120mm & Akses Atas', enabled: true },
    { id: 'front', name: 'Front (Depan)', description: 'Panel Depan & Airflow Intake', enabled: true },
    { id: 'back', name: 'Back (Belakang)', description: 'I/O Shield, Power & Kabel LAN', enabled: true },
    { id: 'left', name: 'Left (Kiri)', description: 'Dinding Samping Kiri', enabled: true },
    { id: 'right', name: 'Right (Kanan)', description: 'Dinding Samping Kanan', enabled: true },
    { id: 'middle', name: 'Middle Tray (Rak Laptop)', description: 'Rak Tengah untuk Mainboard Laptop', enabled: true },
  ];

  const panels = {} as Record<PanelId, AcrylicPanel>;

  for (const spec of specs) {
    const { width, height } = getPanelSize(spec.id, dims);
    const holes: PanelHole[] = makeCornerM3Holes(spec.id, width, height, 12);

    if (spec.id === 'bottom') {
      holes.push({
        id: 'bottom-fan-120',
        type: 'fan120',
        label: 'Intake Fan 120mm',
        x: Math.round(width * 0.32),
        y: Math.round(height * 0.5),
        diameter: 115,
        includeMountHoles: true,
      });
      holes.push({
        id: 'bottom-cable-vent',
        type: 'vent',
        label: 'Slot Kabel PSU',
        x: Math.round(width * 0.78),
        y: Math.round(height * 0.5),
        width: 50,
        height: 22,
        cornerRadius: 4,
      });
    } else if (spec.id === 'top') {
      holes.push({
        id: 'top-fan-120-a',
        type: 'fan120',
        label: 'Exhaust Fan 120mm #1',
        x: Math.round(width * 0.32),
        y: Math.round(height * 0.5),
        diameter: 115,
        includeMountHoles: true,
      });
      holes.push({
        id: 'top-fan-120-b',
        type: 'fan120',
        label: 'Exhaust Fan 120mm #2',
        x: Math.round(width * 0.68),
        y: Math.round(height * 0.5),
        diameter: 115,
        includeMountHoles: true,
      });
    } else if (spec.id === 'back') {
      holes.push({
        id: 'back-io-cutout',
        type: 'vent',
        label: 'Rear I/O & LAN',
        x: Math.round(width * 0.35),
        y: Math.round(height * 0.6),
        width: 110,
        height: 45,
        cornerRadius: 4,
      });
      holes.push({
        id: 'back-power-slot',
        type: 'vent',
        label: 'AC Power Inlet',
        x: Math.round(width * 0.78),
        y: Math.round(height * 0.68),
        width: 32,
        height: 24,
        cornerRadius: 3,
      });
    } else if (spec.id === 'front') {
      holes.push({
        id: 'front-vent-slot',
        type: 'vent',
        label: 'Front Airflow Slot',
        x: Math.round(width * 0.5),
        y: Math.round(height * 0.5),
        width: 140,
        height: 24,
        cornerRadius: 6,
      });
    } else if (spec.id === 'middle') {
      holes.push({
        id: 'middle-air-pass',
        type: 'vent',
        label: 'Airflow & Cable Pass',
        x: Math.round(width * 0.5),
        y: Math.round(height * 0.5),
        width: 120,
        height: 60,
        cornerRadius: 8,
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
  length: 360,
  width: 260,
  height: 200,
  thickness: 3,
  middleTrayY: 105,
};

const DEFAULT_IOT_BOX: IoTBoxParams = {
  length: 115,
  width: 88,
  height: 52,
  wallThickness: 2.4,
  hasOled: true,
  hasStandoffs: true,
  standoffSpacingX: 72,
  standoffSpacingZ: 58,
  hasFan40: true,
  hasUsbCable: true,
  hasLid: true,
  lidExploded: true,
};

interface CadStoreState {
  // Navigation & Layout
  activeModule: ActiveModule;
  acrylicViewMode: AcrylicViewMode;

  // Module 1: Acrylic Case Builder
  caseDims: CaseDimensions;
  panels: Record<PanelId, AcrylicPanel>;
  activePanelId: PanelId;
  selectedHoleId: string | null;
  gridSize: number; // mm
  snapToGrid: boolean;
  explodeAmount: number; // mm (0 = assembled, >0 = exploded)
  ledEnabled: boolean;
  ledColor: string;
  showBrackets: boolean;

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

  updateCaseDims: (patch: Partial<CaseDimensions>) => void;
  togglePanelEnabled: (id: PanelId) => void;
  addHoleToActivePanel: (type: HoleType) => void;
  updateHole: (panelId: PanelId, holeId: string, patch: Partial<PanelHole>) => void;
  deleteHole: (panelId: PanelId, holeId: string) => void;
  autoPlaceCornerM3: (panelId: PanelId, margin?: number) => void;
  clearPanelHoles: (panelId: PanelId) => void;
  resetAcrylicCase: () => void;

  updateIoTBox: (patch: Partial<IoTBoxParams>) => void;
  resetIoTBox: () => void;
}

export const useCadStore = create<CadStoreState>((set) => ({
  activeModule: 'acrylic',
  acrylicViewMode: 'split',

  caseDims: DEFAULT_CASE_DIMS,
  panels: createInitialPanels(DEFAULT_CASE_DIMS),
  activePanelId: 'bottom',
  selectedHoleId: null,
  gridSize: 5,
  snapToGrid: true,
  explodeAmount: 0,
  ledEnabled: true,
  ledColor: '#A0E6FF',
  showBrackets: true,

  iotBox: DEFAULT_IOT_BOX,

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

  updateCaseDims: (patch) =>
    set((state) => {
      const nextDims: CaseDimensions = {
        ...state.caseDims,
        ...patch,
      };
      // Clamp middle tray inside case height
      nextDims.middleTrayY = Math.min(
        Math.max(nextDims.thickness + 20, nextDims.middleTrayY),
        nextDims.height - nextDims.thickness - 20
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

  autoPlaceCornerM3: (panelId, margin = 12) =>
    set((state) => {
      const panel = state.panels[panelId];
      // Keep non-corner holes, replace auto corner M3 holes
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

  resetIoTBox: () => set({ iotBox: DEFAULT_IOT_BOX }),
}));
