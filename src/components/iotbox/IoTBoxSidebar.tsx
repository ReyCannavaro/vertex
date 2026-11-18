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
  const resetIoTBox = useCadStore((s) => s.resetIoTBox);

  const handleExportBaseStl = () => {
    const geo = buildIoTBoxGeometry(iotBox);
    exportGeometryToStl(
      geo,
      `vertex-esp32-box-${iotBox.length}x${iotBox.width}x${iotBox.height}mm.stl`
    );
    geo.dispose();
  };

  const handleExportLidStl = () => {
    const geo = buildIoTBoxLidGeometry(iotBox);
    exportGeometryToStl(
      geo,
      `vertex-esp32-lid-${iotBox.length}x${iotBox.width}mm.stl`
    );
    geo.dispose();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-5 text-xs">
      {/* Section 1: Parametric Dimensions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Dimensi Base Box ESP32 (mm)
          </h3>
          <button
            onClick={resetIoTBox}
            title="Reset Parameter Default"
            className="text-slate-500 hover:text-sky-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Length (X) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Panjang (X)</span>
            <span className="font-mono text-sky-300">{iotBox.length} mm</span>
          </div>
          <input
            type="range"
            min={65}
            max={220}
            step={1}
            value={iotBox.length}
            onChange={(e) => updateIoTBox({ length: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Width (Z) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Lebar (Z)</span>
            <span className="font-mono text-sky-300">{iotBox.width} mm</span>
          </div>
          <input
            type="range"
            min={55}
            max={180}
            step={1}
            value={iotBox.width}
            onChange={(e) => updateIoTBox({ width: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Height (Y) */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-300">Tinggi (Y)</span>
            <span className="font-mono text-sky-300">{iotBox.height} mm</span>
          </div>
          <input
            type="range"
            min={32}
            max={120}
            step={1}
            value={iotBox.height}
            onChange={(e) => updateIoTBox({ height: Number(e.target.value) })}
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
            min={1.6}
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
              Panel depan • Window 25×14mm + 4× baut M2
            </div>
          </div>
        </label>

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
                4× tiang lantai dalam (tinggi 8mm + lubang baut)
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
                  max={180}
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
                <span className="text-[10px] text-slate-400">Jarak Z (mm)</span>
                <input
                  type="number"
                  min={20}
                  max={150}
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

        {/* 40mm Cooling Fan Toggle */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
          <input
            type="checkbox"
            checked={iotBox.hasFan40}
            onChange={(e) => updateIoTBox({ hasFan40: e.target.checked })}
            className="mt-0.5 accent-sky-400"
          />
          <div className="min-w-0">
            <div className="font-medium text-slate-100 flex items-center gap-1.5">
              <Fan className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lubang Kipas 40mm</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Panel samping kanan • Ø37mm + 4× M3 (pitch 32mm)
            </div>
          </div>
        </label>

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
              Panel samping kiri • Slot USB + lubang kabel Ø8mm
            </div>
          </div>
        </label>

        {/* Optional Snap-Fit Lid */}
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
                <span>Sertakan Tutup Box (Snap-Fit Lid)</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Dengan inner lip toleransi cetak 0.35mm
              </div>
            </div>
          </label>

          {iotBox.hasLid && (
            <label className="flex items-center justify-between pl-5 pt-1 cursor-pointer text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <ArrowUpFromLine className="w-3 h-3 text-slate-400" />
                Angkat tutup (intip isi dalam)
              </span>
              <input
                type="checkbox"
                checked={iotBox.lidExploded}
                onChange={(e) => updateIoTBox({ lidExploded: e.target.checked })}
                className="accent-sky-400"
              />
            </label>
          )}
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Section 3: 3D Print STL Export */}
      <section className="space-y-2 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Ekspor 3D Print (Siap Slicer)
        </h3>
        <button
          onClick={handleExportBaseStl}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition shadow-lg shadow-sky-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Base Box (.STL)</span>
        </button>
        {iotBox.hasLid && (
          <button
            onClick={handleExportLidStl}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium transition"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Ekspor Tutup / Lid (.STL)</span>
          </button>
        )}
      </section>
    </div>
  );
};
