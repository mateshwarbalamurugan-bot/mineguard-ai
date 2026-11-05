import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { expectedSensors, mine, seedAlerts, seedAudit, seedCheckpoints, seedHazards, seedInspections, seedReadings, seedScans, seedScenarios, seedSensors, seedWorkers, seedZones } from '../data/seed';
import { sources } from '../data/sources';
import { vendors } from '../data/vendors';
import { scenarioSnapshot } from '../simulation/scenarioEngine';
import type { AuditEvent, Checkpoint, DemoScenario, Hazard, Inspection, MineAlert, MineRecord, Reading, Role, ScenarioId, ScanRecord, Sensor, SourceRecord, VendorRecord, Worker, Zone } from '../models/types';

const demoRoles: Role[] = ['Mine Safety Officer', 'Mine Manager', 'Mining Engineer / Surveyor', 'Control Room Operator', 'Procurement / Engineering'];
type IntegrationStatus = 'Demo connection' | 'Not connected' | 'Configuration required';
interface IntegrationRecord { id: string; name: string; status: IntegrationStatus; note: string; }
interface MineState {
  mine: MineRecord; expectedSensors: number; scenarios: DemoScenario[]; role: Role; scenario: ScenarioId; scenarioHistory: ScenarioId[];
  zones: Zone[]; sensors: Sensor[]; readings: Reading[]; alerts: MineAlert[]; workers: Worker[]; checkpoints: Checkpoint[];
  inspections: Inspection[]; hazards: Hazard[]; scans: ScanRecord[]; vendors: VendorRecord[]; sources: SourceRecord[]; integrations: IntegrationRecord[]; audit: AuditEvent[];
  darkMode: boolean; reducedMotion: boolean; notificationMuted: boolean; sourceFilter: string; heroCollapsed: boolean; presenterMode: boolean;
  tourOpen: boolean; tourStep: number; drillActive: boolean; activeZoneId: string | null;
  setRole: (role: Role) => void; setScenario: (scenario: ScenarioId) => void; setDarkMode: (value: boolean) => void; setReducedMotion: (value: boolean) => void;
  setNotificationMuted: (value: boolean) => void; setSourceFilter: (value: string) => void; setHeroCollapsed: (value: boolean) => void;
  setPresenterMode: (value: boolean) => void; setTourOpen: (value: boolean) => void; setTourStep: (value: number) => void; setDrillActive: (value: boolean) => void;
  setActiveZoneId: (value: string | null) => void; addAudit: (action: string, detail: string, actor?: string) => void;
  acknowledgeAlert: (id: string) => void; linkAlertToTask: (id: string, taskId: string) => void; resolveAlert: (id: string) => void;
  createInspection: (zoneId: string, title?: string) => string | undefined; updateInspection: (id: string, status: Inspection['status'], observation?: string) => void;
  setWorkerExit: (workerId: string, verifiedOut: boolean) => void; registerCheckpoint: (workerId: string, checkpoint: string, time: string) => void;
  setIntegrationStatus: (id: string, status: IntegrationStatus) => void; resetDemo: () => void;
}

const freshAudit = (action: string, detail: string, actor = 'Control room'): AuditEvent => ({
  id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  time: new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), action, detail, actor,
});
const seedIntegrations: IntegrationRecord[] = [
  { id: 'opc40560', name: 'OPC UA for Mining (OPC-40560)', status: 'Configuration required', note: 'Interoperability target — planned, not implemented.' },
  { id: 'telemetry', name: 'Mine telemetry adapter', status: 'Not connected', note: 'No live mine data connection in this demo.' },
  { id: 'map-upload', name: 'Map upload', status: 'Not connected', note: 'Local demonstration upload only.' },
];
const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem('mineguard-demo-v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed?.state?.darkMode === 'boolean') {
        return parsed.state.darkMode;
      }
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

const initialState = () => ({
  mine: structuredClone(mine), expectedSensors, scenarios: structuredClone(seedScenarios), role: 'Mine Manager' as Role,
  scenario: 'normal' as ScenarioId, scenarioHistory: ['normal'] as ScenarioId[], zones: structuredClone(seedZones), sensors: structuredClone(seedSensors),
  readings: structuredClone(seedReadings), alerts: structuredClone(seedAlerts), workers: structuredClone(seedWorkers), checkpoints: structuredClone(seedCheckpoints),
  inspections: structuredClone(seedInspections), hazards: structuredClone(seedHazards), scans: structuredClone(seedScans), vendors: structuredClone(vendors),
  sources: structuredClone(sources), integrations: structuredClone(seedIntegrations), audit: structuredClone(seedAudit), darkMode: getInitialDarkMode(), reducedMotion: false,
  notificationMuted: false, sourceFilter: '', heroCollapsed: false, presenterMode: false, tourOpen: false, tourStep: 0, drillActive: false, activeZoneId: null,
});
const seedInspectionIds = new Set(seedInspections.map((inspection) => inspection.id));

export const useMineStore = create<MineState>()(persist((set, get) => ({
  ...initialState(),
  setRole: (role) => set({ role }),
  setScenario: (scenario) => {
    if (scenario === get().scenario) return;
    const generated = scenarioSnapshot(scenario);
    const currentAlerts = new Map(get().alerts.map((alert) => [alert.id, alert]));
    const alerts = generated.alerts.map((alert) => currentAlerts.has(alert.id) ? { ...alert, state: currentAlerts.get(alert.id)!.state } : alert);
    const currentInspections = new Map(get().inspections.map((inspection) => [inspection.id, inspection]));
    const inspections = generated.inspections.map((inspection) => {
      const previous = currentInspections.get(inspection.id);
      return previous ? { ...inspection, status: previous.status, due: previous.due, team: previous.team, observations: previous.observations } : inspection;
    }).concat(get().inspections.filter((inspection) => !seedInspectionIds.has(inspection.id)));
    set({ ...generated, inspections, alerts, scenario, scenarioHistory: [...get().scenarioHistory, scenario], activeZoneId: scenario === 'sensor-failure' ? 'tunnel-b' : null, audit: [...get().audit, freshAudit('Scenario changed', `Demo scenario: ${scenario}`)] });
  },
  setDarkMode: (darkMode) => {
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('theme-dark');
      } else {
        document.documentElement.classList.remove('theme-dark');
      }
    }
    set({ darkMode });
  }, setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setNotificationMuted: (notificationMuted) => set({ notificationMuted }), setSourceFilter: (sourceFilter) => set({ sourceFilter }),
  setHeroCollapsed: (heroCollapsed) => set({ heroCollapsed }), setPresenterMode: (presenterMode) => set({ presenterMode }),
  setTourOpen: (tourOpen) => set({ tourOpen, tourStep: tourOpen ? 0 : get().tourStep }), setTourStep: (tourStep) => set({ tourStep }), setDrillActive: (drillActive) => set({ drillActive }),
  setActiveZoneId: (activeZoneId) => set({ activeZoneId }),
  addAudit: (action, detail, actor) => set({ audit: [...get().audit, freshAudit(action, detail, actor)] }),
  acknowledgeAlert: (id) => {
    const alerts = get().alerts.map((alert) => alert.id === id && alert.state === 'new' ? { ...alert, state: 'acknowledged' as const } : alert);
    set({ alerts, audit: [...get().audit, freshAudit('Alert acknowledged', `Alert ${id}`)] });
  },
  linkAlertToTask: (id, taskId) => {
    const alerts = get().alerts.map((alert) => alert.id === id ? { ...alert, state: 'linked' as const, taskId } : alert);
    set({ alerts, audit: [...get().audit, freshAudit('Alert linked to task', `Alert ${id} → ${taskId}`)] });
  },
  resolveAlert: (id) => {
    const alerts = get().alerts.map((alert) => alert.id === id ? { ...alert, state: 'resolved' as const } : alert);
    set({ alerts, audit: [...get().audit, freshAudit('Alert resolved', `Alert ${id}`)] });
  },
  createInspection: (zoneId, title) => {
    const zone = get().zones.find((candidate) => candidate.id === zoneId);
    if (!zone) return undefined;
    const inspection: Inspection = { id: `in-${Date.now()}`, zoneId, score: 0, reason: title ?? 'New verification task', evidence: ['Task created from demo workspace'], lastInspection: `${zone.lastInspectionDays} days ago`, requiredVerification: title ?? 'Verify zone information', team: 'Maintenance', due: 'Today · 14:00', status: 'Assigned' };
    set({ inspections: [...get().inspections, inspection], audit: [...get().audit, freshAudit('Inspection task created', `${zone.name}: ${inspection.requiredVerification}`)] });
    return inspection.id;
  },
  updateInspection: (id, status, observations) => {
    const inspections = get().inspections.map((inspection) => inspection.id === id ? { ...inspection, status, observations: observations ?? inspection.observations } : inspection);
    set({ inspections, audit: [...get().audit, freshAudit('Inspection updated', `${id}: ${status}${observations ? ` — ${observations}` : ''}`)] });
  },
  setWorkerExit: (workerId, verifiedOut) => {
    const workers = get().workers.map((worker) => worker.id === workerId ? { ...worker, exitStatus: verifiedOut ? 'verified-out' as const : 'unconfirmed' as const } : worker);
    set({ workers, audit: [...get().audit, freshAudit(verifiedOut ? 'Worker exit verified' : 'Worker exit marked unconfirmed', workerId)] });
  },
  registerCheckpoint: (workerId, checkpoint, time) => {
    const worker = get().workers.find((candidate) => candidate.id === workerId);
    if (!worker) return;
    const item: Checkpoint = { id: `cp-${workerId}-${Date.now()}`, workerId, zoneId: worker.location.includes('Tunnel B') ? 'tunnel-b' : 'shaft', label: checkpoint, recordedAt: time, verified: true };
    const workers = get().workers.map((candidate) => candidate.id === workerId ? { ...candidate, lastCheckpoint: `${checkpoint}, ${time}`, lastCommunication: time, checkpointOverdue: false } : candidate);
    set({ workers, checkpoints: [...get().checkpoints, item], audit: [...get().audit, freshAudit('Checkpoint registered', `${workerId}: ${checkpoint} at ${time}`)] });
  },
  setIntegrationStatus: (id, status) => {
    const integrations = get().integrations.map((integration) => integration.id === id ? { ...integration, status } : integration);
    set({ integrations, audit: [...get().audit, freshAudit('Integration status changed', `${id}: ${status}`)] });
  },
  resetDemo: () => set({ ...initialState(), role: get().role, audit: structuredClone(seedAudit) }),
}), { name: 'mineguard-demo-v1', version: 1 }));

export const roles = demoRoles;
