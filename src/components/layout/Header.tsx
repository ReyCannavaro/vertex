import React from 'react';
import { Box, CircuitBoard, Columns2, Cpu, Layers3, PenTool, Server } from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicViewMode } from '../../types/cad';

export const Header: React.FC = () => {
  const activeModule = useCadStore((s) => s.activeModule);
  const acrylicViewMode = useCadStore((s) => s.acrylicViewMode);
  const iotVizViewMode = useCadStore((s) => s.iotVizViewMode);
  const setActiveModule = useCadStore((s) => s.setActiveModule);
  const setAcrylicViewMode = useCadStore((s) => s.setAcrylicViewMode);
  const setIotVizViewMode = useCadStore((s) => s.setIotVizViewMode);

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

      {/* Right Context Controls */}
      <div className="flex items-center justify-end min-w-[220px]">
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
          <div className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            CSG Engine: three-bvh-csg • 1 unit = 1 mm
          </div>
        )}
      </div>
    </header>
  );
};
