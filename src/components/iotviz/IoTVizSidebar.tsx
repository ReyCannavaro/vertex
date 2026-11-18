import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Cpu,
  DoorClosed,
  DoorOpen,
  Flame,
  Power,
  RotateCcw,
  ShieldAlert,
  Thermometer,
} from 'lucide-react';
import { useCadStore } from '../../store/useCadStore';
import { computeEffectiveIoTState } from '../../utils/iotSimulation';
import {
  ESP32_PINOUT_TABLE,
  IOT_BOM_LIST,
  SCHEMATIC_NODES,
} from '../../data/iotWiringData';

type SidebarTab = 'sim' | 'pinout' | 'bom';

export const IoTVizSidebar: React.FC = () => {
  const [tab, setTab] = useState<SidebarTab>('sim');

  const iotSim = useCadStore((s) => s.iotSim);
  const doorLeftAngle = useCadStore((s) => s.doorLeftAngle);
  const doorRightAngle = useCadStore((s) => s.doorRightAngle);
  const ledColor = useCadStore((s) => s.ledColor);

  const updateIoTSim = useCadStore((s) => s.updateIoTSim);
  const toggleSmokeTest = useCadStore((s) => s.toggleSmokeTest);
  const resetIoTSim = useCadStore((s) => s.resetIoTSim);
  const setDoorLeftAngle = useCadStore((s) => s.setDoorLeftAngle);
  const setDoorRightAngle = useCadStore((s) => s.setDoorRightAngle);

  const eff = useMemo(
    () => computeEffectiveIoTState(iotSim, doorLeftAngle, doorRightAngle, ledColor),
    [iotSim, doorLeftAngle, doorRightAngle, ledColor]
  );

  const selectedNode = useMemo(
    () => SCHEMATIC_NODES.find((n) => n.id === iotSim.selectedNodeId) ?? null,
    [iotSim.selectedNodeId]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Sub-Tabs: Live Simulator / Pinout 38-Pin / BOM */}
      <div className="grid grid-cols-3 gap-1 p-2.5 border-b border-slate-800 shrink-0">
        {(
          [
            { id: 'sim', label: 'Simulasi', icon: <Power className="w-3 h-3" /> },
            { id: 'pinout', label: 'Pinout', icon: <Cpu className="w-3 h-3" /> },
            { id: 'bom', label: 'BOM', icon: <ClipboardList className="w-3 h-3" /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-md font-medium transition ${
              tab === t.id
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ================= TAB 1: LIVE SIMULATOR & RELAY CONTROL ================= */}
      {tab === 'sim' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Simulated Realtime Web Dashboard Notifications */}
          <section className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Notifikasi Realtime Website
              </h3>
              <button
                onClick={resetIoTSim}
                title="Reset Simulasi"
                className="text-slate-500 hover:text-sky-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {eff.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border text-[11px] space-y-0.5 ${
                  alert.severity === 'critical'
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-100'
                    : alert.severity === 'warning'
                      ? 'bg-amber-950/50 border-amber-500/50 text-amber-100'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {alert.severity === 'critical' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : alert.severity === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span>{alert.title}</span>
                </div>
                <div className="text-[10px] opacity-85 pl-5">{alert.detail}</div>
              </div>
            ))}
          </section>

          <div className="border-t border-slate-800" />

          {/* Safety Sensors: MQ-2 Smoke + 2x MC-38 Door Reed Switches */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sensor Safety (MQ-2 & Magnet Pintu)
            </h3>

            {/* MQ-2 Smoke Test */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  MQ-2 Asap (GPIO34)
                </span>
                <span
                  className={`font-mono font-semibold ${
                    eff.smokeAlarm ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  {iotSim.smokePpm} ppm
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={900}
                step={10}
                value={iotSim.smokePpm}
                onChange={(e) => updateIoTSim({ smokePpm: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
              <button
                onClick={toggleSmokeTest}
                className={`w-full py-1.5 rounded-md font-medium transition border ${
                  eff.smokeAlarm
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {eff.smokeAlarm ? 'Matikan Simulasi Asap' : 'Simulasikan Asap (Fire Cut-Off)'}
              </button>
            </div>

            {/* 2x MC-38 Door Magnetic Reed Switches (synced directly with Module 1 doors!) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setDoorLeftAngle(eff.doorPcOpen ? 0 : 115)}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-medium transition ${
                  eff.doorPcOpen
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {eff.doorPcOpen ? (
                  <DoorOpen className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <DoorClosed className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Pintu PC</span>
              </button>

              <button
                onClick={() => setDoorRightAngle(eff.doorLapOpen ? 0 : 115)}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-medium transition ${
                  eff.doorLapOpen
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {eff.doorLapOpen ? (
                  <DoorOpen className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <DoorClosed className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Pintu Laptop</span>
              </button>
            </div>

            {/* Active Buzzer Indicator */}
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] ${
                eff.buzzerActive
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BellRing className={`w-3.5 h-3.5 ${eff.buzzerActive ? 'text-rose-400' : ''}`} />
                Active Buzzer 5V (GPIO5)
              </span>
              <span className="font-mono font-semibold">
                {eff.buzzerActive ? 'BUNYI!' : 'STANDBY'}
              </span>
            </div>
          </section>

          <div className="border-t border-slate-800" />

          {/* 3x DHT22 Temperature Simulators */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulasi 3× DHT22 (Per Bay)</span>
            </h3>

            {[
              {
                label: 'DHT22 #1 • PC Bay (GPIO4)',
                val: iotSim.tempPc,
                onChange: (v: number) => updateIoTSim({ tempPc: v }),
              },
              {
                label: 'DHT22 #2 • Laptop Atas (GPIO16)',
                val: iotSim.tempLapTop,
                onChange: (v: number) => updateIoTSim({ tempLapTop: v }),
              },
              {
                label: 'DHT22 #3 • Laptop Bawah (GPIO17)',
                val: iotSim.tempLapBot,
                onChange: (v: number) => updateIoTSim({ tempLapBot: v }),
              },
            ].map((s) => (
              <div key={s.label} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{s.label}</span>
                  <span
                    className={`font-mono font-semibold ${
                      s.val >= 65
                        ? 'text-rose-400'
                        : s.val >= 52
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    {s.val} °C
                  </span>
                </div>
                <input
                  type="range"
                  min={22}
                  max={75}
                  step={1}
                  value={s.val}
                  onChange={(e) => s.onChange(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>
            ))}
          </section>

          <div className="border-t border-slate-800" />

          {/* 4-Channel 5V Relay Switchboard (Pure ON/OFF per Zone) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Relay 4-Ch (ON/OFF Terpisah)
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-sky-300">
                <input
                  type="checkbox"
                  checked={iotSim.autoMode}
                  onChange={(e) => updateIoTSim({ autoMode: e.target.checked })}
                  className="accent-sky-400"
                />
                <span>Auto Suhu</span>
              </label>
            </div>

            {[
              {
                ch: 'CH1',
                gpio: 'GPIO25',
                name: 'PC Bay (2× 140mm • 12V)',
                active: eff.relayPcOn,
                toggle: () =>
                  updateIoTSim({ autoMode: false, relayPcFans: !eff.relayPcOn }),
              },
              {
                ch: 'CH2',
                gpio: 'GPIO26',
                name: 'Laptop Atas (2× 120mm • 12V)',
                active: eff.relayLapTopOn,
                toggle: () =>
                  updateIoTSim({ autoMode: false, relayLapTopFans: !eff.relayLapTopOn }),
              },
              {
                ch: 'CH3',
                gpio: 'GPIO27',
                name: 'Laptop Bawah (2× 120mm • 12V)',
                active: eff.relayLapBotOn,
                toggle: () =>
                  updateIoTSim({ autoMode: false, relayLapBotFans: !eff.relayLapBotOn }),
              },
              {
                ch: 'CH4',
                gpio: 'GPIO14',
                name: 'IoT Box Fan (1× 40mm • 5V)',
                active: eff.relayIotOn,
                toggle: () =>
                  updateIoTSim({ autoMode: false, relayIotFan: !eff.relayIotOn }),
              },
            ].map((r) => (
              <button
                key={r.ch}
                onClick={r.toggle}
                disabled={eff.smokeAlarm}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition ${
                  eff.smokeAlarm
                    ? 'bg-rose-950/30 border-rose-800/60 text-slate-500 cursor-not-allowed'
                    : r.active
                      ? 'bg-emerald-500/12 border-emerald-500/40 text-slate-100'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    <span className="font-mono text-purple-300 mr-1.5">{r.ch}</span>
                    {r.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{r.gpio}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    eff.smokeAlarm
                      ? 'bg-rose-500/20 text-rose-300'
                      : r.active
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {eff.smokeAlarm ? 'CUT' : r.active ? 'ON' : 'OFF'}
                </span>
              </button>
            ))}
          </section>

          {/* Selected Component Inspector */}
          {selectedNode && (
            <>
              <div className="border-t border-slate-800" />
              <section className="p-2.5 rounded-lg bg-slate-900/90 border border-sky-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-200">{selectedNode.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedNode.voltage}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Lokasi: <span className="text-slate-200">{selectedNode.location}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedNode.notes}
                </p>
              </section>
            </>
          )}
        </div>
      )}

      {/* ================= TAB 2: ESP32 38-PIN PINOUT TABLE ================= */}
      {tab === 'pinout' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200">
            Seluruh pin ESP32 38-Pin ini <strong>aman saat WiFi aktif</strong> (MQ-2 di ADC1) dan bebas konflik pin boot/strapping.
          </div>
          <div className="space-y-1.5">
            {ESP32_PINOUT_TABLE.map((row) => (
              <div
                key={row.gpio}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sky-300">{row.gpio}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                    {row.voltage}
                  </span>
                </div>
                <div className="font-medium text-slate-100">
                  {row.module} <span className="text-slate-400">({row.signal})</span>
                </div>
                <div className="text-[10px] text-slate-400">{row.safetyNote}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: BILL OF MATERIALS (BOM) ================= */}
      {tab === 'bom' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200">
            Daftar komponen elektronik lengkap (<strong>{IOT_BOM_LIST.length} item</strong>) dengan daya independen Adaptor 12V 5A.
          </div>
          <div className="space-y-1.5">
            {IOT_BOM_LIST.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100 leading-snug">{item.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {item.spec} • <span className="text-sky-300">{item.zone}</span>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                  {item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
