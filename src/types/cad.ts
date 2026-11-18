export type ActiveModule = 'acrylic' | 'iot-box';
export type AcrylicViewMode = '2d' | 'split' | '3d';

export type PanelId =
  | 'bottom'
  | 'top'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'middle';

export type HoleType = 'm3' | 'fan120' | 'vent';

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
  /** Case length along X-axis in mm */
  length: number;
  /** Case depth/width along Z-axis in mm */
  width: number;
  /** Case height along Y-axis in mm */
  height: number;
  /** Acrylic sheet thickness in mm (3mm or 5mm) */
  thickness: 3 | 5;
  /** Height of optional middle laptop/motherboard tray from bottom in mm */
  middleTrayY: number;
}

export interface IoTBoxParams {
  /** Outer length (X) in mm */
  length: number;
  /** Outer width/depth (Z) in mm */
  width: number;
  /** Outer height (Y) in mm */
  height: number;
  /** Shell wall thickness in mm */
  wallThickness: number;
  /** 0.96" I2C OLED display cutout on front panel */
  hasOled: boolean;
  /** 4x Screw terminal ESP32 standoffs on inner floor */
  hasStandoffs: boolean;
  /** X spacing between standoffs in mm */
  standoffSpacingX: number;
  /** Z spacing between standoffs in mm */
  standoffSpacingZ: number;
  /** 40mm cooling fan cutout on right panel */
  hasFan40: boolean;
  /** USB / sensor cable cutout on left/back panel */
  hasUsbCable: boolean;
  /** Generate matching removable lid */
  hasLid: boolean;
  /** Elevate lid in 3D view to inspect interior */
  lidExploded: boolean;
}
