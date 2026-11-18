import { AcrylicPanel, PanelHole, PanelId } from '../types/cad';

function renderHoleSvg(hole: PanelHole, offsetX: number, offsetY: number): string {
  const cx = (hole.x + offsetX).toFixed(3);
  const cy = (hole.y + offsetY).toFixed(3);

  if (hole.type === 'm3') {
    const r = ((hole.diameter ?? 3) / 2).toFixed(3);
    return `    <circle cx="${cx}" cy="${cy}" r="${r}" />`;
  }

  if (hole.type === 'fan120' || hole.type === 'fan140') {
    const is140 = hole.type === 'fan140';
    const defaultDia = is140 ? 135 : 115;
    const pitchHalf = is140 ? 62.25 : 52.5;
    const mainR = ((hole.diameter ?? defaultDia) / 2).toFixed(3);
    const lines = [`    <circle cx="${cx}" cy="${cy}" r="${mainR}" />`];
    if (hole.includeMountHoles !== false) {
      const mountR = '2.250'; // 4.5mm M4 mounting hole
      const offsets = [
        [-pitchHalf, -pitchHalf],
        [pitchHalf, -pitchHalf],
        [pitchHalf, pitchHalf],
        [-pitchHalf, pitchHalf],
      ];
      for (const [ox, oy] of offsets) {
        const mx = (hole.x + offsetX + ox).toFixed(3);
        const my = (hole.y + offsetY + oy).toFixed(3);
        lines.push(`    <circle cx="${mx}" cy="${my}" r="${mountR}" />`);
      }
    }
    return lines.join('\n');
  }

  // Rectangular vent / cable slot
  const w = hole.width ?? 60;
  const h = hole.height ?? 24;
  const rx = hole.cornerRadius ?? 4;
  const x = (hole.x + offsetX - w / 2).toFixed(3);
  const y = (hole.y + offsetY - h / 2).toFixed(3);
  return `    <rect x="${x}" y="${y}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" rx="${rx.toFixed(3)}" ry="${rx.toFixed(3)}" />`;
}

function renderPanelGroupSvg(panel: AcrylicPanel, offsetX: number, offsetY: number): string {
  const pts = panel.outline
    .map((p) => `${(p.x + offsetX).toFixed(3)},${(p.y + offsetY).toFixed(3)}`)
    .join(' ');

  const holesSvg = panel.holes.map((h) => renderHoleSvg(h, offsetX, offsetY)).join('\n');

  return `  <g id="panel-${panel.id}">
    <!-- Outer Cut Contour (${panel.width}mm x ${panel.height}mm) -->
    <polygon points="${pts}" />
    <!-- Cutouts (${panel.holes.length}) -->
${holesSvg}
  </g>
  <g id="engrave-${panel.id}" fill="#0066ff" stroke="none" font-family="monospace" font-size="6">
    <text x="${(offsetX + 6).toFixed(2)}" y="${(offsetY - 3).toFixed(2)}">${panel.name} (${panel.width}x${panel.height}mm)</text>
  </g>`;
}

/**
 * Generates a 1:1 millimeter precision SVG string for a single acrylic panel.
 * Red hairline (#ff0000, 0.1mm) = Laser Cut path, Blue = Optional Engrave label.
 */
export function generateSinglePanelSvg(panel: AcrylicPanel): string {
  const margin = 12;
  const totalW = panel.width + margin * 2;
  const totalH = panel.height + margin * 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${totalW.toFixed(2)}mm"
     height="${totalH.toFixed(2)}mm"
     viewBox="0 0 ${totalW.toFixed(2)} ${totalH.toFixed(2)}">
  <!-- Vertex CAD Laser Cut Export | Scale 1:1 mm | Stroke #ff0000 = CUT -->
  <g fill="none" stroke="#ff0000" stroke-width="0.1">
${renderPanelGroupSvg(panel, margin, margin)}
  </g>
</svg>`;
}

/**
 * Generates a 1:1 millimeter precision SVG sheet nesting all enabled panels side-by-side
 * in a clean 2-column laser cutter layout.
 */
export function generateAllPanelsSvg(panels: Record<PanelId, AcrylicPanel>): string {
  const enabledPanels = (Object.values(panels) as AcrylicPanel[]).filter((p) => p.enabled);
  const gap = 18;
  const margin = 16;
  const cols = 2;

  let cursorX = margin;
  let cursorY = margin + 8;
  let rowMaxH = 0;
  let sheetW = 0;
  let sheetH = 0;

  const groups: string[] = [];

  enabledPanels.forEach((panel, idx) => {
    const col = idx % cols;
    if (col === 0 && idx > 0) {
      cursorX = margin;
      cursorY += rowMaxH + gap + 8;
      rowMaxH = 0;
    }

    groups.push(renderPanelGroupSvg(panel, cursorX, cursorY));

    sheetW = Math.max(sheetW, cursorX + panel.width + margin);
    rowMaxH = Math.max(rowMaxH, panel.height);
    sheetH = Math.max(sheetH, cursorY + rowMaxH + margin);
    cursorX += panel.width + gap;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${sheetW.toFixed(2)}mm"
     height="${sheetH.toFixed(2)}mm"
     viewBox="0 0 ${sheetW.toFixed(2)} ${sheetH.toFixed(2)}">
  <!-- Vertex CAD Full Case Laser Cut Sheet | Scale 1:1 mm | Stroke #ff0000 = CUT -->
  <g fill="none" stroke="#ff0000" stroke-width="0.1">
${groups.join('\n')}
  </g>
</svg>`;
}

export function downloadSvgFile(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
