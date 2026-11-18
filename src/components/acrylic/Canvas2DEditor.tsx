import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Group, Text } from 'react-konva';
import type Konva from 'konva';
import { Maximize2, ZoomIn, ZoomOut, Magnet, Trash2 } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { PanelHole } from '../../types/cad';

export const Canvas2DEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 640, height: 480 });
  const [zoom, setZoom] = useState(1.4); // pixels per mm
  const [pan, setPan] = useState({ x: 80, y: 80 });
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);

  const activePanelId = useCadStore((s) => s.activePanelId);
  const panel = useCadStore((s) => s.panels[s.activePanelId]);
  const selectedHoleId = useCadStore((s) => s.selectedHoleId);
  const gridSize = useCadStore((s) => s.gridSize);
  const snapToGrid = useCadStore((s) => s.snapToGrid);

  const setSelectedHoleId = useCadStore((s) => s.setSelectedHoleId);
  const setSnapToGrid = useCadStore((s) => s.setSnapToGrid);
  const updateHole = useCadStore((s) => s.updateHole);
  const deleteHole = useCadStore((s) => s.deleteHole);

  // Measure container dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setStageSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit panel to viewport when switching panels or resizing significantly
  const fitToView = () => {
    const pad = 90;
    const availW = Math.max(120, stageSize.width - pad * 2);
    const availH = Math.max(120, stageSize.height - pad * 2);
    const scaleX = availW / panel.width;
    const scaleY = availH / panel.height;
    const nextZoom = Math.min(Math.max(0.5, Math.min(scaleX, scaleY)), 4);
    setZoom(nextZoom);
    setPan({
      x: (stageSize.width - panel.width * nextZoom) / 2,
      y: (stageSize.height - panel.height * nextZoom) / 2,
    });
  };

  useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanelId, panel.width, panel.height, stageSize.width > 0]);

  // Keyboard shortcut: Delete selected hole
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedHoleId &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        deleteHole(activePanelId, selectedHoleId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedHoleId, activePanelId, deleteHole]);

  const snapValue = (val: number) => {
    if (!snapToGrid) return Math.round(val * 10) / 10;
    return Math.round(val / gridSize) * gridSize;
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.12;
    const oldZoom = zoom;
    const newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
    const clamped = Math.min(Math.max(0.4, newZoom), 8);

    const mousePointTo = {
      x: (pointer.x - pan.x) / oldZoom,
      y: (pointer.y - pan.y) / oldZoom,
    };

    setZoom(clamped);
    setPan({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    });
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mmX = (pointer.x - pan.x) / zoom;
    const mmY = (pointer.y - pan.y) / zoom;
    setCursorMm({ x: Math.round(mmX * 10) / 10, y: Math.round(mmY * 10) / 10 });
  };

  // Precompute grid lines within the panel area (plus small outer margin)
  const gridLines = useMemo(() => {
    const step = Math.max(1, gridSize);
    const margin = 40;
    const minX = -margin;
    const maxX = panel.width + margin;
    const minY = -margin;
    const maxY = panel.height + margin;

    const verticals: Array<{ x: number; major: boolean }> = [];
    const horizontals: Array<{ y: number; major: boolean }> = [];

    for (let x = Math.floor(minX / step) * step; x <= maxX; x += step) {
      verticals.push({ x, major: x % 50 === 0 });
    }
    for (let y = Math.floor(minY / step) * step; y <= maxY; y += step) {
      horizontals.push({ y, major: y % 50 === 0 });
    }

    return { verticals, horizontals, minX, maxX, minY, maxY };
  }, [panel.width, panel.height, gridSize]);

  const outlinePoints = useMemo(
    () => panel.outline.flatMap((p) => [p.x, p.y]),
    [panel.outline]
  );

  const handleDragHole = (hole: PanelHole, e: Konva.KonvaEventObject<DragEvent>) => {
    const rawX = e.target.x();
    const rawY = e.target.y();
    const snappedX = Math.min(Math.max(2, snapValue(rawX)), panel.width - 2);
    const snappedY = Math.min(Math.max(2, snapValue(rawY)), panel.height - 2);
    e.target.x(snappedX);
    e.target.y(snappedY);
    updateHole(activePanelId, hole.id, { x: snappedX, y: snappedY });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
    >
      {/* Top-Left Canvas HUD */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-slate-100">2D Sketch</span>
          <span className="text-slate-400">•</span>
          <span className="text-sky-300 font-medium">{panel.name}</span>
          <span className="text-slate-400 font-mono">
            ({panel.width} × {panel.height} mm)
          </span>
        </div>
      </div>

      {/* Top-Right Zoom / Snap Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-sm">
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          title={`Snap to ${gridSize}mm Grid`}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
            snapToGrid
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap {gridSize}mm</span>
        </button>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        <button
          onClick={() => setZoom((z) => Math.min(8, z * 1.2))}
          title="Zoom In"
          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}
          title="Zoom Out"
          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={fitToView}
          title="Fit Panel to View"
          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {selectedHoleId && (
          <>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              onClick={() => deleteHole(activePanelId, selectedHoleId)}
              title="Hapus lubang terpilih (Del)"
              className="p-1.5 rounded text-rose-400 hover:bg-rose-500/20 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none text-[11px] font-mono text-slate-400">
        <div className="px-2.5 py-1 rounded bg-slate-900/85 border border-slate-800">
          {cursorMm
            ? `X: ${cursorMm.x.toFixed(1)} mm   Y: ${cursorMm.y.toFixed(1)} mm`
            : 'Hover kanvas untuk koordinat mm'}
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-900/85 border border-slate-800">
          Drag lubang untuk geser • Scroll zoom • Drag area kosong untuk pan
        </div>
      </div>

      {/* React-Konva Stage */}
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setPan({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onMouseDown={(e) => {
          // Deselect hole when clicking stage background or panel sheet
          const clickedId = e.target.name();
          if (!clickedId || clickedId === 'panel-sheet') {
            setSelectedHoleId(null);
          }
        }}
      >
        <Layer>
          {/* Millimeter Grid */}
          {gridLines.verticals.map((v) => (
            <Line
              key={`gv-${v.x}`}
              points={[v.x, gridLines.minY, v.x, gridLines.maxY]}
              stroke={v.major ? '#1e293b' : '#0f172a'}
              strokeWidth={(v.major ? 1.1 : 0.6) / zoom}
              listening={false}
            />
          ))}
          {gridLines.horizontals.map((h) => (
            <Line
              key={`gh-${h.y}`}
              points={[gridLines.minX, h.y, gridLines.maxX, h.y]}
              stroke={h.major ? '#1e293b' : '#0f172a'}
              strokeWidth={(h.major ? 1.1 : 0.6) / zoom}
              listening={false}
            />
          ))}

          {/* Acrylic Panel Outer Sheet */}
          <Line
            name="panel-sheet"
            points={outlinePoints}
            closed
            fill="rgba(160, 230, 255, 0.08)"
            stroke="#A0E6FF"
            strokeWidth={2 / zoom}
          />

          {/* Dimension Annotations (Top & Left) */}
          <Group listening={false}>
            <Line
              points={[0, -14 / zoom, panel.width, -14 / zoom]}
              stroke="#38bdf8"
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 3 / zoom]}
            />
            <Text
              x={0}
              y={-28 / zoom}
              width={panel.width}
              align="center"
              text={`${panel.width} mm`}
              fontSize={12 / zoom}
              fontFamily="monospace"
              fill="#7dd3fc"
            />
            <Line
              points={[-14 / zoom, 0, -14 / zoom, panel.height]}
              stroke="#38bdf8"
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 3 / zoom]}
            />
            <Text
              x={-28 / zoom}
              y={panel.height / 2 + 24 / zoom}
              rotation={-90}
              text={`${panel.height} mm`}
              fontSize={12 / zoom}
              fontFamily="monospace"
              fill="#7dd3fc"
            />
          </Group>

          {/* Interactive Cutout Holes */}
          {panel.holes.map((hole) => {
            const isSelected = hole.id === selectedHoleId;
            const strokeColor = isSelected ? '#facc15' : '#f43f5e'; // yellow selected, laser-red normal

            return (
              <Group
                key={hole.id}
                name="hole-item"
                x={hole.x}
                y={hole.y}
                draggable
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedHoleId(hole.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  setSelectedHoleId(hole.id);
                }}
                onDragStart={(e) => {
                  e.cancelBubble = true;
                  setSelectedHoleId(hole.id);
                }}
                onDragMove={(e) => {
                  e.cancelBubble = true;
                  handleDragHole(hole, e);
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  handleDragHole(hole, e);
                }}
              >
                {hole.type === 'm3' && (
                  <>
                    {/* Larger invisible hit area so 3mm screw holes are easy to drag */}
                    <Circle radius={Math.max(6 / zoom, 5)} fill="rgba(244, 63, 94, 0.08)" />
                    <Circle
                      radius={(hole.diameter ?? 3) / 2}
                      fill="#020617"
                      stroke={strokeColor}
                      strokeWidth={1.6 / zoom}
                    />
                    {/* Crosshair */}
                    <Line
                      points={[-4, 0, 4, 0]}
                      stroke={isSelected ? '#facc15' : '#94a3b8'}
                      strokeWidth={0.7 / zoom}
                      listening={false}
                    />
                    <Line
                      points={[0, -4, 0, 4]}
                      stroke={isSelected ? '#facc15' : '#94a3b8'}
                      strokeWidth={0.7 / zoom}
                      listening={false}
                    />
                  </>
                )}

                {(hole.type === 'fan120' || hole.type === 'fan140') && (() => {
                  const is140 = hole.type === 'fan140';
                  const frameSize = is140 ? 140 : 120;
                  const halfFrame = frameSize / 2;
                  const defaultDia = is140 ? 135 : 115;
                  const pitchHalf = is140 ? 62.25 : 52.5;
                  const actualDia = hole.diameter ?? defaultDia;

                  return (
                    <>
                      {/* Outer fan frame reference guide (120x120mm or 140x140mm) */}
                      <Rect
                        x={-halfFrame}
                        y={-halfFrame}
                        width={frameSize}
                        height={frameSize}
                        cornerRadius={6}
                        stroke={isSelected ? '#facc15' : is140 ? '#818cf8' : '#38bdf8'}
                        strokeWidth={1.1 / zoom}
                        dash={[4 / zoom, 4 / zoom]}
                        fill={is140 ? 'rgba(129, 140, 248, 0.05)' : 'rgba(56, 189, 248, 0.04)'}
                      />
                      {/* Main air cutout */}
                      <Circle
                        radius={actualDia / 2}
                        fill="#020617"
                        stroke={strokeColor}
                        strokeWidth={1.8 / zoom}
                      />
                      {/* 4x M4 mounting holes */}
                      {hole.includeMountHoles !== false &&
                        [
                          [-pitchHalf, -pitchHalf],
                          [pitchHalf, -pitchHalf],
                          [pitchHalf, pitchHalf],
                          [-pitchHalf, pitchHalf],
                        ].map(([ox, oy], idx) => (
                          <Circle
                            key={idx}
                            x={ox}
                            y={oy}
                            radius={2.25}
                            fill="#020617"
                            stroke={strokeColor}
                            strokeWidth={1.3 / zoom}
                          />
                        ))}
                      <Text
                        x={-halfFrame + 4}
                        y={-6 / zoom}
                        width={frameSize - 8}
                        align="center"
                        text={`FAN ${frameSize} (Ø${actualDia}mm)`}
                        fontSize={10 / zoom}
                        fontFamily="monospace"
                        fill={isSelected ? '#fde047' : '#94a3b8'}
                        listening={false}
                      />
                    </>
                  );
                })()}

                {hole.type === 'vent' && (
                  <>
                    <Rect
                      x={-(hole.width ?? 60) / 2}
                      y={-(hole.height ?? 24) / 2}
                      width={hole.width ?? 60}
                      height={hole.height ?? 24}
                      cornerRadius={hole.cornerRadius ?? 4}
                      fill="#020617"
                      stroke={strokeColor}
                      strokeWidth={1.8 / zoom}
                    />
                    <Text
                      x={-(hole.width ?? 60) / 2}
                      y={-5 / zoom}
                      width={hole.width ?? 60}
                      align="center"
                      text={`${hole.width ?? 60}×${hole.height ?? 24}`}
                      fontSize={9 / zoom}
                      fontFamily="monospace"
                      fill={isSelected ? '#fde047' : '#94a3b8'}
                      listening={false}
                    />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};
