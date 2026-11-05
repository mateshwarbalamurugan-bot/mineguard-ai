import type { AuditEvent, Checkpoint, DemoScenario, Hazard, Inspection, MineAlert, MineRecord, Reading, ScanRecord, Sensor, Worker, Zone } from '../models/types';

export const mine: MineRecord = { name: 'Demo Mine – Kestrel Ridge', seam: 'Coal, fictional', shift: 'Day', shiftStart: '06:00', shiftEnd: '14:00', demoClock: '09:30', fictional: true };
export const expectedSensors = 36;

export const seedScenarios: DemoScenario[] = [
  { id: 'normal', label: 'Normal', description: 'Seed conditions; all simulated readings remain at baseline.' },
  { id: 'rising-water', label: 'Rising water', description: 'Sample sump trend rises; review the Pumping Station.' },
  { id: 'temperature', label: 'Temperature increase', description: 'Illustrative Tunnel B temperature rises; demo threshold only.' },
  { id: 'gas-anomaly', label: 'Gas anomaly', description: 'Illustrative gas value approaches a configurable demo threshold.' },
  { id: 'sensor-failure', label: 'Sensor comm failure', description: 'B-CH4-02 is silent; silence is not a safe reading.' },
  { id: 'stale-data', label: 'Stale data', description: 'A sample feed ages beyond the demonstration freshness window.' },
];

export const seedZones: Zone[] = [
  { id: 'shaft', name: 'Main Shaft', state: 'KNOWN', lastInspectionDays: 2, note: 'All sensors reporting' },
  { id: 'tunnel-a', name: 'Tunnel A', state: 'KNOWN', lastInspectionDays: 3, note: 'Airflow slightly lower than yesterday' },
  { id: 'tunnel-b', name: 'Tunnel B', state: 'KNOWN', lastInspectionDays: 12, note: 'Gas sensor B-CH4-02 reporting at seed' },
  { id: 'tunnel-c', name: 'Tunnel C', state: 'UNKNOWN', lastInspectionDays: 21, note: 'Partially scanned; no gas sensor installed', coverage: 58 },
  { id: 'pump', name: 'Pumping Station', state: 'KNOWN', lastInspectionDays: 4, note: 'Sump level +6 cm in 2 hours; water trend rising' },
  { id: 'exit', name: 'Emergency Exit', state: 'UNCERTAIN', lastInspectionDays: 9, note: 'Checkpoint reader calibration overdue' },
];

const sensorSeed: Omit<Sensor, 'calibration'>[] = [
  { id: 'A-CH4-01', zoneId: 'tunnel-a', measure: 'CH4', unit: '%', value: 0.3, threshold: 1.0, location: 'Tunnel A east', status: 'reporting', lastReading: '09:29' },
  { id: 'A-CO-01', zoneId: 'tunnel-a', measure: 'CO', unit: 'ppm', value: 6, threshold: 25, location: 'Tunnel A junction', status: 'reporting', lastReading: '09:29' },
  { id: 'A-O2-01', zoneId: 'tunnel-a', measure: 'O2', unit: '%', value: 20.6, threshold: 19.5, location: 'Tunnel A west', status: 'reporting', lastReading: '09:29' },
  { id: 'A-AIR-01', zoneId: 'tunnel-a', measure: 'Airflow', unit: 'm/s', value: 3.1, threshold: 1.5, location: 'Tunnel A intake', status: 'reporting', lastReading: '09:29' },
  { id: 'B-CH4-02', zoneId: 'tunnel-b', measure: 'CH4', unit: '%', value: 0.3, threshold: 1.0, location: 'Tunnel B junction', status: 'reporting', lastReading: '09:28' },
  { id: 'B-TMP-01', zoneId: 'tunnel-b', measure: 'Temperature', unit: '°C', value: 27, threshold: 35, location: 'Tunnel B roof', status: 'reporting', lastReading: '09:29' },
  { id: 'B-HUM-01', zoneId: 'tunnel-b', measure: 'Humidity', unit: '%', value: 78, threshold: 90, location: 'Tunnel B west', status: 'reporting', lastReading: '09:29' },
  { id: 'B-DST-01', zoneId: 'tunnel-b', measure: 'Dust', unit: 'mg/m³', value: 1.4, threshold: 3.0, location: 'Tunnel B haulage', status: 'reporting', lastReading: '09:29' },
  { id: 'C-AIR-01', zoneId: 'tunnel-c', measure: 'Airflow', unit: 'm/s', value: 2.2, threshold: 1.5, location: 'Tunnel C west', status: 'stale', lastReading: '09:12' },
  { id: 'P-WLV-01', zoneId: 'pump', measure: 'Water level', unit: 'cm', value: 42, threshold: 60, location: 'Pumping Station sump', status: 'reporting', lastReading: '09:14' },
  { id: 'P-WLV-02', zoneId: 'pump', measure: 'Water level', unit: 'cm', value: 42, threshold: 60, location: 'Pumping Station sump B', status: 'reporting', lastReading: '09:14' },
  { id: 'X-CHK-01', zoneId: 'exit', measure: 'Checkpoint', unit: 'events', value: 1, threshold: 1, location: 'Emergency Exit reader', status: 'stale', lastReading: '07:40' },
];

export const seedSensors: Sensor[] = sensorSeed.map((sensor) => ({ ...sensor, calibration: sensor.id === 'X-CHK-01' ? 'Overdue' : 'Current' }));
export const seedReadings: Reading[] = seedSensors.map((sensor) => ({
  id: `rd-${sensor.id}-seed`, sensorId: sensor.id, value: sensor.value, unit: sensor.unit, timestamp: sensor.lastReading,
  quality: sensor.status === 'reporting' ? 'Fresh' : 'Stale',
}));

export const seedAlerts: MineAlert[] = [
  { id: 'al-water', title: 'Water level rising', zoneId: 'pump', severity: 'Medium', time: '09:14', state: 'new', recommendedAction: 'Check pump operation per site procedure.', provenance: 'SIMULATED' },
  { id: 'al-inspection', title: 'Structural inspection overdue', zoneId: 'tunnel-c', severity: 'Medium', time: '08:02', state: 'new', recommendedAction: 'Schedule inspection.', provenance: 'SIMULATED' },
  { id: 'al-checkpoint', title: 'Checkpoint calibration overdue', zoneId: 'exit', severity: 'Low', time: '07:40', state: 'new', recommendedAction: 'Recalibrate reader.', provenance: 'SIMULATED' },
];

const teams = ['Ventilation', 'Maintenance', 'Survey', 'Roof Support', 'Haulage'];
export const seedWorkers: Worker[] = Array.from({ length: 48 }, (_, index) => {
  const serial = 412 + index;
  const id = `W-${String(serial).padStart(4, '0')}`;
  const isBreak = [0, 1, 2].includes(index);
  const isOverdue = index === 3;
  const isTunnelBWorker = index === 19;
  return {
    id, team: teams[index % teams.length], status: isBreak ? 'break' : 'active',
    location: isBreak ? 'Surface break area' : isTunnelBWorker ? 'Tunnel B' : index < 16 ? 'Tunnel A' : 'Main Shaft',
    lastCheckpoint: isTunnelBWorker ? 'Tunnel B – Checkpoint 3, 09:02' : isOverdue ? 'Tunnel A – Checkpoint 2, 08:10' : `Main Shaft – Checkpoint ${index % 4 + 1}, 09:${String(index % 50).padStart(2, '0')}`,
    lastCommunication: isTunnelBWorker ? '09:07' : isOverdue ? '08:11' : `09:${String(index % 50).padStart(2, '0')}`,
    checkpointOverdue: isOverdue, exitStatus: isBreak ? 'verified-out' : 'underground',
  };
});

export const seedCheckpoints: Checkpoint[] = seedWorkers.map((worker) => {
  const parts = worker.lastCheckpoint.split(', ');
  const label = parts[0];
  const time = parts[1] ?? '09:00';
  const zoneId = label.includes('Tunnel B') ? 'tunnel-b' : label.includes('Tunnel A') ? 'tunnel-a' : worker.status === 'break' ? 'shaft' : 'shaft';
  return { id: `cp-${worker.id}-seed`, workerId: worker.id, zoneId, label, recordedAt: time, verified: !worker.checkpointOverdue };
});

export const seedInspections: Inspection[] = [
  { id: 'in-c', zoneId: 'tunnel-c', score: 61, reason: 'Inspection age 21 days; coverage is incomplete.', evidence: ['21 days since last inspection', '58% scan coverage', 'No gas sensor installed'], lastInspection: '21 days ago', requiredVerification: 'Structural survey and scan gap review', team: 'Survey', due: 'Today · 11:00', status: 'Queued' },
  { id: 'in-pump', zoneId: 'pump', score: 48, reason: 'Water trend rising; sump level +6 cm over two hours.', evidence: ['Two-hour rising trend', 'Two prior flooding incidents'], lastInspection: '4 days ago', requiredVerification: 'Verify sump and pump operation', team: 'Maintenance', due: 'Today · 10:30', status: 'Queued' },
  { id: 'in-exit', zoneId: 'exit', score: 44, reason: 'Checkpoint calibration is overdue.', evidence: ['Reader calibration overdue', '9 days since inspection'], lastInspection: '9 days ago', requiredVerification: 'Recalibrate and verify reader', team: 'Maintenance', due: 'Today · 10:00', status: 'Queued' },
  { id: 'in-b', zoneId: 'tunnel-b', score: 36, reason: 'Inspection age 12 days; gas sensor currently reporting.', evidence: ['12 days since inspection', 'B-CH4-02 reporting at seed'], lastInspection: '12 days ago', requiredVerification: 'Review gas sensor and junction conditions', team: 'Ventilation', due: 'Today · 12:00', status: 'Queued' },
  { id: 'in-a', zoneId: 'tunnel-a', score: 18, reason: 'Airflow slightly lower than yesterday.', evidence: ['Airflow trend'], lastInspection: '3 days ago', requiredVerification: 'Verify airflow trend', team: 'Ventilation', due: 'Today · 13:00', status: 'Queued' },
  { id: 'in-shaft', zoneId: 'shaft', score: 9, reason: 'All sensors reporting; inspection is recent.', evidence: ['All expected sample sensors reporting', '2 days since inspection'], lastInspection: '2 days ago', requiredVerification: 'Routine observation', team: 'Roof Support', due: 'Today · 14:00', status: 'Queued' },
];

export const seedHazards: Hazard[] = [
  { id: 'hz-c-rock', zoneId: 'tunnel-c', title: 'Loose-rock observation', state: 'Open', age: '18 days', description: 'Open observation record; site verification required.' },
  { id: 'hz-a-water', zoneId: 'tunnel-a', title: 'Minor roof-water seepage', state: 'Monitoring', age: '6 days', description: 'Monitoring record; no live interpretation.' },
  { id: 'hz-b-door', zoneId: 'tunnel-b', title: 'Ventilation door fault', state: 'Resolved', age: '12 days', description: 'Resolved in the sample history.' },
  { id: 'hz-pump', zoneId: 'pump', title: 'Sump flooding history', state: 'Monitoring', age: '2 incidents / 6 months', description: 'Historical sample record.' },
];

export const seedScans: ScanRecord[] = [
  { id: 'scan-prev', label: 'Previous sample scan', ageDays: 14, coverage: 71, missingAreas: ['Tunnel C north section'], note: 'Sample geometry – not real LiDAR.' },
  { id: 'scan-latest', label: 'Latest sample scan', ageDays: 2, coverage: 79, missingAreas: ['Tunnel C east pocket'], note: 'Tunnel A east wall: 4.2 cm inward deviation, flagged for engineering review. Sample geometry – not real LiDAR.' },
];
export const seedAudit: AuditEvent[] = [{ id: 'ev-seed', time: '09:30', action: 'Demo initialized', detail: 'Fictional Kestrel Ridge seed loaded.', actor: 'System' }];
