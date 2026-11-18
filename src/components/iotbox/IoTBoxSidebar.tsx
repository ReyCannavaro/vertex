import React from 'react';
import {
  Box,
  Cpu,
  Download,
  Fan,
  Monitor,
  Plus,
  RotateCcw,
  Usb,
  Layers,
  ArrowUpFromLine,
  Wind,
  Wrench,
  Eye,
  CornerDownRight,
} from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { BracketType } from '../../types/cad';
import {
  buildBracketGeometry,
  buildIoTBoxGeometry,
  buildIoTBoxLidGeometry,
} from '../../utils/csgBuilder';
import { exportGeometryToStl } from '../../utils/stlExporter';

const BRACKET_SPECS: Array<{
  id: BracketType;
  label: string;
  qty: string;
  usage: string;
}> = [
  { id: 'l-bracket', label: 'L-Bracket Siku (Utama Dalam)', qty: 'Cetak 22×', usage: 'Semua joint dalam & depan (bebas ganjel pintu & MC-38!)' },
  { id: 'corner-3way', label: 'Corner 3-Way (Sudut Belakang)', qty: 'Cetak 4×', usage: '4 sudut luar Rear Wiring Chamber (Thumb-Screw M3)' },
  { id: 'handle-m3', label: 'Door Pull Handle M3 (52mm)', qty: 'Cetak 2×', usage: 'Pitch 52mm + slot mur M3 dalam (klop 1:1 pintu depan!)' },
  { id: 't-bracket', label: 'Slotted T-Clamp (Opsional)', qty: 'Opsional', usage: 'Klip selip 5.2mm (hanya jika tanpa pintu depan)' },
  { id: 'cross-bracket', label: 'Slotted Cross (+) (Opsional)', qty: 'Opsional', usage: 'Klip selip 5.2mm (hanya jika tanpa pintu depan)' },
];

export const IoTBoxSidebar: React.FC = () => {
  const printPartCategory = useCadStore((s) => s.printPartCategory);
  const iotBox = useCadStore((s) => s.iotBox);
  const bracketParams = useCadStore((s) => s.bracketParams);
  const setPrintPartCategory = useCadStore((s) => s.setPrintPartCategory);
  const updateIoTBox = useCadStore((s) => s.updateIoTBox);
  const applyIoTPreset = useCadStore((s) => s.applyIoTPreset);
  const resetIoTBox = useCadStore((s) => s.resetIoTBox);
  const selectBracketType = useCadStore((s) => s.selectBracketType);
  const updateBracketParams = useCadStore((s) => s.updateBracketParams);
  const resetBracketParams = useCadStore((s) => s.resetBracketParams);

  const handleExportBaseStl = () => {
    const geo = buildIoTBoxGeometry(iotBox);
    exportGeometryToStl(
      geo,
      `vertex-iot-housing-${iotBox.length}x${iotBox.height}x${iotBox.width}mm.stl`
    );
    geo.dispose();
  };

  const handleExportLidStl = () => {
    const geo = buildIoTBoxLidGeometry(iotBox);
    exportGeometryToStl(
      geo,
      `vertex-iot-faceplate-${iotBox.length}x${iotBox.height}mm.stl`
    );
    geo.dispose();
  };

  const handleExportBracketStl = (type: BracketType = bracketParams.type) => {
    const geo = buildBracketGeometry({ ...bracketParams, type });
    exportGeometryToStl(
      geo,
      `vertex-bracket-${type}-arm${bracketParams.armLength}mm-m3.stl`
    );
    geo.dispose();
  };

  const handleExportAllBrackets = () => {
    BRACKET_SPECS.forEach((b, idx) => {
      setTimeout(() => handleExportBracketStl(b.id), idx * 180);
    });
  };

  const activeBracketSpec =
    BRACKET_SPECS.find((b) => b.id === bracketParams.type) ?? BRACKET_SPECS[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-5 text-xs">
      {/* Category Switcher: Enclosures & Shrouds vs Acrylic Structural Brackets */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
        <button
          onClick={() => setPrintPartCategory('enclosure')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition ${
            printPartCategory === 'enclosure'
              ? 'bg-sky-500 text-slate-950 font-semibold'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Box & Shroud</span>
        </button>
        <button
          onClick={() => setPrintPartCategory('bracket')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition ${
            printPartCategory === 'bracket'
              ? 'bg-sky-500 text-slate-950 font-semibold'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <CornerDownRight className="w-3.5 h-3.5" />
          <span>Braket Akrilik</span>
        </button>
      </div>

      {/* ================= MODE B: 3D-PRINTABLE ACRYLIC BRACKETS ================= */}
      {printPartCategory === 'bracket' && (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                4 Jenis Braket Casing (PETG Hitam)
              </h3>
              <button
                onClick={resetBracketParams}
                title="Reset Parameter Braket"
                className="text-slate-500 hover:text-sky-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {BRACKET_SPECS.map((b) => {
                const active = bracketParams.type === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => selectBracketType(b.id)}
                    className={`px-2.5 py-2 rounded-lg border text-left transition flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-100'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{b.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{b.usage}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                      {b.qty}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="border-t border-slate-800" />

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Dimensi Parametrik Braket (mm)
            </h3>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Panjang Lengan (Arm)</span>
                <span className="font-mono text-sky-300">{bracketParams.armLength} mm</span>
              </div>
              <input
                type="range"
                min={20}
                max={44}
                step={1}
                value={bracketParams.armLength}
                onChange={(e) => updateBracketParams({ armLength: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Lebar Lengan (Width)</span>
                <span className="font-mono text-sky-300">{bracketParams.armWidth} mm</span>
              </div>
              <input
                type="range"
                min={10}
                max={24}
                step={1}
                value={bracketParams.armWidth}
                onChange={(e) => updateBracketParams({ armWidth: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Ketebalan Braket</span>
                <span className="font-mono text-sky-300">{bracketParams.thickness.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={4}
                max={9}
                step={0.5}
                value={bracketParams.thickness}
                onChange={(e) => updateBracketParams({ thickness: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            {(bracketParams.type === 't-bracket' ||
              bracketParams.type === 'cross-bracket') && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Celah Slot Akrilik (5mm → 5.2)</span>
                  <span className="font-mono text-amber-300">
                    {bracketParams.acrylicGap.toFixed(1)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={3.1}
                  max={6.0}
                  step={0.1}
                  value={bracketParams.acrylicGap}
                  onChange={(e) => updateBracketParams({ acrylicGap: Number(e.target.value) })}
                  className="w-full cursor-pointer"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Jarak Lubang Baut M3</span>
                <span className="font-mono text-sky-300">{bracketParams.holeOffset} mm</span>
              </div>
              <input
                type="range"
                min={10}
                max={32}
                step={1}
                value={bracketParams.holeOffset}
                onChange={(e) => updateBracketParams({ holeOffset: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Diameter Lubang (M3=3.4)</span>
                <span className="font-mono text-sky-300">{bracketParams.screwDiameter.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={3.0}
                max={4.6}
                step={0.1}
                value={bracketParams.screwDiameter}
                onChange={(e) => updateBracketParams({ screwDiameter: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-1 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                Tampilkan Preview Baut M3
              </span>
              <input
                type="checkbox"
                checked={bracketParams.showPreviewBolts}
                onChange={(e) => updateBracketParams({ showPreviewBolts: e.target.checked })}
                className="accent-cyan-400"
              />
            </label>
          </section>

          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed">
            {bracketParams.type === 'handle-m3' ? (
              <>
                <strong>Kompatibel 1:1 Pintu Depan:</strong> Jarak 2 lubang baut tepat <strong>52 mm</strong> (klop dengan lubang handle di Pintu PC & Laptop). Selipkan 2 mur segi-6 M3 ke celah samping kaki handle, lalu baut M3×12mm dari sisi dalam pintu!
              </>
            ) : (
              <>
                <strong>Rekomendasi Slicer:</strong> PETG Hitam Matte • Wall 4 • Infill 40% Gyroid • Layer 0.2mm.
              </>
            )}
          </div>

          <section className="space-y-2 pb-2">
            <button
              onClick={() => handleExportBracketStl()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition shadow-lg shadow-sky-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor {activeBracketSpec.label} (.STL)</span>
            </button>
            <button
              onClick={handleExportAllBrackets}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium transition"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Download Semua Braket & Handle (.STL)</span>
            </button>
          </section>
        </>
      )}

      {/* ================= MODE A: IOT BOX & SLIM FAN SHROUDS ================= */}
      {printPartCategory === 'enclosure' && (
        <>
          {/* Section 0: Quick Pod Presets matching the reference build */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Preset Modul 3D Print
          </h3>
          <button
            onClick={resetIoTBox}
            title="Reset Default"
            className="text-slate-500 hover:text-sky-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          <button
            onClick={() => applyIoTPreset('controller-pod')}
            className={`w-full px-2.5 py-2 rounded-lg border text-left transition ${
              iotBox.hasOled && iotBox.fanPlacement === 'side'
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-100'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span>ESP32 IoT Box (Opsi D • Cross-Flow)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Depan OLED 0.96" • Kiri Louver Masuk • Kanan Kipas 40mm
            </div>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => applyIoTPreset('fan-shroud-120')}
              className={`px-2.5 py-2 rounded-lg border text-left transition ${
                iotBox.hasFan40 && iotBox.fanPlacement === 'front' && iotBox.fanSize === 120
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-100'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Fan className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shroud 120mm</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tipis 28mm (Laptop)</div>
            </button>

            <button
              onClick={() => applyIoTPreset('fan-shroud-140')}
              className={`px-2.5 py-2 rounded-lg border text-left transition ${
                iotBox.hasFan40 && iotBox.fanPlacement === 'front' && iotBox.fanSize === 140
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-100'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Fan className="w-3.5 h-3.5 text-indigo-400" />
                <span>Shroud 140mm</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tipis 28mm (PC Bay)</div>
            </button>
          </div>
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 1: Parametric Dimensions */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Dimensi Housing Pod (mm)
        </h3>

        {/* Length (X) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Lebar Depan (X)</span>
            <span className="font-mono text-sky-300">{iotBox.length} mm</span>
          </div>
          <input
            type="range"
            min={70}
            max={200}
            step={2}
            value={iotBox.length}
            onChange={(e) => updateIoTBox({ length: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Height (Y) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Tinggi Depan (Y)</span>
            <span className="font-mono text-sky-300">{iotBox.height} mm</span>
          </div>
          <input
            type="range"
            min={55}
            max={160}
            step={2}
            value={iotBox.height}
            onChange={(e) => updateIoTBox({ height: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Depth / Width (Z) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Ketebalan / Kedalaman (Z)</span>
            <span className="font-mono text-sky-300">{iotBox.width} mm</span>
          </div>
          <input
            type="range"
            min={22}
            max={90}
            step={2}
            value={iotBox.width}
            onChange={(e) => updateIoTBox({ width: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Corner Radius */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Radius Sudut (Fillet)</span>
            <span className="font-mono text-sky-300">{iotBox.cornerRadius} mm</span>
          </div>
          <input
            type="range"
            min={2}
            max={18}
            step={1}
            value={iotBox.cornerRadius}
            onChange={(e) => updateIoTBox({ cornerRadius: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Wall Thickness */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Tebal Dinding (Shell)</span>
            <span className="font-mono text-sky-300">{iotBox.wallThickness.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min={1.8}
            max={4.0}
            step={0.2}
            value={iotBox.wallThickness}
            onChange={(e) => updateIoTBox({ wallThickness: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 2: Parametric CSG Feature Toggles */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Fitur Cutout & Mounting (CSG)
        </h3>

        {/* OLED 0.96" Toggle */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
          <input
            type="checkbox"
            checked={iotBox.hasOled}
            onChange={(e) => updateIoTBox({ hasOled: e.target.checked })}
            className="mt-0.5 accent-sky-400"
          />
          <div className="min-w-0">
            <div className="font-medium text-slate-100 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span>Lubang Layar OLED 0.96" I2C</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Faceplate depan • Bezel 26×14mm + 4× baut M2
            </div>
          </div>
        </label>

        {/* Side Louver Ventilation Slots */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
          <input
            type="checkbox"
            checked={iotBox.hasSideVents}
            onChange={(e) => updateIoTBox({ hasSideVents: e.target.checked })}
            className="mt-0.5 accent-sky-400"
          />
          <div className="min-w-0">
            <div className="font-medium text-slate-100 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-300" />
              <span>
                {iotBox.hasFan40 && iotBox.fanPlacement === 'side'
                  ? 'Kisi Angin Masuk (Sisi Kiri)'
                  : 'Kisi Ventilasi Samping (Louvers)'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {iotBox.hasFan40 && iotBox.fanPlacement === 'side'
                ? 'Intake udara segar di sisi kiri -> melintang ke kipas kanan'
                : 'Slot sirip udara presisi di dinding kiri & kanan'}
            </div>
          </div>
        </label>

        {/* Cooling Fan Cutout Toggle (Side Cross-Flow or Front Shroud) */}
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={iotBox.hasFan40}
              onChange={(e) => updateIoTBox({ hasFan40: e.target.checked })}
              className="mt-0.5 accent-sky-400"
            />
            <div className="min-w-0">
              <div className="font-medium text-slate-100 flex items-center gap-1.5">
                <Fan className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Lubang Kipas {iotBox.fanSize}mm (
                  {iotBox.fanPlacement === 'side' ? 'Samping Kanan' : 'Depan'})
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {iotBox.fanPlacement === 'side'
                  ? 'Cross-flow mendinginkan ESP32 & modul power di dalam box'
                  : 'Potongan kipas + 4× baut mounting di faceplate depan'}
              </div>
            </div>
          </label>
          {iotBox.hasFan40 && (
            <div className="space-y-2 pl-5">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => updateIoTBox({ fanPlacement: 'side', fanSize: 40 })}
                  className={`px-2 py-0.5 rounded text-[11px] border transition ${
                    iotBox.fanPlacement === 'side'
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Samping Kanan
                </button>
                <button
                  onClick={() => updateIoTBox({ fanPlacement: 'front' })}
                  className={`px-2 py-0.5 rounded text-[11px] border transition ${
                    iotBox.fanPlacement === 'front'
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Depan (Shroud)
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {([40, 80, 120, 140] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => updateIoTBox({ fanSize: sz })}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] border transition ${
                      iotBox.fanSize === sz
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {sz}mm
                  </button>
                ))}
              </div>
              {iotBox.fanPlacement === 'front' && (
                <label className="flex items-center justify-between cursor-pointer text-[11px] text-slate-300">
                  <span>Lubang Udara Tembus Belakang</span>
                  <input
                    type="checkbox"
                    checked={iotBox.throughAirflow}
                    onChange={(e) => updateIoTBox({ throughAirflow: e.target.checked })}
                    className="accent-sky-400"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* ESP32 Screw Terminal Standoffs Toggle */}
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={iotBox.hasStandoffs}
              onChange={(e) => updateIoTBox({ hasStandoffs: e.target.checked })}
              className="mt-0.5 accent-sky-400"
            />
            <div className="min-w-0">
              <div className="font-medium text-slate-100 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Standoff Screw Terminal ESP32</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                4× tiang dalam dinding belakang + pilot hole
              </div>
            </div>
          </label>

          {iotBox.hasStandoffs && (
            <div className="grid grid-cols-2 gap-2 pt-1 pl-5">
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400">Jarak X (mm)</span>
                <input
                  type="number"
                  min={20}
                  max={160}
                  value={iotBox.standoffSpacingX}
                  onChange={(e) =>
                    updateIoTBox({
                      standoffSpacingX: Math.max(20, Number(e.target.value) || 20),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400">Jarak Y (mm)</span>
                <input
                  type="number"
                  min={20}
                  max={130}
                  value={iotBox.standoffSpacingZ}
                  onChange={(e) =>
                    updateIoTBox({
                      standoffSpacingZ: Math.max(20, Number(e.target.value) || 20),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-slate-100"
                />
              </label>
            </div>
          )}
        </div>

        {/* USB / Sensor Cable Toggle */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
          <input
            type="checkbox"
            checked={iotBox.hasUsbCable}
            onChange={(e) => updateIoTBox({ hasUsbCable: e.target.checked })}
            className="mt-0.5 accent-sky-400"
          />
          <div className="min-w-0">
            <div className="font-medium text-slate-100 flex items-center gap-1.5">
              <Usb className="w-3.5 h-3.5 text-amber-400" />
              <span>Lubang Kabel USB & Sensor</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Sisi bawah • Slot USB + grommet kabel Ø9mm
            </div>
          </div>
        </label>

        {/* Rear Acrylic-Wall Mounting Holes */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
          <input
            type="checkbox"
            checked={iotBox.hasWallMount}
            onChange={(e) => updateIoTBox({ hasWallMount: e.target.checked })}
            className="mt-0.5 accent-sky-400"
          />
          <div className="min-w-0">
            <div className="font-medium text-slate-100 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-300" />
              <span>Lubang Baut Dinding Akrilik</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Belakang • 4× baut M3 + lubang kabel Ø16mm
            </div>
          </div>
        </label>

        {/* Front Faceplate / Lid & Preview Controls */}
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={iotBox.hasLid}
              onChange={(e) => updateIoTBox({ hasLid: e.target.checked })}
              className="mt-0.5 accent-sky-400"
            />
            <div className="min-w-0">
              <div className="font-medium text-slate-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Front Faceplate (4× Baut M3)</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Panel depan rounded dengan 4 lubang sudut M3
              </div>
            </div>
          </label>

          {iotBox.hasLid && (
            <label className="flex items-center justify-between pl-5 pt-0.5 cursor-pointer text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <ArrowUpFromLine className="w-3 h-3 text-slate-400" />
                Buka faceplate (lihat dalam)
              </span>
              <input
                type="checkbox"
                checked={iotBox.lidExploded}
                onChange={(e) => updateIoTBox({ lidExploded: e.target.checked })}
                className="accent-sky-400"
              />
            </label>
          )}

          <label className="flex items-center justify-between pl-5 pt-0.5 cursor-pointer text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-cyan-300" />
              Simulasi OLED / Kipas / Baut
            </span>
            <input
              type="checkbox"
              checked={iotBox.showVisualHardware}
              onChange={(e) => updateIoTBox({ showVisualHardware: e.target.checked })}
              className="accent-cyan-400"
            />
          </label>
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 3: 3D Print STL Export */}
      <section className="space-y-2 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Ekspor 3D Print (Watertight .STL)
        </h3>
        <button
          onClick={handleExportBaseStl}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition shadow-lg shadow-sky-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Housing Pod (.STL)</span>
        </button>
          {iotBox.hasLid && (
            <button
              onClick={handleExportLidStl}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium transition"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Ekspor Front Faceplate (.STL)</span>
            </button>
          )}
        </section>
      </>
      )}
    </div>
  );
};
