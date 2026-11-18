import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

/**
 * Exports a Three.js BufferGeometry as a binary .STL file oriented Z-up for 3D slicers
 * (Cura, Bambu Studio, PrusaSlicer) with 1 unit = 1 mm.
 */
export function exportGeometryToStl(
  geometry: THREE.BufferGeometry,
  filename: string
): void {
  const exporter = new STLExporter();

  // Clone and rotate +90 deg around X so Three.js Y-up maps cleanly to Slicer Z-up
  const cloned = geometry.clone();
  cloned.rotateX(Math.PI / 2);

  // Shift so lowest Z sits cleanly on the print bed (z = 0)
  cloned.computeBoundingBox();
  if (cloned.boundingBox) {
    cloned.translate(0, 0, -cloned.boundingBox.min.z);
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
