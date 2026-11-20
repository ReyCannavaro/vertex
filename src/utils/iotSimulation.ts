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
  doorLeftOpen: boolean;
  doorRightOpen: boolean;
  buzzerActive: boolean;

  // Effective 4-Channel 5V Relay states (Pure ON/OFF per Zone; Fire Cut-Off kills all 4 fan relays!)
  relayTier1On: boolean; // CH1: 12V Tier 1 Bottom Intake 2×120mm
  relayTier2On: boolean; // CH2: 12V Tier 2 Middle Assist 2×120mm
  relayTier3On: boolean; // CH3: 12V Tier 3 Top Exhaust 2×120mm
  relayIotOn: boolean; // CH4: 5V IoT Box 40mm Fan

  // Backward-compat aliases
  relayPcOn: boolean;
  relayLapTopOn: boolean;
  relayLapBotOn: boolean;

  // Dynamic WS2812B status color
  effectiveLedColor: string;
  alerts: IoTAlert[];
}

/**
 * Pure deterministic controller logic mirroring ESP32 38-Pin firmware (Dedicated 3-Tier Laptop Rack):
 * - MQ-2 Smoke >= 450 ppm -> FIRE SAFETY CUT-OFF (kills Relay CH1–CH4 immediately + sounds Buzzer + Red LED)
 * - Auto Thermal Mode -> independent ON/OFF thresholds per tier:
 *     CH1 (Tier 1 Bottom Intake 2×120mm): ON when Tier 1 >= 36°C
 *     CH2 (Tier 2 Middle Assist 2×120mm): ON when Tier 2 >= 38°C
 *     CH3 (Tier 3 Top Exhaust 2×120mm): ON when Tier 3 >= 36°C
 *     CH4 (IoT Box 5V 40mm): ON when avg temp >= 35°C or any fan active
 * - Door Reed Switches (2x MC-38) -> real-time dashboard security alert when either door opens > 4°
 */
export function computeEffectiveIoTState(
  sim: IoTSimState,
  doorLeftAngle: number,
  doorRightAngle: number,
  baseLedColor = '#A0E6FF'
): EffectiveIoTState {
  const smokeAlarm = sim.smokePpm >= 450;
  const t1 = sim.tempTier1 ?? sim.tempPc ?? 34;
  const t2 = sim.tempTier2 ?? sim.tempLapBot ?? 36;
  const t3 = sim.tempTier3 ?? sim.tempLapTop ?? 38;
  const maxCaseTemp = Math.max(t1, t2, t3);
  const avgTemp = (t1 + t2 + t3) / 3;
  const overheatAlarm = maxCaseTemp >= 65;

  const doorLeftOpen = doorLeftAngle > 4;
  const doorRightOpen = doorRightAngle > 4;
  const doorPcOpen = doorLeftOpen;
  const doorLapOpen = doorRightOpen;

  // Pure ON/OFF 4-Channel Relay Control (Fire Safety Cut-Off overrides all fan relays to OFF!)
  const relayTier1On = smokeAlarm
    ? false
    : sim.autoMode
      ? t1 >= 36
      : (sim.relayFansTier1 ?? sim.relayPcFans ?? false);

  const relayTier2On = smokeAlarm
    ? false
    : sim.autoMode
      ? t2 >= 38
      : (sim.relayFansTier2 ?? sim.relayLapBotFans ?? false);

  const relayTier3On = smokeAlarm
    ? false
    : sim.autoMode
      ? t3 >= 36
      : (sim.relayFansTier3 ?? sim.relayLapTopFans ?? false);

  const relayIotOn = smokeAlarm
    ? false
    : sim.autoMode
      ? avgTemp >= 35 || relayTier1On || relayTier2On || relayTier3On
      : sim.relayIotFan;

  let effectiveLedColor = baseLedColor;
  if (smokeAlarm || overheatAlarm) {
    effectiveLedColor = '#ef4444'; // Emergency Red
  } else if (maxCaseTemp >= 52 || doorLeftOpen || doorRightOpen) {
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
  if (doorLeftOpen) {
    alerts.push({
      id: 'door-left',
      severity: 'warning',
      title: 'SECURITY: Pintu Depan Kiri Dibuka!',
      detail: `Sensor Magnet MC-38 #1 (GPIO32) OPEN (${Math.round(doorLeftAngle)}°) — Notifikasi web realtime.`,
    });
  }
  if (doorRightOpen) {
    alerts.push({
      id: 'door-right',
      severity: 'warning',
      title: 'SECURITY: Pintu Depan Kanan Dibuka!',
      detail: `Sensor Magnet MC-38 #2 (GPIO33) OPEN (${Math.round(doorRightAngle)}°) — Notifikasi web realtime.`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      severity: 'info',
      title: 'Semua Sistem Normal & Aman',
      detail: `Tier 1: ${t1}°C • Tier 2: ${t2}°C • Tier 3: ${t3}°C • MQ-2: ${sim.smokePpm} ppm`,
    });
  }

  return {
    smokeAlarm,
    overheatAlarm,
    doorPcOpen,
    doorLapOpen,
    doorLeftOpen,
    doorRightOpen,
    buzzerActive: smokeAlarm || overheatAlarm || doorLeftOpen || doorRightOpen,
    relayTier1On,
    relayTier2On,
    relayTier3On,
    relayIotOn,
    relayPcOn: relayTier1On,
    relayLapTopOn: relayTier3On,
    relayLapBotOn: relayTier2On,
    effectiveLedColor,
    alerts,
  };
}
