import React from 'react';
import { useCadStore } from './store/useCadStore';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Canvas2DEditor } from './components/acrylic/Canvas2DEditor';
import { Preview3DAssembly } from './components/acrylic/Preview3DAssembly';
import { IoTBox3DPreview } from './components/iotbox/IoTBox3DPreview';

export const App: React.FC = () => {
  const activeModule = useCadStore((s) => s.activeModule);
  const acrylicViewMode = useCadStore((s) => s.acrylicViewMode);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar />

        <main className="flex-1 min-w-0 h-full relative flex overflow-hidden">
          {activeModule === 'acrylic' ? (
            <>
              {(acrylicViewMode === '2d' || acrylicViewMode === 'split') && (
                <div
                  className={`h-full min-w-0 ${
                    acrylicViewMode === 'split'
                      ? 'w-1/2 border-r border-slate-800'
                      : 'w-full'
                  }`}
                >
                  <Canvas2DEditor />
                </div>
              )}

              {(acrylicViewMode === '3d' || acrylicViewMode === 'split') && (
                <div
                  className={`h-full min-w-0 ${
                    acrylicViewMode === 'split' ? 'w-1/2' : 'w-full'
                  }`}
                >
                  <Preview3DAssembly />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full">
              <IoTBox3DPreview />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
