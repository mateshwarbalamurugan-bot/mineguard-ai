export type ZoneStatus = 'KNOWN' | 'UNCERTAIN' | 'UNKNOWN' | 'ALERT';
export type SensorStatus = 'reporting' | 'stale' | 'silent';
export type Role = 'Mine Safety Officer' | 'Mine Manager' | 'Mining Engineer / Surveyor' | 'Control Room Operator' | 'Procurement / Engineering';
export type ScenarioId = 'normal' | 'rising-water' | 'temperature' | 'gas-anomaly' | 'sensor-failure' | 'stale-data';
export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type AlertState = 'new' | 'acknowledged' | 'linked' | 'resolved';

export interface MineRecord { name: string; seam: string; shift: string; shiftStart: string; shiftEnd: string; demoClock: string; fictional: true; }
export interface Zone { id: string; name: string; state: ZoneStatus; lastInspectionDays: number; note: string; coverage?: number; }
export interface Sensor {
  id: string; zoneId: string; measure: 'CH4' | 'CO' | 'O2' | 'Temperature' | 'Humidity' | 'Water level' | 'Airflow' | 'Dust' | 'Checkpoint';
  unit: string; value: number; threshold: number; location: string; status: SensorStatus; lastReading: string; calibration: string;
}
export interface Reading { id: string; sensorId: string; value: number; unit: string; timestamp: string; quality: 'Fresh' | 'Stale' | 'Missing' | 'Conflicting'; }
export interface Checkpoint { id: string; workerId: string; zoneId: string; label: string; recordedAt: string; verified: boolean; }
export interface DemoScenario { id: ScenarioId; label: string; description: string; }
export interface MineAlert { id: string; title: string; zoneId: string; severity: AlertSeverity; time: string; state: AlertState; recommendedAction: string; provenance: string; taskId?: string; }
export interface Worker { id: string; team: string; status: 'active' | 'break'; location: string; lastCheckpoint: string; lastCommunication: string; checkpointOverdue: boolean; exitStatus: 'underground' | 'verified-out' | 'unconfirmed'; }
export interface Inspection {
  id: string; zoneId: string; score: number; reason: string; evidence: string[]; lastInspection: string; requiredVerification: string;
  team: string; due: string; status: 'Queued' | 'Assigned' | 'In progress' | 'Complete'; observations?: string;
}
export interface Hazard { id: string; zoneId: string; title: string; state: 'Open' | 'Monitoring' | 'Resolved'; age: string; description: string; }
export interface AuditEvent { id: string; time: string; action: string; detail: string; actor: string; }
export interface ScanRecord { id: string; label: string; ageDays: number; coverage: number; missingAreas: string[]; note: string; }
export interface SourceRecord {
  id: string; title: string; platform: string; url: string; retrieved: string; status: 'Verified' | 'Partially verified'; jurisdiction?: string;
  supports: string[]; interfacePatterns: string[]; learn: string[]; different: string[]; limitations: string[]; relatedUrls?: string[];
}
export interface VendorField { label: string; value: string; tag: 'VENDOR-PROVIDED' | 'NOT AVAILABLE'; }
export interface VendorRecord { id: string; name: string; sourceId: string; description: string; boundary: string; fields: VendorField[]; }
