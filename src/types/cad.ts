export type ActiveModule = 'acrylic' | 'iot-box';
export type AcrylicViewMode = '2d' | 'split' | '3d';

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
  | 'fan-pod'
  | 'fan-shroud-120'
  | 'fan-shroud-140';

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
  /** 4x Screw terminal ESP32 standoffs on inner floor/backplate */
  hasStandoffs: boolean;
  /** X spacing between standoffs in mm */
  standoffSpacingX: number;
  /** Z spacing between standoffs in mm */
  standoffSpacingZ: number;
  /** Side louver ventilation slots along left & right walls */
  hasSideVents: boolean;
  /** Cooling fan cutout on faceplate (40 / 80 / 120 / 140mm) */
  hasFan40: boolean;
  /** Fan diameter preset (40, 80, 120, or 140mm) */
  fanSize: 40 | 80 | 120 | 140;
  /** Cut matching circular airflow pass-through on rear wall (for slim top/bottom fan shrouds) */
  throughAirflow: boolean;
  /** USB / sensor cable pass-through ports */
  hasUsbCable: boolean;
  /** Rear/Bottom M3 mounting holes to bolt pod onto the acrylic case wall */
  hasWallMount: boolean;
  /** Generate matching rounded faceplate/lid with 4 corner M3 screw recesses */
  hasLid: boolean;
  /** Elevate/separate faceplate in 3D view to inspect interior */
  lidExploded: boolean;
  /** Show simulated glowing Ice Blue OLED telemetry & corner screws in 3D preview */
  showVisualHardware: boolean;
}
