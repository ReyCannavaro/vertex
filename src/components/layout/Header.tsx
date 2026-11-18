import React, { useRef, useState } from 'react';
import {
  Box,
  Check,
  CircuitBoard,
  Columns2,
  Cpu,
  FolderOpen,
  Layers3,
  PenTool,
  Save,
  Server,
} from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicViewMode } from '../../types/cad';

export const Header: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeModule = useCadStore((s) => s.activeModule);
  const acrylicViewMode = useCadStore((s) => s.acrylicViewMode);
  const iotVizViewMode = useCadStore((s) => s.iotVizViewMode);
  const setActiveModule = useCadStore((s) => s.setActiveModule);
  const setAcrylicViewMode = useCadStore((s) => s.setAcrylicViewMode);
  const setIotVizViewMode = useCadStore((s) => s.setIotVizViewMode);
  const exportProjectJson = useCadStore((s) => s.exportProjectJson);
  const importProjectJson = useCadStore((s) => s.importProjectJson);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleSaveJson = () => {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vertex-cad-project-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Project .JSON tersimpan!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importProjectJson(String(reader.result ?? ''));
      showToast(ok ? 'Project berhasil dimuat!' : 'File JSON tidak valid');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const viewModes: Array<{ id: AcrylicViewMode; label: string; icon: React.ReactNode }> = [
    {
      id: '2d',
      label: activeModule === 'iot-visualizer' ? '2D Wiring' : '2D Sketch',
      icon: <PenTool className="w-3.5 h-3.5" />,
    },
    {
      id: 'split',
      label: 'Split 2D + 3D',
      icon: <Columns2 className="w-3.5 h-3.5" />,
    },
    {
      id: '3d',
      label: activeModule === 'iot-visualizer' ? '3D Jeroan' : '3D Assembly',
      icon: <Layers3 className="w-3.5 h-3.5" />,
    },
  ];

  const currentViewMode =
    activeModule === 'iot-visualizer' ? iotVizViewMode : acrylicViewMode;
  const setViewMode =
    activeModule === 'iot-visualizer' ? setIotVizViewMode : setAcrylicViewMode;

  return (
    <header className="h-13 shrink-0 bg-slate-950 border-b border-slate-800/90 px-4 flex items-center justify-between gap-3 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center text-slate-950 shadow-md shadow-sky-500/20 shrink-0">
          <Server className="w-4 h-4" />
        </div>
        <div className="leading-tight truncate">
          <div className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
            <span>VERTEX CAD</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
              v0.2
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Hybrid Mini Data Center Builder
          </div>
        </div>
      </div>

      {/* 3-Module Switcher */}
      <nav className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveModule('acrylic')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeModule === 'acrylic'
              ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>1. Acrylic Case</span>
        </button>

        <button
          onClick={() => setActiveModule('iot-box')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeModule === 'iot-box'
              ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>2. Parametric IoT Box</span>
        </button>

        <button
          onClick={() => setActiveModule('iot-visualizer')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeModule === 'iot-visualizer'
              ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <CircuitBoard className="w-3.5 h-3.5" />
          <span>3. IoT Wiring & Visualizer</span>
        </button>
      </nav>

      {/* Right Context Controls + Auto-Save & JSON Project Backup */}
      <div className="flex items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* Auto-Saved Status & JSON Save/Load */}
        <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
          <span
            className="hidden xl:flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-1.5"
            title="Perubahan otomatis tersimpan di localStorage browser"
          >
            <Check className="w-3 h-3" />
            {toast ?? 'Auto-Save'}
          </span>
          <button
            onClick={handleSaveJson}
            title="Simpan backup project (.JSON)"
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-sky-300 transition"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Muat project (.JSON)"
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-sky-300 transition"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeModule === 'acrylic' || activeModule === 'iot-visualizer' ? (
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {viewModes.map((vm) => (
              <button
                key={vm.id}
                onClick={() => setViewMode(vm.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                  currentViewMode === vm.id
                    ? 'bg-slate-700 text-sky-200 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {vm.icon}
                <span className="hidden lg:inline">{vm.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="hidden xl:block text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            three-bvh-csg • 1:1 mm
          </div>
        )}
      </div>
    </header>
  );
};
