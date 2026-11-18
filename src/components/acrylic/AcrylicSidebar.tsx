import React from 'react';
import {
  CircleDot,
  Cpu,
  Fan,
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
import { PanelId } from '../../types/cad';
import {
  downloadSvgFile,
  generateAllPanelsSvg,
  generateSinglePanelSvg,
} from '../../utils/svgExporter';

const PANEL_ORDER: PanelId[] = [
  'bottom',
  'top',
  'divider',
  'middle',
  'right',
  'left',
  'back',
  'front',
];

export const AcrylicSidebar: React.FC = () => {
  const caseDims = useCadStore((s) => s.caseDims);
  const panels = useCadStore((s) => s.panels);
  const activePanelId = useCadStore((s) => s.activePanelId);
  const selectedHoleId = useCadStore((s) => s.selectedHoleId);
  const gridSize = useCadStore((s) => s.gridSize);
  const showBrackets = useCadStore((s) => s.showBrackets);
  const showHardwareMockup = useCadStore((s) => s.showHardwareMockup);
  const ledEnabled = useCadStore((s) => s.ledEnabled);

  const setActivePanelId = useCadStore((s) => s.setActivePanelId);
  const setGridSize = useCadStore((s) => s.setGridSize);
  const setShowBrackets = useCadStore((s) => s.setShowBrackets);
  const setShowHardwareMockup = useCadStore((s) => s.setShowHardwareMockup);
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

  const handleExportCurrentPanel = () => {
    const svg = generateSinglePanelSvg(activePanel);
    downloadSvgFile(svg, `vertex-acrylic-${activePanel.id}-${activePanel.width}x${activePanel.height}mm.svg`);
  };

  const handleExportAllPanels = () => {
    const svg = generateAllPanelsSvg(panels);
    downloadSvgFile(svg, `vertex-hybrid-datacenter-full-sheet-${caseDims.thickness}mm.svg`);
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
              max={600}
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

        {/* Dual-Bay Divider X Slider (PC Bay vs Laptop Bay Split) */}
        {panels.divider.enabled && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Sekat PC / Laptop (X)</span>
              <span className="font-mono text-sky-300">
                PC {caseDims.dividerX}mm | Lap {caseDims.length - caseDims.dividerX}mm
              </span>
            </div>
            <input
              type="range"
              min={150}
              max={caseDims.length - 200}
              step={5}
              value={caseDims.dividerX}
              onChange={(e) => updateCaseDims({ dividerX: Number(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
        )}

        {/* Middle Tray Height Slider */}
        {panels.middle.enabled && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tinggi Rak Laptop (Y)</span>
              <span className="font-mono text-sky-300">{caseDims.middleTrayY} mm</span>
            </div>
            <input
              type="range"
              min={caseDims.thickness + 60}
              max={caseDims.height - caseDims.thickness - 60}
              step={5}
              value={caseDims.middleTrayY}
              onChange={(e) => updateCaseDims({ middleTrayY: Number(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
        )}
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
            Mockup Hardware (PC + 2 Laptop)
          </span>
          <input
            type="checkbox"
            checked={showHardwareMockup}
            onChange={(e) => setShowHardwareMockup(e.target.checked)}
            className="rounded accent-emerald-400"
          />
        </label>

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

      {/* Section 6: Laser Cut SVG Export */}
      <section className="space-y-2 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Ekspor Laser Cut (1:1 mm)
        </h3>
        <button
          onClick={handleExportCurrentPanel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium transition"
        >
          <FileCode2 className="w-4 h-4 text-sky-400" />
          <span>Ekspor Panel Ini (.SVG)</span>
        </button>
        <button
          onClick={handleExportAllPanels}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition shadow-lg shadow-sky-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Semua Panel (.SVG)</span>
        </button>
      </section>
    </div>
  );
};
