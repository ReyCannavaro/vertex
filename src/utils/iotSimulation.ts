import { IoTSimState } from '../types/cad';

export interface IoTAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface EffectiveIoTState {
  smokeAlarm: boolean;
  overheatAlarm: boolean;
  doorPcOpen: boolean;
  doorLapOpen: boolean;
  buzzerActive: boolean;

  // Effective Relay states (Fire safety automatically forces fan relays OFF!)
  relayPcOn: boolean;
  relayLapOn: boolean;
  relayIotOn: boolean;
  relayLedOn: boolean;

  // Effective PWM % (0..100)
  pwmPc: number;
  pwmLap: number;
  pwmIot: number;

  // Dynamic WS2812B status color
  effectiveLedColor: string;
  alerts: IoTAlert[];
}

function tempToPwm(temp: number, minT: number, maxT: number): number {
  if (temp <= minT) return 30;
  if (temp >= maxT) return 100;
  return Math.round(30 + ((temp - minT) / (maxT - minT)) * 70);
}

/**
 * Pure deterministic controller logic mirroring what the ESP32 38-Pin firmware runs:
 * - MQ-2 Smoke >= 450 ppm -> FIRE SAFETY CUT-OFF (kills all fan relays immediately + sounds buzzer + red LED)
 * - Auto Thermal Mode -> computes independent PWM fan curves for PC Bay, Laptop Bay & IoT Box
 * - Door Reed Switches (MC-38) -> triggers real-time dashboard security alerts when either door opens > 4°
 */
export function computeEffectiveIoTState(
  sim: IoTSimState,
  doorLeftAngle: number,
  doorRightAngle: number,
  baseLedColor = '#A0E6FF'
): EffectiveIoTState {
  const smokeAlarm = sim.smokePpm >= 450;
  const maxLapTemp = Math.max(sim.tempLapTop, sim.tempLapBot);
  const maxCaseTemp = Math.max(sim.tempPc, maxLapTemp);
  const overheatAlarm = maxCaseTemp >= 65;

  const doorPcOpen = doorLeftAngle > 4;
  const doorLapOpen = doorRightAngle > 4;

  // In Fire Safety Cut-Off, Relay CH1/CH2/CH3 immediately cut power so fans don't feed oxygen to fire!
  const relayPcOn = smokeAlarm ? false : sim.autoMode ? true : sim.relayPcFans;
  const relayLapOn = smokeAlarm ? false : sim.autoMode ? true : sim.relayLapFans;
  const relayIotOn = smokeAlarm ? false : sim.autoMode ? true : sim.relayIotFan;
  const relayLedOn = smokeAlarm ? true : sim.relayLedPower;

  const targetPwmPc = sim.autoMode ? tempToPwm(sim.tempPc, 32, 62) : sim.pwmPc;
  const targetPwmLap = sim.autoMode ? tempToPwm(maxLapTemp, 34, 62) : sim.pwmLap;
  const targetPwmIot = sim.autoMode
    ? tempToPwm((sim.tempPc + maxLapTemp) * 0.5, 34, 60)
    : sim.pwmIot;

  const pwmPc = relayPcOn ? targetPwmPc : 0;
  const pwmLap = relayLapOn ? targetPwmLap : 0;
  const pwmIot = relayIotOn ? targetPwmIot : 0;

  let effectiveLedColor = baseLedColor;
  if (smokeAlarm || overheatAlarm) {
    effectiveLedColor = '#ef4444'; // Emergency Red
  } else if (maxCaseTemp >= 52 || doorPcOpen || doorLapOpen) {
    effectiveLedColor = '#fbbf24'; // Warm / Door Warning Amber
  }

  const alerts: IoTAlert[] = [];
  if (smokeAlarm) {
    alerts.push({
      id: 'smoke',
      severity: 'critical',
      title: 'FIRE CUT-OFF: Asap Terdeteksi (MQ-2)',
      detail: `${sim.smokePpm} ppm — Relay CH1–CH3 memutus daya seluruh kipas & Buzzer aktif!`,
    });
  }
  if (overheatAlarm) {
    alerts.push({
      id: 'overheat',
      severity: 'critical',
      title: 'OVERHEAT ALERT (>65°C)',
      detail: `Suhu puncak ${maxCaseTemp.toFixed(1)}°C — Kipas dipacu 100% & Buzzer aktif.`,
    });
  }
  if (doorPcOpen) {
    alerts.push({
      id: 'door-pc',
      severity: 'warning',
      title: 'Pintu PC Bay (Kiri) Terbuka',
      detail: `MC-38 Reed Switch (GPIO32) OPEN (${Math.round(doorLeftAngle)}°) — Notifikasi web aktif.`,
    });
  }
  if (doorLapOpen) {
    alerts.push({
      id: 'door-lap',
      severity: 'warning',
      title: 'Pintu Laptop Bay (Kanan) Terbuka',
      detail: `MC-38 Reed Switch (GPIO33) OPEN (${Math.round(doorRightAngle)}°) — Notifikasi web aktif.`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      severity: 'info',
      title: 'Semua Sistem Normal & Aman',
      detail: `PC ${sim.tempPc}°C • Lap ${sim.tempLapTop}°/${sim.tempLapBot}°C • MQ-2 ${sim.smokePpm} ppm`,
    });
  }

  return {
    smokeAlarm,
    overheatAlarm,
    doorPcOpen,
    doorLapOpen,
    buzzerActive: smokeAlarm || overheatAlarm,
    relayPcOn,
    relayLapOn,
    relayIotOn,
    relayLedOn,
    pwmPc,
    pwmLap,
    pwmIot,
    effectiveLedColor,
    alerts,
  };
}
