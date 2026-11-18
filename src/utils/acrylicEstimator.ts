import { AcrylicPanel, CaseDimensions, PanelId, Point2D } from '../types/cad';

/**
 * Shoelace polygon area in mm^2.
 */
function polygonAreaMm2(pts: Point2D[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export interface AcrylicEstimate {
  panelCount: number;
  netAreaM2: number;
  grossAreaWithWasteM2: number;
  estimatedWeightKg: number;
  fullSheets122x244: number;
  sheetRecommendation: string;
  utilizationPct: number;
}

const FULL_SHEET_AREA_M2 = 1.22 * 2.44; // Standard 122 x 244 cm Cast Acrylic sheet (~2.977 m²)
const HALF_SHEET_AREA_M2 = 1.22 * 1.22; // Standard 122 x 122 cm half sheet (~1.488 m²)
const ACRYLIC_DENSITY_G_CM3 = 1.19; // Cast PMMA acrylic density

/**
 * Calculates real-time laser-cut acrylic sheet usage, nesting waste (15%), and weight estimate.
 */
export function computeAcrylicEstimate(
  panels: Record<PanelId, AcrylicPanel>,
  dims: CaseDimensions
): AcrylicEstimate {
  const enabled = (Object.values(panels) as AcrylicPanel[]).filter((p) => p.enabled);

  let netMm2 = 0;
  let bboxMm2 = 0;

  for (const panel of enabled) {
    netMm2 += polygonAreaMm2(panel.outline);
    bboxMm2 += panel.width * panel.height;
  }

  const netAreaM2 = netMm2 / 1_000_000;
  // Gross area with 15% kerf & sheet nesting allowance
  const grossAreaWithWasteM2 = (bboxMm2 / 1_000_000) * 1.15;

  // Weight = netArea (cm²) * thickness (cm) * 1.19 g/cm³ -> kg
  const netAreaCm2 = netMm2 / 100;
  const thicknessCm = dims.thickness / 10;
  const estimatedWeightKg = (netAreaCm2 * thicknessCm * ACRYLIC_DENSITY_G_CM3) / 1000;

  const fullSheets122x244 = Math.max(1, Math.ceil(grossAreaWithWasteM2 / FULL_SHEET_AREA_M2));
  const utilizationPct = Math.min(
    99,
    Math.round((grossAreaWithWasteM2 / (fullSheets122x244 * FULL_SHEET_AREA_M2)) * 100)
  );

  let sheetRecommendation: string;
  if (grossAreaWithWasteM2 <= HALF_SHEET_AREA_M2 * 0.92) {
    sheetRecommendation = `1× Setengah Lembar (122×122 cm) • ${dims.thickness}mm Cast`;
  } else if (fullSheets122x244 === 1) {
    sheetRecommendation = `1× Lembar Standar (122×244 cm) • ${dims.thickness}mm Cast`;
  } else {
    sheetRecommendation = `${fullSheets122x244}× Lembar Standar (122×244 cm) • ${dims.thickness}mm Cast`;
  }

  return {
    panelCount: enabled.length,
    netAreaM2,
    grossAreaWithWasteM2,
    estimatedWeightKg,
    fullSheets122x244,
    sheetRecommendation,
    utilizationPct,
  };
}
