import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Line, Circle, Group } from 'react-konva';
import type Konva from 'konva';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import {
  SCHEMATIC_NODES,
  SCHEMATIC_WIRES,
  SchematicNode,
} from '../../data/iotWiringData';
import { computeEffectiveIoTState } from '../../utils/iotSimulation';
import { WireCategory } from '../../types/cad';

const CANVAS_W = 1290;
const CANVAS_H = 770;

function getPinAbsPos(node: SchematicNode, pinName: string): { x: number; y: number } {
  const pin = node.pins.find((p) => p.name === pinName) ?? node.pins[0];
  if (!pin) return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  switch (pin.side) {
    case 'left':
      return { x: node.x, y: node.y + pin.offset };
    case 'right':
      return { x: node.x + node.width, y: node.y + pin.offset };
    case 'top':
      return { x: node.x + pin.offset, y: node.y };
    case 'bottom':
      return { x: node.x + pin.offset, y: node.y + node.height };
  }
}

export const WiringSchematic2D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 720, height: 520 });
  const [zoom, setZoom] = useState(0.65);
  const [pan, setPan] = useState({ x: 20, y: 20 });

  const iotSim = useCadStore((s) => s.iotSim);
  const doorLeftAngle = useCadStore((s) => s.doorLeftAngle);
  const doorRightAngle = useCadStore((s) => s.doorRightAngle);
  const ledColor = useCadStore((s) => s.ledColor);
  const updateIoTSim = useCadStore((s) => s.updateIoTSim);

  const effective = useMemo(
    () => computeEffectiveIoTState(iotSim, doorLeftAngle, doorRightAngle, ledColor),
    [iotSim, doorLeftAngle, doorRightAngle, ledColor]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, SchematicNode>();
    SCHEMATIC_NODES.forEach((n) => map.set(n.id, n));
    return map;
  }, []);

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

  const fitToView = () => {
    const pad = 28;
    const scaleX = (stageSize.width - pad * 2) / CANVAS_W;
    const scaleY = (stageSize.height - pad * 2) / CANVAS_H;
    const nextZoom = Math.min(Math.max(0.32, Math.min(scaleX, scaleY)), 1.5);
    setZoom(nextZoom);
    setPan({
      x: (stageSize.width - CANVAS_W * nextZoom) / 2,
      y: (stageSize.height - CANVAS_H * nextZoom) / 2,
    });
  };

  useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.width, stageSize.height]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.12;
    const oldZoom = zoom;
    const newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
    const clamped = Math.min(Math.max(0.3, newZoom), 2.5);

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

  const getNodeLiveStatus = (id: string): { text: string; color: string } | null => {
    const t1 = iotSim.tempTier1 ?? iotSim.tempPc;
    const t2 = iotSim.tempTier2 ?? iotSim.tempLapTop;
    const t3 = iotSim.tempTier3 ?? iotSim.tempLapBot;
    const isDoorL = effective.doorLeftOpen ?? effective.doorPcOpen;
    const isDoorR = effective.doorRightOpen ?? effective.doorLapOpen;
    const r1 = effective.relayTier1On ?? effective.relayPcOn;
    const r2 = effective.relayTier2On ?? effective.relayLapTopOn;
    const r3 = effective.relayTier3On ?? effective.relayLapBotOn;

    switch (id) {
      case 'dht-pc':
        return { text: `${t1}°C`, color: t1 >= 55 ? '#f43f5e' : '#10b981' };
      case 'dht-lap-top':
        return {
          text: `${t2}°C`,
          color: t2 >= 55 ? '#f43f5e' : '#10b981',
        };
      case 'dht-lap-bot':
        return {
          text: `${t3}°C`,
          color: t3 >= 55 ? '#f43f5e' : '#10b981',
        };
      case 'mq2-smoke':
        return {
          text: effective.smokeAlarm ? `FIRE ${iotSim.smokePpm}ppm` : `${iotSim.smokePpm} ppm`,
          color: effective.smokeAlarm ? '#ef4444' : '#34d399',
        };
      case 'door-pc':
        return {
          text: isDoorL ? 'OPEN!' : 'CLOSED',
          color: isDoorL ? '#fbbf24' : '#34d399',
        };
      case 'door-lap':
        return {
          text: isDoorR ? 'OPEN!' : 'CLOSED',
          color: isDoorR ? '#fbbf24' : '#34d399',
        };
      case 'fan-pc':
        return { text: r1 ? 'ON (12V)' : 'OFF', color: r1 ? '#38bdf8' : '#64748b' };
      case 'fan-lap-top':
        return { text: r2 ? 'ON (12V)' : 'OFF', color: r2 ? '#38bdf8' : '#64748b' };
      case 'fan-lap-bot':
        return { text: r3 ? 'ON (12V)' : 'OFF', color: r3 ? '#38bdf8' : '#64748b' };
      case 'fan-iot':
        return { text: effective.relayIotOn ? 'ON (5V)' : 'OFF', color: effective.relayIotOn ? '#fb923c' : '#64748b' };
      case 'buzzer-5v':
        return { text: effective.buzzerActive ? 'ALARM!' : 'STANDBY', color: effective.buzzerActive ? '#ef4444' : '#64748b' };
      case 'ws2812b':
        return { text: effective.smokeAlarm ? 'RED ALERT' : 'ACTIVE', color: effective.effectiveLedColor };
      default:
        return null;
    }
  };

  const filterButtons: Array<{ id: WireCategory; label: string }> = [
    { id: 'all', label: 'Semua' },
    { id: 'power', label: 'Power' },
    { id: 'sensors', label: 'Sensor & Safety' },
    { id: 'relays', label: 'Relay & Kipas' },
    { id: 'ui', label: 'OLED/LED/Buz' },
  ];

  const selectedId = iotSim.selectedNodeId;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
    >
      {/* Top-Left Filter Pills */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1 bg-slate-900/92 border border-slate-700/80 rounded-lg p-1 backdrop-blur-sm">
        {filterButtons.map((fb) => (
          <button
            key={fb.id}
            onClick={() => updateIoTSim({ wireFilter: fb.id })}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              iotSim.wireFilter === fb.id
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Top-Right Zoom Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-sm">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
          title="Zoom In"
          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.15))}
          title="Zoom Out"
          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={fitToView}
          title="Fit Schematic"
          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-[10px] font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-3 px-2.5 py-1 rounded bg-slate-900/85 border border-slate-800">
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-red-500" />12V</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-orange-500" />5V</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-slate-500" />GND</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-emerald-500" />DHT22</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-rose-500" />MQ-2</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-amber-400" />MC-38</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-purple-500" />Relay</span>
          <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-1 bg-sky-400" />I2C/LED</span>
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-900/85 border border-slate-800">
          Klik modul untuk sorot jalur kabel • Scroll zoom • Drag pan
        </div>
      </div>

      <Stage
        width={stageSize.width}
        height={stageSize.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable
        onWheel={handleWheel}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setPan({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            updateIoTSim({ selectedNodeId: null });
          }
        }}
      >
        <Layer>
          {/* Blueprint background grid */}
          {Array.from({ length: 34 }).map((_, i) => (
            <Line
              key={`vx-${i}`}
              points={[i * 40, 0, i * 40, CANVAS_H]}
              stroke="#0f172a"
              strokeWidth={1 / zoom}
              listening={false}
            />
          ))}
          {Array.from({ length: 21 }).map((_, i) => (
            <Line
              key={`hy-${i}`}
              points={[0, i * 40, CANVAS_W, i * 40]}
              stroke="#0f172a"
              strokeWidth={1 / zoom}
              listening={false}
            />
          ))}

          {/* Orthogonal Routed Schematic Wires */}
          {SCHEMATIC_WIRES.map((wire) => {
            const fromNode = nodeMap.get(wire.fromNode);
            const toNode = nodeMap.get(wire.toNode);
            if (!fromNode || !toNode) return null;

            const matchesFilter =
              iotSim.wireFilter === 'all' || wire.category === iotSim.wireFilter;
            const connectedToSelected =
              !selectedId || wire.fromNode === selectedId || wire.toNode === selectedId;
            const highlighted = matchesFilter && connectedToSelected;

            const p1 = getPinAbsPos(fromNode, wire.fromPin);
            const p2 = getPinAbsPos(toNode, wire.toPin);
            const midX = wire.midX ?? (p1.x + p2.x) / 2;

            // Handle special left-to-left loop (adaptor +12V -> buck IN+ 12V)
            const points =
              wire.id === 'w-12v-buck'
                ? [p1.x, p1.y, p1.x + 14, p1.y, p1.x + 14, p1.y + 44, 16, p1.y + 44, 16, p2.y, p2.x, p2.y]
                : [p1.x, p1.y, midX, p1.y, midX, p2.y, p2.x, p2.y];

            return (
              <Group key={wire.id} listening={false}>
                <Line
                  points={points}
                  stroke={wire.color}
                  strokeWidth={highlighted ? 2.8 : 1.4}
                  opacity={highlighted ? 0.95 : 0.14}
                  dash={wire.dashed ? [7, 5] : undefined}
                  lineJoin="round"
                  lineCap="round"
                />
                {highlighted && (
                  <>
                    <Circle x={p1.x} y={p1.y} radius={3.5} fill={wire.color} />
                    <Circle x={p2.x} y={p2.y} radius={3.5} fill={wire.color} />
                  </>
                )}
              </Group>
            );
          })}

          {/* Electronic Component Nodes */}
          {SCHEMATIC_NODES.map((node) => {
            const isSelected = selectedId === node.id;
            const live = getNodeLiveStatus(node.id);
            const isEsp = node.id === 'esp32';
            const isRelay = node.id === 'relay-4ch';

            return (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                onClick={(e) => {
                  e.cancelBubble = true;
                  updateIoTSim({ selectedNodeId: node.id });
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  updateIoTSim({ selectedNodeId: node.id });
                }}
              >
                {/* Card Base */}
                <Rect
                  width={node.width}
                  height={node.height}
                  cornerRadius={10}
                  fill={isEsp ? '#0c192c' : '#0f172a'}
                  stroke={isSelected ? '#facc15' : node.accentColor}
                  strokeWidth={isSelected ? 2.6 : 1.4}
                  shadowColor={isSelected ? '#facc15' : node.accentColor}
                  shadowBlur={isSelected ? 14 : 4}
                  shadowOpacity={isSelected ? 0.45 : 0.18}
                />

                {/* Top Header Strip */}
                <Rect
                  width={node.width}
                  height={24}
                  cornerRadius={[10, 10, 0, 0]}
                  fill="rgba(30, 41, 59, 0.92)"
                />
                <Text
                  x={10}
                  y={6}
                  text={node.badge}
                  fontSize={10}
                  fontStyle="bold"
                  fontFamily="monospace"
                  fill={node.accentColor}
                />
                {live && (
                  <Text
                    x={node.width - 102}
                    y={6}
                    width={92}
                    align="right"
                    text={live.text}
                    fontSize={10}
                    fontStyle="bold"
                    fontFamily="monospace"
                    fill={live.color}
                  />
                )}

                {/* Title & Subtitle */}
                <Text
                  x={10}
                  y={30}
                  width={node.width - 20}
                  text={node.title}
                  fontSize={isEsp ? 14 : 12}
                  fontStyle="bold"
                  fill="#f8fafc"
                />
                <Text
                  x={10}
                  y={isEsp ? 48 : 46}
                  width={node.width - 20}
                  text={node.subtitle}
                  fontSize={9.5}
                  fill="#94a3b8"
                />

                {/* Special Center Graphic for ESP32 38-Pin DevKitC */}
                {isEsp && (
                  <Group x={node.width / 2 - 42} y={88}>
                    <Rect
                      width={84}
                      height={415}
                      cornerRadius={6}
                      fill="#132238"
                      stroke="#1e3a5f"
                      strokeWidth={1.2}
                    />
                    {/* Silver ESP-WROOM-32 Metal RF Shield */}
                    <Rect
                      x={14}
                      y={24}
                      width={56}
                      height={74}
                      cornerRadius={4}
                      fill="#334155"
                      stroke="#64748b"
                    />
                    <Text
                      x={14}
                      y={50}
                      width={56}
                      align="center"
                      text={'ESP-WROOM\n32 WiFi'}
                      fontSize={9}
                      fontFamily="monospace"
                      fontStyle="bold"
                      fill="#cbd5e1"
                    />
                    <Text
                      x={8}
                      y={165}
                      width={68}
                      align="center"
                      text={'38-PIN\nSCREW\nTERMINAL\nBOARD'}
                      fontSize={10}
                      fontFamily="monospace"
                      fill="#38bdf8"
                    />
                    {/* USB Port at bottom */}
                    <Rect x={26} y={392} width={32} height={18} cornerRadius={3} fill="#475569" />
                  </Group>
                )}

                {/* Live 4-Channel LED Indicators inside Relay 4-Ch block */}
                {isRelay && (
                  <Group x={88} y={66}>
                    {[
                      { label: 'CH1', on: effective.relayPcOn },
                      { label: 'CH2', on: effective.relayLapTopOn },
                      { label: 'CH3', on: effective.relayLapBotOn },
                      { label: 'CH4', on: effective.relayIotOn },
                    ].map((ch, idx) => (
                      <Group key={ch.label} y={idx * 50}>
                        <Rect
                          width={46}
                          height={34}
                          cornerRadius={4}
                          fill="#1d4ed8"
                          stroke="#60a5fa"
                          strokeWidth={1}
                        />
                        <Circle
                          x={23}
                          y={11}
                          radius={4}
                          fill={ch.on ? '#22c55e' : '#334155'}
                          shadowColor="#22c55e"
                          shadowBlur={ch.on ? 8 : 0}
                        />
                        <Text
                          x={0}
                          y={20}
                          width={46}
                          align="center"
                          text={ch.on ? 'ON' : 'OFF'}
                          fontSize={8.5}
                          fontFamily="monospace"
                          fontStyle="bold"
                          fill="#f8fafc"
                        />
                      </Group>
                    ))}
                  </Group>
                )}

                {/* Pin Dots & Pin Labels */}
                {node.pins.map((pin) => {
                  const px = pin.side === 'left' ? 0 : node.width;
                  const py = pin.offset;
                  const labelX = pin.side === 'left' ? 8 : node.width - 82;
                  return (
                    <Group key={pin.name}>
                      <Circle
                        x={px}
                        y={py}
                        radius={4}
                        fill="#020617"
                        stroke={pin.color}
                        strokeWidth={1.8}
                      />
                      {(isEsp || isRelay || node.pins.length > 1) && (
                        <Text
                          x={labelX}
                          y={py - 5}
                          width={74}
                          align={pin.side === 'left' ? 'left' : 'right'}
                          text={pin.name}
                          fontSize={8.5}
                          fontFamily="monospace"
                          fill="#cbd5e1"
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};
