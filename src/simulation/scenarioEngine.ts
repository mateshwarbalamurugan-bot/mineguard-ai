import { seedAlerts, seedHazards, seedInspections, seedReadings, seedSensors, seedZones } from '../data/seed';
import type { Inspection, MineAlert, Reading, ScenarioId, Sensor, Zone } from '../models/types';
import { classifyZones } from '../rules/confidenceEngine';
import { deriveInspectionScores } from '../rules/priorityEngine';

export interface ScenarioSnapshot {
  sensors: Sensor[];
  readings: Reading[];
  zones: Zone[];
  alerts: MineAlert[];
  inspections: Inspection[];
}

export function scenarioSnapshot(scenario: ScenarioId): ScenarioSnapshot {
  const sensors = structuredClone(seedSensors);
  const readings = structuredClone(seedReadings);
  const zones = structuredClone(seedZones);
  const alerts = structuredClone(seedAlerts);
  const inspections = structuredClone(seedInspections);

  const patchSensor = (id: string, patch: Partial<Sensor>) => {
    const sensor = sensors.find((candidate) => candidate.id === id);
    if (sensor) Object.assign(sensor, patch);
    return sensor;
  };
  const patchReading = (id: string, patch: Partial<Reading>) => {
    const reading = readings.find((candidate) => candidate.sensorId === id);
    if (reading) Object.assign(reading, patch);
  };
  const addAlert = (alert: MineAlert) => alerts.push(alert);

  if (scenario === 'rising-water') {
    for (const id of ['P-WLV-01', 'P-WLV-02']) {
      patchSensor(id, { value: 48, lastReading: '09:30', status: 'reporting' });
      patchReading(id, { value: 48, timestamp: '09:30', quality: 'Fresh' });
    }
  }
  if (scenario === 'temperature') {
    patchSensor('B-TMP-01', { value: 36, lastReading: '09:30' });
    patchReading('B-TMP-01', { value: 36, timestamp: '09:30', quality: 'Fresh' });
    addAlert({ id: 'al-temperature', title: 'Temperature demo threshold crossed', zoneId: 'tunnel-b', severity: 'High', time: '09:30', state: 'new', recommendedAction: 'Review the sample reading per site procedure.', provenance: 'SIMULATED' });
  }
  if (scenario === 'gas-anomaly') {
    patchSensor('B-CH4-02', { value: 1.1, lastReading: '09:30' });
    patchReading('B-CH4-02', { value: 1.1, timestamp: '09:30', quality: 'Fresh' });
    addAlert({ id: 'al-gas-anomaly', title: 'Gas demo threshold crossed', zoneId: 'tunnel-b', severity: 'High', time: '09:30', state: 'new', recommendedAction: 'Review the sample reading per site procedure.', provenance: 'SIMULATED' });
  }
  if (scenario === 'sensor-failure') {
    patchSensor('B-CH4-02', { status: 'silent', lastReading: '09:12' });
    patchReading('B-CH4-02', { timestamp: '09:12', quality: 'Missing' });
    addAlert({ id: 'al-gas-comms', title: 'Gas sensor communication lost', zoneId: 'tunnel-b', severity: 'High', time: '09:30', state: 'new', recommendedAction: 'Verify communication and confirm conditions per site procedure.', provenance: 'SIMULATED' });
  }
  if (scenario === 'stale-data') {
    patchSensor('A-CH4-01', { status: 'stale', lastReading: '09:12' });
    patchReading('A-CH4-01', { timestamp: '09:12', quality: 'Stale' });
    addAlert({ id: 'al-stale', title: 'Sensor data stale', zoneId: 'tunnel-a', severity: 'Medium', time: '09:30', state: 'new', recommendedAction: 'Verify sensor freshness and current readings per site procedure.', provenance: 'SIMULATED' });
  }
  const derivedZones = classifyZones(zones, sensors, readings);
  const derivedInspections = deriveInspectionScores(inspections, derivedZones, sensors, readings, seedHazards);
  return { sensors, readings, zones: derivedZones, alerts, inspections: derivedInspections };
}

export const severityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;
export function sortAlerts(alerts: MineAlert[]) {
  return [...alerts].filter((alert) => alert.state !== 'resolved').sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.time.localeCompare(a.time));
}
export function freshSensorCount(sensors: Sensor[]) { return sensors.filter((sensor) => sensor.status === 'reporting').length; }
export function freshnessPercent(sensors: Sensor[], expected: number) { return Math.round(freshSensorCount(sensors) / Math.max(expected, 1) * 100); }
