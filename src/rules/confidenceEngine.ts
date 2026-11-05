import type { Reading, Sensor, Zone, ZoneStatus } from '../models/types';

export interface ConfidenceCheck {
  key: 'threshold' | 'coverage' | 'communication' | 'freshness' | 'calibration';
  label: string;
  state: 'clear' | 'attention' | 'missing';
  detail: string;
}

export function isThresholdBreached(sensor: Sensor): boolean {
  if (sensor.status !== 'reporting') return false;
  if (sensor.measure === 'O2' || sensor.measure === 'Airflow') return sensor.value < sensor.threshold;
  return sensor.value > sensor.threshold;
}

export function deriveZoneClass(zone: Zone, sensors: Sensor[], readings: Reading[]): { state: ZoneStatus; note: string } {
  const zoneSensors = sensors.filter((sensor) => sensor.zoneId === zone.id);
  const zoneReadings = readings.filter((reading) => zoneSensors.some((sensor) => sensor.id === reading.sensorId));
  const breached = zoneSensors.find(isThresholdBreached);
  if (breached) return { state: 'ALERT', note: `${breached.id} sample value crossed its configurable demo threshold; confirm per site procedure.` };

  const hasCoverageGap = typeof zone.coverage === 'number' && zone.coverage < 60;
  const noGasSensor = zone.id === 'tunnel-c' && !zoneSensors.some((sensor) => sensor.measure === 'CH4');
  if (hasCoverageGap || noGasSensor) return { state: 'UNKNOWN', note: `Information gap: ${hasCoverageGap ? `${zone.coverage}% sample scan coverage` : 'no CH4 sensor listed'}; missing data is not proof of safety.` };

  const silent = zoneSensors.find((sensor) => sensor.status === 'silent');
  if (silent) return { state: 'UNCERTAIN', note: `${silent.id} is silent; no current sample reading is available. Silence is not a safe reading.` };
  const stale = zoneSensors.find((sensor) => sensor.status === 'stale');
  if (stale) return { state: 'UNCERTAIN', note: `${stale.id} has a stale sample reading; current conditions are not established.` };
  const overdue = zoneSensors.find((sensor) => sensor.calibration.toLowerCase().includes('overdue'));
  if (overdue) return { state: 'UNCERTAIN', note: `${overdue.id} calibration is overdue; reader data requires verification.` };
  if (zoneReadings.some((reading) => reading.quality === 'Missing' || reading.quality === 'Conflicting')) return { state: 'UNCERTAIN', note: 'A sample reading is missing or conflicting; do not infer safety.' };

  // Preserve a seeded, explicitly stated classification for zones with no displayed sample sensors.
  if (zoneSensors.length === 0) return { state: zone.state, note: zone.note };
  return { state: 'KNOWN', note: 'Displayed sample sensor records are reporting; this demonstration does not establish safe conditions.' };
}

export function classifyZones(zones: Zone[], sensors: Sensor[], readings: Reading[]): Zone[] {
  return zones.map((zone) => {
    const derived = deriveZoneClass(zone, sensors, readings);
    return { ...zone, state: derived.state, note: derived.note };
  });
}

export function confidenceChecks(zone: Zone, sensors: Sensor[], readings: Reading[]): ConfidenceCheck[] {
  const zoneSensors = sensors.filter((sensor) => sensor.zoneId === zone.id);
  const zoneReadings = readings.filter((reading) => zoneSensors.some((sensor) => sensor.id === reading.sensorId));
  const breach = zoneSensors.find(isThresholdBreached);
  const silent = zoneSensors.find((sensor) => sensor.status === 'silent');
  const stale = zoneSensors.find((sensor) => sensor.status === 'stale');
  const overdue = zoneSensors.find((sensor) => sensor.calibration.toLowerCase().includes('overdue'));
  const gap = (typeof zone.coverage === 'number' && zone.coverage < 60) || (zone.id === 'tunnel-c' && !zoneSensors.some((sensor) => sensor.measure === 'CH4'));
  return [
    { key: 'threshold', label: 'Demo measurement threshold', state: breach ? 'attention' : 'clear', detail: breach ? `${breach.id} crossed a configurable demo threshold.` : 'No displayed reporting sensor crossed its illustrative demo threshold.' },
    { key: 'coverage', label: 'Spatial / sensor coverage', state: gap ? 'missing' : zoneSensors.length ? 'clear' : 'missing', detail: gap ? `Coverage gap present${zone.coverage ? ` (${zone.coverage}% sample coverage)` : ''}; not enough information to infer safety.` : zoneSensors.length ? `${zoneSensors.length} displayed sample sensors associated with this zone.` : 'No displayed sample sensors; the seeded classification is not independently confirmed.' },
    { key: 'communication', label: 'Sensor communication', state: silent ? 'attention' : zoneSensors.some((sensor) => sensor.status === 'reporting') ? 'clear' : 'missing', detail: silent ? `${silent.id} is silent.` : 'Reporting status comes from fictional local sample data.' },
    { key: 'freshness', label: 'Reading freshness', state: stale || zoneReadings.some((reading) => reading.quality === 'Stale' || reading.quality === 'Missing') ? 'attention' : zoneReadings.length ? 'clear' : 'missing', detail: stale ? `${stale.id} has not produced a current reading.` : zoneReadings.length ? 'Sample timestamps are shown; freshness is evaluated against demo rules.' : 'No sample reading available.' },
    { key: 'calibration', label: 'Calibration record', state: overdue ? 'attention' : zoneSensors.length ? 'clear' : 'missing', detail: overdue ? `${overdue.id} calibration is overdue.` : zoneSensors.length ? 'No displayed calibration issue is recorded.' : 'Calibration information is not available.' },
  ];
}
