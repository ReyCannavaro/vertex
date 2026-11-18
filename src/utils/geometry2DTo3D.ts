import * as THREE from 'three';
import { AcrylicPanel, CaseDimensions, PanelHole, PanelId } from '../types/cad';

/**
 * Helper to create a rounded rectangle THREE.Path centered at (cx, cy).
 */
function createRoundedRectPath(
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number
): THREE.Path {
  const path = new THREE.Path();
  const radius = Math.min(r, w / 2, h / 2);
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const x1 = cx + w / 2;
  const y1 = cy + h / 2;

  if (radius <= 0.1) {
    path.moveTo(x0, y0);
    path.lineTo(x1, y0);
    path.lineTo(x1, y1);
    path.lineTo(x0, y1);
    path.closePath();
    return path;
  }

  path.moveTo(x0 + radius, y0);
  path.lineTo(x1 - radius, y0);
  path.quadraticCurveTo(x1, y0, x1, y0 + radius);
  path.lineTo(x1, y1 - radius);
  path.quadraticCurveTo(x1, y1, x1 - radius, y1);
  path.lineTo(x0 + radius, y1);
  path.quadraticCurveTo(x0, y1, x0, y1 - radius);
  path.lineTo(x0, y0 + radius);
  path.quadraticCurveTo(x0, y0, x0 + radius, y0);
  path.closePath();
  return path;
}

/**
 * Helper to create a circular THREE.Path centered at (cx, cy).
 */
function createCirclePath(cx: number, cy: number, radius: number): THREE.Path {
  const path = new THREE.Path();
  path.absarc(cx, cy, radius, 0, Math.PI * 2, false);
  return path;
}

/**
 * Converts a 2D AcrylicPanel (defined by Konva-compatible mm outline points and holes)
 * into a centered Three.js ExtrudeGeometry (1 Three.js unit = 1 mm).
 */
export function buildPanelExtrudeGeometry(
  panel: AcrylicPanel,
  thickness: number
): THREE.ExtrudeGeometry {
  const { width, height, outline, holes } = panel;
  const halfW = width / 2;
  const halfH = height / 2;

  // Convert Konva top-left (0,0) Y-down points -> centered Three.js Y-up coordinates
  const toShapeXY = (px: number, py: number): [number, number] => [
    px - halfW,
    halfH - py,
  ];

  // 1. Build outer contour Shape from array of 2D points
  const shape = new THREE.Shape();
  const pts =
    outline.length >= 3
      ? outline
      : [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ];

  const [startX, startY] = toShapeXY(pts[0].x, pts[0].y);
  shape.moveTo(startX, startY);
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = toShapeXY(pts[i].x, pts[i].y);
    shape.lineTo(px, py);
  }
  shape.closePath();

  // 2. Punch all 2D holes into shape.holes (much cleaner & faster than 3D CSG for flat sheets)
  const addHoleSafe = (hole: PanelHole) => {
    const [cx, cy] = toShapeXY(hole.x, hole.y);

    if (hole.type === 'm3') {
      const r = Math.max(0.5, (hole.diameter ?? 3) / 2);
      if (isCircleInsidePanel(hole.x, hole.y, r, width, height)) {
        shape.holes.push(createCirclePath(cx, cy, r));
      }
    } else if (hole.type === 'fan120' || hole.type === 'fan140') {
      const is140 = hole.type === 'fan140';
      const defaultDia = is140 ? 135 : 115;
      const pitchHalf = is140 ? 62.25 : 52.5; // 124.5mm pitch for 140mm fan, 105mm for 120mm fan
      const mainR = Math.max(10, (hole.diameter ?? defaultDia) / 2);
      if (isCircleInsidePanel(hole.x, hole.y, mainR, width, height)) {
        shape.holes.push(createCirclePath(cx, cy, mainR));
      }
      // 4x M4 mounting holes at standard fan pitch
      if (hole.includeMountHoles !== false) {
        const mountR = 2.25; // 4.5mm M4 clearance
        const offsets = [
          [-pitchHalf, -pitchHalf],
          [pitchHalf, -pitchHalf],
          [pitchHalf, pitchHalf],
          [-pitchHalf, pitchHalf],
        ];
        for (const [ox, oy] of offsets) {
          if (isCircleInsidePanel(hole.x + ox, hole.y + oy, mountR, width, height)) {
            shape.holes.push(createCirclePath(cx + ox, cy - oy, mountR));
          }
        }
      }
    } else if (hole.type === 'vent') {
      const w = Math.max(2, hole.width ?? 60);
      const h = Math.max(2, hole.height ?? 24);
      const r = hole.cornerRadius ?? 4;
      if (
        hole.x - w / 2 > 1 &&
        hole.x + w / 2 < width - 1 &&
        hole.y - h / 2 > 1 &&
        hole.y + h / 2 < height - 1
      ) {
        shape.holes.push(createRoundedRectPath(cx, cy, w, h, r));
      }
    }
  };

  holes.forEach(addHoleSafe);

  // 3. Extrude along Z-axis to exact acrylic sheet thickness (3mm or 5mm)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.15,
    bevelSegments: 2,
    curveSegments: 36,
  });

  // Center the sheet thickness around local Z = 0 for clean 3D box assembly math
  geometry.translate(0, 0, -thickness / 2);
  geometry.computeVertexNormals();

  return geometry;
}

function isCircleInsidePanel(
  cx: number,
  cy: number,
  r: number,
  panelW: number,
  panelH: number
): boolean {
  return cx - r > 0.5 && cx + r < panelW - 0.5 && cy - r > 0.5 && cy + r < panelH - 0.5;
}

/**
 * Computes exact 3D assembly world transform [position, rotation] for all 11 laser-cut panels:
 * - Elevated main chamber supported by Left & Right integrated chamfered acrylic legs (bottom feet at Y = 0)
 * - Slide-in U-shaped Dust Filter Rail directly beneath the Bottom floor
 * - Dedicated Rear Wiring Chamber behind the Back partition with slotted Acrylic Cable Comb & Rear Cover
 */
export function getPanelAssemblyTransform(
  panelId: PanelId,
  dims: CaseDimensions,
  explodeAmount: number
): { position: [number, number, number]; rotation: [number, number, number] } {
  const {
    length: L,
    width: W,
    height: H,
    thickness: t,
    dividerX,
    middleTrayY,
    legHeight: legH,
    wiringDepth: wDepth,
  } = dims;

  const halfL = L / 2;
  const halfW = W / 2;
  const wallH = H - t;
  const e = explodeAmount;

  const divCenterX = -halfL + dividerX;
  const rightInnerStart = divCenterX + t / 2;
  const rightInnerEnd = halfL - t;
  const middleCenterX = (rightInnerStart + rightInnerEnd) / 2;

  switch (panelId) {
    case 'bottom':
      return {
        position: [0, legH + t / 2 - e * 0.35, 0],
        rotation: [-Math.PI / 2, 0, 0],
      };
    case 'filter-rail':
      return {
        position: [0, legH - t / 2 - e * 0.75, 0],
        rotation: [-Math.PI / 2, 0, 0],
      };
    case 'top':
      return {
        position: [0, legH + H - t / 2 + e, -wDepth / 2],
        rotation: [-Math.PI / 2, 0, 0],
      };
    case 'divider':
      return {
        position: [divCenterX, legH + H / 2, 0],
        rotation: [0, Math.PI / 2, 0],
      };
    case 'middle':
      return {
        position: [middleCenterX + e * 0.35, legH + middleTrayY, 0],
        rotation: [-Math.PI / 2, 0, 0],
      };
    case 'front-left': {
      const doorW = Math.max(40, dividerX - t - 1);
      return {
        position: [-halfL + t + doorW / 2, legH + wallH / 2, halfW - t / 2 + e],
        rotation: [0, 0, 0],
      };
    }
    case 'front-right': {
      const doorW = Math.max(40, L - dividerX - t - 1);
      return {
        position: [halfL - t - doorW / 2, legH + wallH / 2, halfW - t / 2 + e],
        rotation: [0, 0, 0],
      };
    }
    case 'back':
      return {
        position: [0, legH + wallH / 2, -halfW + t / 2 - e * 0.35],
        rotation: [0, Math.PI, 0],
      };
    case 'cable-comb':
      return {
        position: [0, legH + H * 0.52, -halfW - (wDepth - t) / 2 - e * 0.85],
        rotation: [-Math.PI / 2, 0, 0],
      };
    case 'rear-cover':
      return {
        position: [0, legH + wallH / 2, -halfW - wDepth + t / 2 - e * 1.4],
        rotation: [0, Math.PI, 0],
      };
    case 'right':
      return {
        position: [halfL - t / 2 + e, (wallH + legH) / 2, -wDepth / 2],
        rotation: [0, Math.PI / 2, 0],
      };
    case 'left':
      return {
        position: [-halfL + t / 2 - e, (wallH + legH) / 2, -wDepth / 2],
        rotation: [0, -Math.PI / 2, 0],
      };
  }
}
