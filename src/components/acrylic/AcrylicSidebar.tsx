import React, { useMemo } from 'react';
import {
  Cable,
  Calculator,
  CircleDot,
  Cpu,
  DoorOpen,
  Fan,
  Play,
  Square,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  RotateCcw,
  Box,
  Crosshair,
  Download,
  FileCode2,
} from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { PanelId, CableFilterCategory } from '../../types/cad';
import {
  downloadSvgFile,
  generateAllPanelsSvg,
  generateSinglePanelSvg,
} from '../../utils/svgExporter';
import {
  downloadDxfFile,
  generateAllPanelsDxf,
  generateSinglePanelDxf,
} from '../../utils/dxfExporter';
import { computeAcrylicEstimate } from '../../utils/acrylicEstimator';

const PANEL_ORDER: PanelId[] = [
  'front-left',
  'front-right',
  'left',
  'right',
  'bottom',
  'filter-rail',
  'middle',
  'middle-2',
  'top',
  'back',
  'cable-comb',
  'rear-floor',
  'rear-cover',
];

export const AcrylicSidebar: React.FC = () => {
  const caseDims = useCadStore((s) => s.caseDims);
  const panels = useCadStore((s) => s.panels);
  const activePanelId = useCadStore((s) => s.activePanelId);
  const selectedHoleId = useCadStore((s) => s.selectedHoleId);
  const gridSize = useCadStore((s) => s.gridSize);
  const dustFilterSlide = useCadStore((s) => s.dustFilterSlide);
  const doorLeftAngle = useCadStore((s) => s.doorLeftAngle);
  const doorRightAngle = useCadStore((s) => s.doorRightAngle);
  const showBrackets = useCadStore((s) => s.showBrackets);
  const showHardwareMockup = useCadStore((s) => s.showHardwareMockup);
  const showWiring = useCadStore((s) => s.showWiring);
  const cableFilter = useCadStore((s) => s.cableFilter);
  const ledEnabled = useCadStore((s) => s.ledEnabled);

  const setActivePanelId = useCadStore((s) => s.setActivePanelId);
  const setGridSize = useCadStore((s) => s.setGridSize);
  const setDustFilterSlide = useCadStore((s) => s.setDustFilterSlide);
  const setDoorLeftAngle = useCadStore((s) => s.setDoorLeftAngle);
  const setDoorRightAngle = useCadStore((s) => s.setDoorRightAngle);
  const toggleAllDoors = useCadStore((s) => s.toggleAllDoors);
  const toggleDemoMaintenance = useCadStore((s) => s.toggleDemoMaintenance);
  const setShowBrackets = useCadStore((s) => s.setShowBrackets);
  const setShowHardwareMockup = useCadStore((s) => s.setShowHardwareMockup);
  const setShowWiring = useCadStore((s) => s.setShowWiring);
  const setCableFilter = useCadStore((s) => s.setCableFilter);
  const setLedEnabled = useCadStore((s) => s.setLedEnabled);
  const updateCaseDims = useCadStore((s) => s.updateCaseDims);
  const togglePanelEnabled = useCadStore((s) => s.togglePanelEnabled);
  const addHoleToActivePanel = useCadStore((s) => s.addHoleToActivePanel);
  const updateHole = useCadStore((s) => s.updateHole);
  const deleteHole = useCadStore((s) => s.deleteHole);
  const autoPlaceCornerM3 = useCadStore((s) => s.autoPlaceCornerM3);
  const clearPanelHoles = useCadStore((s) => s.clearPanelHoles);
  const resetAcrylicCase = useCadStore((s) => s.resetAcrylicCase);

  const activePanel = panels[activePanelId];
  const selectedHole = activePanel.holes.find((h) => h.id === selectedHoleId) ?? null;

  const acrylicEstimate = useMemo(
    () => computeAcrylicEstimate(panels, caseDims),
    [panels, caseDims]
  );

  const handleExportCurrentPanelSvg = () => {
    const svg = generateSinglePanelSvg(activePanel);
    downloadSvgFile(svg, `vertex-acrylic-${activePanel.id}-${activePanel.width}x${activePanel.height}mm.svg`);
  };

  const handleExportAllPanelsSvg = () => {
    const svg = generateAllPanelsSvg(panels);
    downloadSvgFile(svg, `vertex-hybrid-datacenter-full-sheet-${caseDims.thickness}mm.svg`);
  };

  const handleExportCurrentPanelDxf = () => {
    const dxf = generateSinglePanelDxf(activePanel);
    downloadDxfFile(dxf, `vertex-acrylic-${activePanel.id}-${activePanel.width}x${activePanel.height}mm.dxf`);
  };

  const handleExportAllPanelsDxf = () => {
    const dxf = generateAllPanelsDxf(panels);
    downloadDxfFile(dxf, `vertex-hybrid-datacenter-full-sheet-${caseDims.thickness}mm.dxf`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-5 text-xs">
      {/* Section 1: Master Case Dimensions */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Dimensi Master Case (mm)
          </h3>
          <button
            onClick={resetAcrylicCase}
            title="Reset Default Case"
            className="text-slate-500 hover:text-sky-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400">Panjang (X)</span>
            <input
              type="number"
              min={150}
              max={950}
              step={5}
              value={caseDims.length}
              onChange={(e) =>
                updateCaseDims({ length: Math.max(150, Number(e.target.value) || 150) })
              }
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400">Lebar (Z)</span>
            <input
              type="number"
              min={150}
              max={500}
              step={5}
              value={caseDims.width}
              onChange={(e) =>
                updateCaseDims({ width: Math.max(150, Number(e.target.value) || 150) })
              }
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400">Tinggi (Y)</span>
            <input
              type="number"
              min={100}
              max={450}
              step={5}
              value={caseDims.height}
              onChange={(e) =>
                updateCaseDims({ height: Math.max(100, Number(e.target.value) || 100) })
              }
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </label>
        </div>

        {/* Acrylic Sheet Thickness Toggle (3mm / 5mm) */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-slate-400">Tebal Akrilik</span>
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            {([3, 5] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateCaseDims({ thickness: t })}
                className={`px-3 py-1 font-mono font-medium transition ${
                  caseDims.thickness === t
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {t}mm
              </button>
            ))}
          </div>
        </div>

        {/* Middle Shelf 1 (Tier 2) Height Slider */}
        {panels.middle?.enabled && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tinggi Rak Tengah / Tier 2 (Y)</span>
              <span className="font-mono text-sky-300">{caseDims.shelf1Y} mm</span>
            </div>
            <input
              type="range"
              min={caseDims.thickness + 60}
              max={caseDims.shelf2Y - 50}
              step={5}
              value={caseDims.shelf1Y}
              onChange={(e) => updateCaseDims({ shelf1Y: Number(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
        )}

        {/* Middle Shelf 2 (Tier 3) Height Slider */}
        {panels['middle-2']?.enabled && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tinggi Rak Atas / Tier 3 (Y)</span>
              <span className="font-mono text-sky-300">{caseDims.shelf2Y} mm</span>
            </div>
            <input
              type="range"
              min={caseDims.shelf1Y + 50}
              max={caseDims.height - caseDims.thickness - 60}
              step={5}
              value={caseDims.shelf2Y}
              onChange={(e) => updateCaseDims({ shelf2Y: Number(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
        )}

        {/* Integrated Acrylic Leg Height */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Tinggi Kaki Akrilik (Kiri/Kanan)</span>
            <span className="font-mono text-sky-300">{caseDims.legHeight} mm</span>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={2}
            value={caseDims.legHeight}
            onChange={(e) => updateCaseDims({ legHeight: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Rear Wiring Chamber Depth */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Kedalaman Ruang Wiring Belakang</span>
            <span className="font-mono text-sky-300">{caseDims.wiringDepth} mm</span>
          </div>
          <input
            type="range"
            min={28}
            max={80}
            step={2}
            value={caseDims.wiringDepth}
            onChange={(e) => updateCaseDims({ wiringDepth: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Interactive Dust Filter Slide Out */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Tarik Dust Filter Bawah (3D)</span>
            <span className="font-mono text-amber-300">{dustFilterSlide} mm</span>
          </div>
          <input
            type="range"
            min={0}
            max={220}
            step={5}
            value={dustFilterSlide}
            onChange={(e) => setDustFilterSlide(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 1B: Smooth Hinged Front Doors (Demo & Maintenance Access) */}
      <section className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Bukaan Pintu Depan (Engsel Kupu-Kupu)
        </h3>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={toggleAllDoors}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-200 font-medium transition"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>{doorLeftAngle > 10 || doorRightAngle > 10 ? 'Tutup Pintu' : 'Buka Pintu'}</span>
          </button>
          <button
            onClick={toggleDemoMaintenance}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 font-medium transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Demo Akses</span>
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Pintu Kiri (Engsel Kiri)</span>
            <span className="font-mono text-sky-300">{doorLeftAngle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={135}
            step={1}
            value={doorLeftAngle}
            onChange={(e) => setDoorLeftAngle(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Pintu Kanan (Engsel Kanan)</span>
            <span className="font-mono text-sky-300">{doorRightAngle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={135}
            step={1}
            value={doorRightAngle}
            onChange={(e) => setDoorRightAngle(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 2: Panel Selector for 2D Editing & 3D Assembly */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Daftar Lembaran Akrilik ({PANEL_ORDER.filter((id) => panels[id].enabled).length} Aktif)
        </h3>
        <div className="space-y-1">
          {PANEL_ORDER.map((id) => {
            const p = panels[id];
            const isActive = id === activePanelId;
            return (
              <div
                key={id}
                onClick={() => setActivePanelId(id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg border cursor-pointer transition ${
                  isActive
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-100'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    <span>{p.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {p.width}×{p.height}mm • {p.holes.length} lubang
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePanelEnabled(id);
                  }}
                  title={p.enabled ? 'Sembunyikan panel di 3D' : 'Tampilkan panel di 3D'}
                  className={`p-1 rounded transition ${
                    p.enabled
                      ? 'text-slate-400 hover:text-sky-300'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {p.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 3: Add Cutout Components to Active 2D Panel */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Tambah Lubang (Cutout)
          </h3>
          <button
            onClick={() => clearPanelHoles(activePanelId)}
            className="text-[10px] text-slate-500 hover:text-rose-400 transition"
          >
            Hapus Semua
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          <button
            onClick={() => addHoleToActivePanel('m3')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition text-left"
          >
            <CircleDot className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="font-medium">Lubang Baut M3</div>
              <div className="text-[10px] text-slate-400">Diameter Ø3mm (sudut/tepi)</div>
            </div>
          </button>

          <button
            onClick={() => addHoleToActivePanel('fan120')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition text-left"
          >
            <Fan className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="font-medium">Kipas 120mm (Laptop Bay)</div>
              <div className="text-[10px] text-slate-400">Lubang Ø115mm + 4× M4 (105mm)</div>
            </div>
          </button>

          <button
            onClick={() => addHoleToActivePanel('fan140')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition text-left"
          >
            <Fan className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="font-medium">Kipas 140mm (PC Bay Besar)</div>
              <div className="text-[10px] text-slate-400">Lubang Ø135mm + 4× M4 (124.5mm)</div>
            </div>
          </button>

          <button
            onClick={() => addHoleToActivePanel('vent')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition text-left"
          >
            <Square className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-medium">Ventilasi / Slot Kabel</div>
              <div className="text-[10px] text-slate-400">Persegi panjang (custom W×H)</div>
            </div>
          </button>

          <button
            onClick={() => autoPlaceCornerM3(activePanelId, 12)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-medium transition"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Auto 4× Sudut M3 (Margin 12mm)</span>
          </button>
        </div>
      </section>

      {/* Section 4: Selected Cutout Precision Inspector */}
      {selectedHole && (
        <>
          <div className="border-t border-slate-800" />
          <section className="space-y-2.5 p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-300 truncate">
                Edit: {selectedHole.label}
              </span>
              <button
                onClick={() => deleteHole(activePanelId, selectedHole.id)}
                className="text-rose-400 hover:text-rose-300 p-0.5"
                title="Hapus lubang ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[10px] text-slate-400">Posisi X (mm)</span>
                <input
                  type="number"
                  step={1}
                  value={selectedHole.x}
                  onChange={(e) =>
                    updateHole(activePanelId, selectedHole.id, {
                      x: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-400">Posisi Y (mm)</span>
                <input
                  type="number"
                  step={1}
                  value={selectedHole.y}
                  onChange={(e) =>
                    updateHole(activePanelId, selectedHole.id, {
                      y: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                />
              </label>
            </div>

            {selectedHole.type === 'vent' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400">Lebar (mm)</span>
                  <input
                    type="number"
                    min={4}
                    value={selectedHole.width ?? 60}
                    onChange={(e) =>
                      updateHole(activePanelId, selectedHole.id, {
                        width: Math.max(4, Number(e.target.value) || 4),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400">Tinggi (mm)</span>
                  <input
                    type="number"
                    min={4}
                    value={selectedHole.height ?? 24}
                    onChange={(e) =>
                      updateHole(activePanelId, selectedHole.id, {
                        height: Math.max(4, Number(e.target.value) || 4),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                  />
                </label>
              </div>
            )}

            {(selectedHole.type === 'm3' ||
              selectedHole.type === 'fan120' ||
              selectedHole.type === 'fan140') && (
              <label className="block space-y-1">
                <span className="text-[10px] text-slate-400">Diameter Lubang (mm)</span>
                <input
                  type="number"
                  min={2}
                  step={0.5}
                  value={
                    selectedHole.diameter ??
                    (selectedHole.type === 'm3'
                      ? 3
                      : selectedHole.type === 'fan140'
                        ? 135
                        : 115)
                  }
                  onChange={(e) =>
                    updateHole(activePanelId, selectedHole.id, {
                      diameter: Math.max(2, Number(e.target.value) || 3),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                />
              </label>
            )}
          </section>
        </>
      )}

      <div className="border-t border-slate-800" />

      {/* Section 5: Grid & 3D Assembly Display Options */}
      <section className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Opsi Grid & Visual 3D
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Grid Snap Step</span>
          <div className="flex rounded overflow-hidden border border-slate-700">
            {[1, 5, 10].map((step) => (
              <button
                key={step}
                onClick={() => setGridSize(step)}
                className={`px-2 py-0.5 font-mono transition ${
                  gridSize === step
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {step}mm
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between cursor-pointer py-0.5">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Box className="w-3.5 h-3.5 text-slate-400" />
            Braket Sudut, T & Cross (+) M3
          </span>
          <input
            type="checkbox"
            checked={showBrackets}
            onChange={(e) => setShowBrackets(e.target.checked)}
            className="rounded accent-sky-400"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-0.5">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            Mockup Hardware (3 Laptop + Fans + IoT)
          </span>
          <input
            type="checkbox"
            checked={showHardwareMockup}
            onChange={(e) => setShowHardwareMockup(e.target.checked)}
            className="rounded accent-emerald-400"
          />
        </label>

        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          <label className="flex items-center justify-between cursor-pointer py-0.5">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <Cable className="w-3.5 h-3.5 text-blue-400" />
              Visualisasi Alur Kabel 3D (Routing)
            </span>
            <input
              type="checkbox"
              checked={showWiring}
              onChange={(e) => setShowWiring(e.target.checked)}
              className="rounded accent-blue-400"
            />
          </label>

          {showWiring && (
            <div className="pl-5 space-y-1.5 text-[11px]">
              <div className="text-[10px] text-slate-400">Filter Kategori Kabel:</div>
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    { id: 'all', label: 'Semua Kabel', color: 'text-slate-200' },
                    { id: 'lan', label: 'LAN Cat6 (3×)', color: 'text-blue-300' },
                    { id: 'charger', label: 'Charger & PDU', color: 'text-amber-300' },
                    { id: 'iot', label: 'IoT Box & Sensor', color: 'text-emerald-300' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCableFilter(cat.id)}
                    className={`px-2 py-1 rounded text-left flex items-center justify-between border transition ${
                      cableFilter === cat.id
                        ? 'bg-blue-500/20 border-blue-400/50 text-white shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={cat.color}>{cat.label}</span>
                    {cableFilter === cat.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 space-y-0.5 font-mono">
                <div>• LAN: Port kanan ➔ back-lap-wire-t1..3 ➔ rear-main-exit</div>
                <div>• Charger: 3× Adaptor floor ➔ slot kiri ➔ port laptop</div>
                <div>• IoT: 12V + 3× DHT21 + MQ-2 + reed ➔ right-iot-cable</div>
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between cursor-pointer py-0.5">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            LED WS2812B Ice Blue (#A0E6FF)
          </span>
          <input
            type="checkbox"
            checked={ledEnabled}
            onChange={(e) => setLedEnabled(e.target.checked)}
            className="rounded accent-cyan-400"
          />
        </label>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 6: Estimasi Kebutuhan Lembaran Akrilik (Kalkulator RAB) */}
      <section className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            <span>Estimasi Bahan Akrilik</span>
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
            {acrylicEstimate.panelCount} Panel
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">Luas (+15% Waste)</div>
            <div className="font-mono font-semibold text-slate-100">
              {acrylicEstimate.grossAreaWithWasteM2.toFixed(2)} m²
            </div>
          </div>
          <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">Estimasi Berat</div>
            <div className="font-mono font-semibold text-slate-100">
              ~{acrylicEstimate.estimatedWeightKg.toFixed(1)} kg
            </div>
          </div>
        </div>

        <div className="text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5">
          <div className="font-semibold">{acrylicEstimate.sheetRecommendation}</div>
          <div className="text-[10px] text-emerald-300/80 mt-0.5">
            Utilisasi lembar: ~{acrylicEstimate.utilizationPct}% • Luas bersih {acrylicEstimate.netAreaM2.toFixed(2)} m²
          </div>
        </div>
      </section>

      {/* Section 7: Laser Cut DXF & SVG Export (1:1 mm) */}
      <section className="space-y-2 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Ekspor Laser Cut (Skala 1:1 mm)
        </h3>

        {/* Recommended DXF Export (zero DPI issues in CorelDRAW/AutoCAD/RDWorks) */}
        <button
          onClick={handleExportAllPanelsDxf}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition shadow-lg shadow-sky-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Semua Panel (.DXF)</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleExportCurrentPanelDxf}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium transition"
            title="Ekspor hanya panel aktif ke AutoCAD DXF (1:1 mm)"
          >
            <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Panel (.DXF)</span>
          </button>
          <button
            onClick={handleExportCurrentPanelSvg}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium transition"
            title="Ekspor hanya panel aktif ke vektor SVG (1:1 mm)"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Panel (.SVG)</span>
          </button>
        </div>

        <button
          onClick={handleExportAllPanelsSvg}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium transition"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ekspor Semua Panel (.SVG)</span>
        </button>
      </section>
    </div>
  );
};
