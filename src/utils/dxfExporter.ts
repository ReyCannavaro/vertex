import { AcrylicPanel, PanelHole, PanelId, Point2D } from '../types/cad';

/**
 * Pure AutoCAD R12-compatible ASCII DXF generator (1 unit = 1 mm, $INSUNITS = 4).
 * Universally readable by CorelDRAW, AutoCAD, RDWorks, LightBurn, and LaserCAD without DPI scaling bugs.
 * Layer 'CUT' (ACI color 1 = Red) = laser cut paths.
 * Layer 'ENGRAVE' (ACI color 5 = Blue) = optional panel identification labels.
 */

function dxfLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  layer = 'CUT',
  color = 1
): string {
  return [
    '0',
    'LINE',
    '8',
    layer,
    '62',
    String(color),
    '10',
    x1.toFixed(4),
    '20',
    y1.toFixed(4),
    '30',
    '0.0',
    '11',
    x2.toFixed(4),
    '21',
    y2.toFixed(4),
    '31',
    '0.0',
  ].join('\n');
}

function dxfCircle(
  cx: number,
  cy: number,
  radius: number,
  layer = 'CUT',
  color = 1
): string {
  return [
    '0',
    'CIRCLE',
    '8',
    layer,
    '62',
    String(color),
    '10',
    cx.toFixed(4),
    '20',
    cy.toFixed(4),
    '30',
    '0.0',
    '40',
    radius.toFixed(4),
  ].join('\n');
}

function dxfArc(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  layer = 'CUT',
  color = 1
): string {
  return [
    '0',
    'ARC',
    '8',
    layer,
    '62',
    String(color),
    '10',
    cx.toFixed(4),
    '20',
    cy.toFixed(4),
    '30',
    '0.0',
    '40',
    radius.toFixed(4),
    '50',
    startDeg.toFixed(4),
    '51',
    endDeg.toFixed(4),
  ].join('\n');
}

function dxfText(
  x: number,
  y: number,
  text: string,
  height = 6,
  layer = 'ENGRAVE',
  color = 5
): string {
  return [
    '0',
    'TEXT',
    '8',
    layer,
    '62',
    String(color),
    '10',
    x.toFixed(4),
    '20',
    y.toFixed(4),
    '30',
    '0.0',
    '40',
    height.toFixed(2),
    '1',
    text.replace(/[\r\n]/g, ' '),
  ].join('\n');
}

function emitClosedPolygon(
  pts: Point2D[],
  offsetX: number,
  offsetY: number,
  sheetH: number
): string[] {
  const out: string[] = [];
  if (pts.length < 3) return out;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    // Flip Y into DXF Y-up coordinate space so shapes match Konva right-side-up
    const ax = a.x + offsetX;
    const ay = sheetH - (a.y + offsetY);
    const bx = b.x + offsetX;
    const by = sheetH - (b.y + offsetY);
    out.push(dxfLine(ax, ay, bx, by));
  }
  return out;
}

function emitRoundedRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  rRaw: number
): string[] {
  const r = Math.min(Math.max(0, rRaw), w / 2, h / 2);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;

  if (r < 0.2) {
    return [
      dxfLine(x0, y0, x1, y0),
      dxfLine(x1, y0, x1, y1),
      dxfLine(x1, y1, x0, y1),
      dxfLine(x0, y1, x0, y0),
    ];
  }

  return [
    // 4 straight edges
    dxfLine(x0 + r, y0, x1 - r, y0),
    dxfLine(x1, y0 + r, x1, y1 - r),
    dxfLine(x1 - r, y1, x0 + r, y1),
    dxfLine(x0, y1 - r, x0, y0 + r),
    // 4 rounded corner arcs (CCW degrees in DXF)
    dxfArc(x1 - r, y0 + r, r, 270, 360),
    dxfArc(x1 - r, y1 - r, r, 0, 90),
    dxfArc(x0 + r, y1 - r, r, 90, 180),
    dxfArc(x0 + r, y0 + r, r, 180, 270),
  ];
}

function emitHole(
  hole: PanelHole,
  offsetX: number,
  offsetY: number,
  sheetH: number
): string[] {
  const cx = hole.x + offsetX;
  const cy = sheetH - (hole.y + offsetY);

  if (hole.type === 'm3') {
    return [dxfCircle(cx, cy, (hole.diameter ?? 3.2) / 2)];
  }

  if (hole.type === 'fan120' || hole.type === 'fan140') {
    const is140 = hole.type === 'fan140';
    const mainR = (hole.diameter ?? (is140 ? 135 : 115)) / 2;
    const entities = [dxfCircle(cx, cy, mainR)];

    if (hole.includeMountHoles !== false) {
      const pitchHalf = is140 ? 62.25 : 52.5;
      const mountR = 2.25; // 4.5mm M4 clearance
      const offsets: [number, number][] = [
        [-pitchHalf, -pitchHalf],
        [pitchHalf, -pitchHalf],
        [pitchHalf, pitchHalf],
        [-pitchHalf, pitchHalf],
      ];
      for (const [ox, oy] of offsets) {
        entities.push(dxfCircle(cx + ox, cy + oy, mountR));
      }
    }
    return entities;
  }

  // Rectangular vent / cable cutout
  return emitRoundedRect(
    cx,
    cy,
    hole.width ?? 60,
    hole.height ?? 24,
    hole.cornerRadius ?? 4
  );
}

function wrapDxfDocument(entities: string[]): string {
  return [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$ACADVER',
    '1',
    'AC1009',
    '9',
    '$INSUNITS',
    '70',
    '4', // Millimeters
    '9',
    '$MEASUREMENT',
    '70',
    '1', // Metric
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'TABLES',
    '0',
    'TABLE',
    '2',
    'LAYER',
    '70',
    '2',
    '0',
    'LAYER',
    '2',
    'CUT',
    '70',
    '0',
    '62',
    '1',
    '6',
    'CONTINUOUS',
    '0',
    'LAYER',
    '2',
    'ENGRAVE',
    '70',
    '0',
    '62',
    '5',
    '6',
    'CONTINUOUS',
    '0',
    'ENDTAB',
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    ...entities,
    '0',
    'ENDSEC',
    '0',
    'EOF',
  ].join('\n');
}

export function generateSinglePanelDxf(panel: AcrylicPanel): string {
  const margin = 12;
  const totalH = panel.height + margin * 2;
  const entities: string[] = [
    ...emitClosedPolygon(panel.outline, margin, margin, totalH),
    ...panel.holes.flatMap((h) => emitHole(h, margin, margin, totalH)),
    dxfText(
      margin + 4,
      totalH - margin + 3,
      `${panel.name} (${panel.width}x${panel.height}mm)`
    ),
  ];
  return wrapDxfDocument(entities);
}

export function generateAllPanelsDxf(panels: Record<PanelId, AcrylicPanel>): string {
  const enabledPanels = (Object.values(panels) as AcrylicPanel[]).filter((p) => p.enabled);
  const gap = 20;
  const margin = 16;
  const cols = 2;

  // First pass: compute layout coordinates & total sheet height
  const placed: Array<{ panel: AcrylicPanel; x: number; y: number }> = [];
  let cursorX = margin;
  let cursorY = margin + 10;
  let rowMaxH = 0;
  let sheetH = 0;

  enabledPanels.forEach((panel, idx) => {
    const col = idx % cols;
    if (col === 0 && idx > 0) {
      cursorX = margin;
      cursorY += rowMaxH + gap + 10;
      rowMaxH = 0;
    }
    placed.push({ panel, x: cursorX, y: cursorY });
    rowMaxH = Math.max(rowMaxH, panel.height);
    sheetH = Math.max(sheetH, cursorY + rowMaxH + margin);
    cursorX += panel.width + gap;
  });

  // Second pass: emit DXF entities in Y-up metric space
  const entities: string[] = [];
  for (const item of placed) {
    entities.push(...emitClosedPolygon(item.panel.outline, item.x, item.y, sheetH));
    for (const h of item.panel.holes) {
      entities.push(...emitHole(h, item.x, item.y, sheetH));
    }
    entities.push(
      dxfText(
        item.x + 4,
        sheetH - item.y + 3,
        `${item.panel.name} (${item.panel.width}x${item.panel.height}mm)`
      )
    );
  }

  return wrapDxfDocument(entities);
}

export function downloadDxfFile(dxfContent: string, filename: string): void {
  const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
