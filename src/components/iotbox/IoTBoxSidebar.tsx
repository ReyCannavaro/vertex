import React from 'react';
import {
  Cpu,
  Download,
  Fan,
  Monitor,
  RotateCcw,
  Usb,
  Layers,
  ArrowUpFromLine,
  Wind,
  Wrench,
  Eye,
} from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import {
  buildIoTBoxGeometry,
  buildIoTBoxLidGeometry,
} from '../../utils/csgBuilder';
import { exportGeometryToStl } from '../../utils/stlExporter';

export const IoTBoxSidebar: React.FC = () => {
  const iotBox = useCadStore((s) => s.iotBox);
  const updateIoTBox = useCadStore((s) => s.updateIoTBox);
  const applyIoTPreset = useCadStore((s) => s.applyIoTPreset);
  const resetIoTBox = useCadStore((s) => s.resetIoTBox);

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

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-5 text-xs">
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
    </div>
  );
};
