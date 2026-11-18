export type ActiveModule = 'acrylic' | 'iot-box' | 'iot-visualizer';
export type AcrylicViewMode = '2d' | 'split' | '3d';
export type WireCategory = 'all' | 'power' | 'sensors' | 'relays' | 'ui';

export interface IoTSimState {
  /** Simulated DHT22 #1 temperature in PC Bay (°C) */
  tempPc: number;
  /** Simulated DHT22 #2 temperature in Upper Laptop Bay (°C) */
  tempLapTop: number;
  /** Simulated DHT22 #3 temperature in Lower Laptop Bay (°C) */
  tempLapBot: number;
  /** Simulated ambient humidity (%) */
  humidity: number;
  /** Simulated MQ-2 Smoke/Gas sensor reading (ppm, alarm >= 450) */
  smokePpm: number;
  /** Automatic thermal ON/OFF + fire cut-off mode */
  autoMode: boolean;
  /** Manual Relay CH1: 12V PC Bay 2x140mm Fans (ON/OFF) */
  relayPcFans: boolean;
  /** Manual Relay CH2: 12V Upper Laptop Bay 2x120mm Fans (ON/OFF) */
  relayLapTopFans: boolean;
  /** Manual Relay CH3: 12V Lower Laptop Bay 2x120mm Fans (ON/OFF) */
  relayLapBotFans: boolean;
  /** Manual Relay CH4: 5V IoT Box 40mm Cooling Fan (ON/OFF) */
  relayIotFan: boolean;
  /** Active wire category filter in 2D schematic */
  wireFilter: WireCategory;
  /** Selected component node ID in 2D schematic */
  selectedNodeId: string | null;
}

export type PanelId =
  | 'bottom'
  | 'top'
  | 'front-left'
  | 'front-right'
  | 'back'
  | 'left'
  | 'right'
  | 'divider'
  | 'middle'
  | 'center-foot'
  | 'filter-rail'
  | 'rear-cover'
  | 'cable-comb';

export type HoleType = 'm3' | 'fan120' | 'fan140' | 'vent';

export interface Point2D {
  x: number;
  y: number;
}

export interface PanelHole {
  id: string;
  type: HoleType;
  label: string;
  /** Center X position in millimeters relative to panel top-left (0, 0) */
  x: number;
  /** Center Y position in millimeters relative to panel top-left (0, 0) */
  y: number;
  /** Diameter in mm (for 'm3' default 3mm, for 'fan120' main cutout default 115mm) */
  diameter?: number;
  /** Width in mm (for 'vent' rectangular cutout) */
  width?: number;
  /** Height in mm (for 'vent' rectangular cutout) */
  height?: number;
  /** Optional corner radius in mm for rectangular cutouts */
  cornerRadius?: number;
  /** Include 4x M4 mounting holes (105mm spacing) for 120mm fan */
  includeMountHoles?: boolean;
}

export interface AcrylicPanel {
  id: PanelId;
  name: string;
  description: string;
  enabled: boolean;
  /** Outer contour polygon points in mm (clockwise from top-left (0,0)) */
  outline: Point2D[];
  width: number;
  height: number;
  holes: PanelHole[];
}

export interface CaseDimensions {
  /** Total dual-bay case length along X-axis in mm */
  length: number;
  /** Main hardware chamber depth/width along Z-axis in mm */
  width: number;
  /** Main hardware chamber height along Y-axis in mm (excluding integrated acrylic legs) */
  height: number;
  /** Acrylic sheet thickness in mm (3mm or 5mm) */
  thickness: 3 | 5;
  /** Distance from left edge to center vertical divider separating PC Bay & Laptop Bay (mm) */
  dividerX: number;
  /** Height of right-bay middle laptop shelf from bottom floor in mm */
  middleTrayY: number;
  /** Height of integrated acrylic legs extending downward from Left & Right panels (mm) */
  legHeight: number;
  /** Depth of dedicated rear acrylic wiring/cable-management chamber behind Back wall (mm) */
  wiringDepth: number;
}

export type IoTBoxPreset =
  | 'controller-pod'
  | 'fan-shroud-120'
  | 'fan-shroud-140';

export type PrintPartCategory = 'enclosure' | 'bracket';

export type BracketType =
  | 'corner-3way'
  | 't-bracket'
  | 'cross-bracket'
  | 'l-bracket';

export interface BracketParams {
  type: BracketType;
  /** Arm length from corner/center in mm */
  armLength: number;
  /** Bracket body thickness / sleeve depth in mm */
  thickness: number;
  /** Width of each bracket arm in mm */
  armWidth: number;
  /** Acrylic sheet slot clearance width for Slotted T / Cross Clamps (5.2mm for 5mm acrylic, 3.2mm for 3mm) */
  acrylicGap: number;
  /** M3/M4 screw clearance hole diameter in mm (3.4mm recommended for M3) */
  screwDiameter: number;
  /** Distance from corner/center to screw hole center in mm */
  holeOffset: number;
  /** Show preview M3 silver bolts in 3D viewport (not exported to STL) */
  showPreviewBolts: boolean;
}

export type FanPlacement = 'side' | 'front';

export interface IoTBoxParams {
  /** Outer length (X) in mm */
  length: number;
  /** Outer depth/width (Z) in mm */
  width: number;
  /** Outer height (Y) in mm */
  height: number;
  /** Shell wall thickness in mm */
  wallThickness: number;
  /** Exterior corner fillet radius in mm (rounded pod aesthetic) */
  cornerRadius: number;
  /** 0.96" I2C OLED display cutout on front faceplate */
  hasOled: boolean;
  /** 4x Screw terminal ESP32 standoffs on inner rear wall */
  hasStandoffs: boolean;
  /** X spacing between standoffs in mm */
  standoffSpacingX: number;
  /** Y spacing between standoffs in mm */
  standoffSpacingZ: number;
  /** Intake louver ventilation slots (Left wall when side-fan active, or both sides) */
  hasSideVents: boolean;
  /** Cooling fan cutout enabled */
  hasFan40: boolean;
  /** Fan placement: 'side' (Right wall cross-flow, Opsi D) or 'front' (Faceplate fan shroud) */
  fanPlacement: FanPlacement;
  /** Fan diameter preset (40, 80, 120, or 140mm) */
  fanSize: 40 | 80 | 120 | 140;
  /** Cut matching circular airflow pass-through on rear wall (for slim top/bottom fan shrouds) */
  throughAirflow: boolean;
  /** USB / sensor cable pass-through ports */
  hasUsbCable: boolean;
  /** Rear M3 mounting holes to bolt box onto the acrylic case wall */
  hasWallMount: boolean;
  /** Generate matching rounded faceplate/lid with 4 corner M3 screw recesses */
  hasLid: boolean;
  /** Elevate/separate faceplate in 3D view to inspect interior */
  lidExploded: boolean;
  /** Show simulated glowing Ice Blue OLED telemetry, fan & corner screws in 3D preview */
  showVisualHardware: boolean;
}
