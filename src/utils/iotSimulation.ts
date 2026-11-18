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

  // Effective 4-Channel 5V Relay states (Pure ON/OFF per Zone; Fire Cut-Off kills all 4 fan relays!)
  relayPcOn: boolean; // CH1: 12V PC Bay 2x140mm
  relayLapTopOn: boolean; // CH2: 12V Laptop Atas 2x120mm
  relayLapBotOn: boolean; // CH3: 12V Laptop Bawah 2x120mm
  relayIotOn: boolean; // CH4: 5V IoT Box 40mm Fan

  // Dynamic WS2812B status color
  effectiveLedColor: string;
  alerts: IoTAlert[];
}

/**
 * Pure deterministic controller logic mirroring ESP32 38-Pin firmware (Skema 2 — Pure 4-Ch Relay ON/OFF):
 * - MQ-2 Smoke >= 450 ppm -> FIRE SAFETY CUT-OFF (kills Relay CH1–CH4 immediately + sounds Buzzer + Red LED)
 * - Auto Thermal Mode -> independent ON/OFF thresholds per bay:
 *     CH1 (PC 12V 2x140mm): ON when PC >= 36°C
 *     CH2 (Lap Top 12V 2x120mm): ON when LapTop >= 38°C
 *     CH3 (Lap Bot 12V 2x120mm): ON when LapBot >= 36°C
 *     CH4 (IoT Box 5V 40mm): ON when avg temp >= 35°C or any relay active
 * - Door Reed Switches (2x MC-38) -> real-time dashboard security alert when either door opens > 4°
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
  const avgTemp = (sim.tempPc + sim.tempLapTop + sim.tempLapBot) / 3;
  const overheatAlarm = maxCaseTemp >= 65;

  const doorPcOpen = doorLeftAngle > 4;
  const doorLapOpen = doorRightAngle > 4;

  // Pure ON/OFF 4-Channel Relay Control (Fire Safety Cut-Off overrides all fan relays to OFF!)
  const relayPcOn = smokeAlarm ? false : sim.autoMode ? sim.tempPc >= 36 : sim.relayPcFans;
  const relayLapTopOn = smokeAlarm
    ? false
    : sim.autoMode
      ? sim.tempLapTop >= 38
      : sim.relayLapTopFans;
  const relayLapBotOn = smokeAlarm
    ? false
    : sim.autoMode
      ? sim.tempLapBot >= 36
      : sim.relayLapBotFans;
  const relayIotOn = smokeAlarm
    ? false
    : sim.autoMode
      ? avgTemp >= 35 || relayPcOn || relayLapTopOn || relayLapBotOn
      : sim.relayIotFan;

  let effectiveLedColor = baseLedColor;
  if (smokeAlarm || overheatAlarm) {
    effectiveLedColor = '#ef4444'; // Emergency Red
  } else if (maxCaseTemp >= 52 || doorPcOpen || doorLapOpen) {
    effectiveLedColor = '#fbbf24'; // Warm / Door Open Amber
  }

  const alerts: IoTAlert[] = [];
  if (smokeAlarm) {
    alerts.push({
      id: 'smoke',
      severity: 'critical',
      title: 'FIRE CUT-OFF: Asap Terdeteksi (MQ-2)',
      detail: `${sim.smokePpm} ppm — Relay CH1–CH4 memutus seluruh kipas & Buzzer berbunyi!`,
    });
  }
  if (overheatAlarm) {
    alerts.push({
      id: 'overheat',
      severity: 'critical',
      title: 'OVERHEAT ALERT (≥65°C)',
      detail: `Suhu puncak ${maxCaseTemp.toFixed(1)}°C — Semua Relay kipas ON & Buzzer aktif.`,
    });
  }
  if (doorPcOpen) {
    alerts.push({
      id: 'door-pc',
      severity: 'warning',
      title: 'SECURITY: Pintu PC Bay (Kiri) Dibuka!',
      detail: `Sensor Magnet MC-38 #1 (GPIO32) OPEN (${Math.round(doorLeftAngle)}°) — Notifikasi web realtime.`,
    });
  }
  if (doorLapOpen) {
    alerts.push({
      id: 'door-lap',
      severity: 'warning',
      title: 'SECURITY: Pintu Laptop Bay (Kanan) Dibuka!',
      detail: `Sensor Magnet MC-38 #2 (GPIO33) OPEN (${Math.round(doorRightAngle)}°) — Notifikasi web realtime.`,
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
    buzzerActive: smokeAlarm || overheatAlarm || doorPcOpen || doorLapOpen,
    relayPcOn,
    relayLapTopOn,
    relayLapBotOn,
    relayIotOn,
    effectiveLedColor,
    alerts,
  };
}
