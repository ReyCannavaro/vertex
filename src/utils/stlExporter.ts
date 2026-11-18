import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

/**
 * Exports a Three.js BufferGeometry as a binary .STL file oriented flat on Z = 0
 * for support-free 3D printing (Cura, Bambu Studio, PrusaSlicer) at 1 unit = 1 mm.
 *
 * Our rounded pod housing and front faceplate both lie in X-Y with walls/depth extruded along +Z,
 * so keeping Z-up and grounding min.z -> 0 places the flat rear wall / faceplate cleanly on the bed.
 */
export function exportGeometryToStl(
  geometry: THREE.BufferGeometry,
  filename: string
): void {
  const exporter = new STLExporter();

  const cloned = geometry.clone();
  cloned.computeBoundingBox();
  if (cloned.boundingBox) {
    const cx = (cloned.boundingBox.min.x + cloned.boundingBox.max.x) / 2;
    const cy = (cloned.boundingBox.min.y + cloned.boundingBox.max.y) / 2;
    cloned.translate(-cx, -cy, -cloned.boundingBox.min.z);
  }

  const mesh = new THREE.Mesh(cloned);
  const stlData = exporter.parse(mesh, { binary: true });

  const bytes = new Uint8Array(
    stlData.buffer as ArrayBuffer,
    stlData.byteOffset,
    stlData.byteLength
  );
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  cloned.dispose();
}
