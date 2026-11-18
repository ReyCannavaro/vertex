import React from 'react';
import { useCadStore } from '../../store/useCadStore';
import { AcrylicSidebar } from '../acrylic/AcrylicSidebar';
import { IoTBoxSidebar } from '../iotbox/IoTBoxSidebar';

export const Sidebar: React.FC = () => {
  const activeModule = useCadStore((s) => s.activeModule);

  return (
    <aside className="w-76 shrink-0 h-full bg-slate-950 border-r border-slate-800/90 flex flex-col overflow-hidden">
      {activeModule === 'acrylic' ? <AcrylicSidebar /> : <IoTBoxSidebar />}
    </aside>
  );
};
