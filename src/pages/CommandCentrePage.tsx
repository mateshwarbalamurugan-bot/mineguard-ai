import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, Bell, Check, Clock3, Compass,
  Cpu, Layers, Radio, RotateCcw, TriangleAlert, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMineStore } from '../store/useMineStore';
import { seedScenarios } from '../data/seed';
import { freshSensorCount, freshnessPercent, sortAlerts } from '../simulation/scenarioEngine';
import { MetricCard, SectionHeader } from '../components/Primitives';
import { ProvenanceBadge } from '../components/Badges';
import { RoverCadSimulation } from '../components/RoverCadSimulation';
import { AlertQueue } from '../components/AlertQueue';
import { ZoneDrawer } from '../components/ZoneDrawer';
import { GuidedDemoModal } from '../components/GuidedDemoModal';
import type { AuditEvent, MineAlert, ScenarioId } from '../models/types';

const scenarioConfig: Record<ScenarioId, { label: string; desc: string; focusZone?: string }> = {
  normal: {
    label: 'Normal Baseline',
    desc: 'All sensors and atmospheric levels are within safe operating limits.',
  },
  'gas-anomaly': {
    label: 'Gas Anomaly (CH4)',
    desc: 'Elevated methane (1.1%) detected in Tunnel B. Ventilation review recommended.',
    focusZone: 'tunnel-b',
  },
  temperature: {
    label: 'High Temperature',
    desc: 'Thermal alert in Tunnel B exceeding the 35°C threshold.',
    focusZone: 'tunnel-b',
  },
  'rising-water': {
    label: 'Water Influx',
    desc: 'Sump water level trending upward in Pumping Station.',
    focusZone: 'pump',
  },
  'sensor-failure': {
    label: 'Sensor Comm Loss',
    desc: 'Sensor B-CH4-02 offline. Zone marked uncertain until verified.',
    focusZone: 'tunnel-b',
  },
  'stale-data': {
    label: 'Stale Telemetry',
    desc: 'Telemetry heartbeat delayed in Tunnel A.',
    focusZone: 'tunnel-a',
  },
};

export function CommandCentrePage() {
  const zones = useMineStore((state) => state.zones);
  const sensors = useMineStore((state) => state.sensors);
  const alerts = useMineStore((state) => state.alerts);
  const workers = useMineStore((state) => state.workers);
  const inspections = useMineStore((state) => state.inspections);
  const hazards = useMineStore((state) => state.hazards);
  const audit = useMineStore((state) => state.audit);
  const expected = useMineStore((state) => state.expectedSensors);
  const scenario = useMineStore((state) => state.scenario);
  const activeZoneId = useMineStore((state) => state.activeZoneId);

  const setScenario = useMineStore((state) => state.setScenario);
  const acknowledgeAlert = useMineStore((state) => state.acknowledgeAlert);
  const linkAlertToTask = useMineStore((state) => state.linkAlertToTask);
  const resolveAlert = useMineStore((state) => state.resolveAlert);
  const setActiveZoneId = useMineStore((state) => state.setActiveZoneId);
  const setTourOpen = useMineStore((state) => state.setTourOpen);
  const addAudit = useMineStore((state) => state.addAudit);
  const resetDemo = useMineStore((state) => state.resetDemo);
  const createInspection = useMineStore((state) => state.createInspection);
  const updateInspection = useMineStore((state) => state.updateInspection);

  const [resetDialog, setResetDialog] = useState(false);

  const openAlerts = useMemo(() => sortAlerts(alerts), [alerts]);
  const activeAlerts = openAlerts.filter((alert) => alert.state !== 'resolved');
  const pending = activeAlerts.filter((alert) => alert.state === 'new').length;

  const priorityRows = useMemo(() => [...inspections].sort((a, b) => b.score - a.score).slice(0, 5), [inspections]);
  const selectedZone = zones.find((zone) => zone.id === activeZoneId) ?? null;

  const freshCount = freshSensorCount(sensors);
  const freshness = freshnessPercent(sensors, expected);
  const taskAttention = inspections.filter((i) => i.status === 'Queued' || i.status === 'Assigned').length;
  const undergroundWorkers = workers.filter((w) => w.exitStatus !== 'verified-out').length;
  const overdueCheckpoints = workers.filter((w) => w.checkpointOverdue).length;

  const events = [...audit].reverse().slice(0, 5);

  function runScenario(value: ScenarioId) {
    setScenario(value);
    const cfg = scenarioConfig[value];
    if (cfg?.focusZone) {
      setActiveZoneId(cfg.focusZone);
    }
  }

  function createLinkedInspection(alert: MineAlert) {
    const taskId = createInspection(alert.zoneId, `Verify condition: ${alert.recommendedAction}`);
    if (taskId) linkAlertToTask(alert.id, taskId);
  }

  function doReset() {
    resetDemo();
    setActiveZoneId(null);
    setResetDialog(false);
  }

  return (
    <div className="page-stack command-page">
      {/* 1. Header with Shift Context & Quick Actions */}
      <header className="ops-header-bar" aria-label="Operations Overview">
        <div className="ops-header-left">
          <div className="ops-eyebrow">
            <span className="live-dot" />
            <span>KESTREL RIDGE · SEAM 4 · DAY SHIFT</span>
            <span className="mono-clock">LIVE DEMO</span>
          </div>
          <h1 className="ops-title">Operations Command Centre</h1>
          <p className="ops-subtitle">
            Autonomous reconnaissance, real-time atmospheric telemetry, and proactive hazard response.
          </p>
        </div>

        <div className="ops-header-actions">
          <button
            type="button"
            className="button button-secondary guided-btn"
            onClick={() => setTourOpen(true)}
            aria-label="Start Guided Demo Tour"
          >
            <Compass size={14} aria-hidden="true" />
            <span>Guided Tour</span>
          </button>
          <button
            type="button"
            className="button button-ghost reset-btn"
            onClick={() => setResetDialog(true)}
            aria-label="Reset simulation data to default"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset Demo</span>
          </button>
        </div>
      </header>

      {/* 2. Key Operational Metrics */}
      <section className="kpi-grid command-kpi-grid" aria-label="Operational Metrics Summary">
        <MetricCard
          label="Active Alerts"
          value={activeAlerts.length}
          note={pending > 0 ? `${pending} need acknowledgment` : 'All alerts acknowledged'}
          icon={<Bell size={16} />}
          tone={activeAlerts.length > 0 ? 'alert' : 'neutral'}
        />
        <MetricCard
          label="Environmental Sensors"
          value={`${freshCount} / ${sensors.length}`}
          note={`${freshness}% reporting normally`}
          icon={<Radio size={16} />}
          tone={freshCount < sensors.length ? 'warning' : 'teal'}
        />
        <MetricCard
          label="Personnel Underground"
          value={undergroundWorkers}
          note={overdueCheckpoints > 0 ? `${overdueCheckpoints} overdue checkpoint` : 'All check-ins on schedule'}
          icon={<Users size={16} />}
          tone={overdueCheckpoints > 0 ? 'alert' : 'neutral'}
        />
        <MetricCard
          label="Pending Inspections"
          value={taskAttention}
          note="Queued verification tasks"
          icon={<TriangleAlert size={16} />}
          tone="warning"
        />
      </section>

      {/* 3. HERO SHOWCASE: Autonomous Inspection Rover CAD Simulation */}
      <section className="mine-depth-card hero-rover-section" aria-label="Autonomous Rover Inspection CAD Simulation">
        <div className="mine-depth-card-head">
          <div className="head-left">
            <span className="section-title-badge">
              <Cpu size={15} className="text-cyan glow-cyan" aria-hidden="true" />
              <strong>AUTONOMOUS ROVER SIMULATION</strong>
            </span>
            <span className="mine-depth-live">
              <span className="live-dot" />
              STARK HOLOGRAPHIC CAD · 9 HARDWARE SUBSYSTEMS
            </span>
          </div>

          <div className="head-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/map" className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 10px' }}>
              <Layers size={13} aria-hidden="true" />
              <span>Open 3D Mine Map</span>
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mine-depth-viewport" style={{ minHeight: '520px' }}>
          <RoverCadSimulation height={540} />
        </div>

        <div className="mine-depth-card-foot">
          <div className="foot-status-pills">
            <span className="foot-pill pill-cyan">
              <span className="pill-dot cyan" />
              LiDAR 360° Scanning Active · Thermal Telemetry Online
            </span>
            <span className="foot-caption">
              Drag to orbit · Click any part to inspect specs · Drag the Explode slider to view hardware internals
            </span>
          </div>
        </div>
      </section>

      {/* 4. Test Scenario Switcher */}
      <section className="scenario-switcher-bar" aria-label="Test Conditions">
        <div className="scenario-bar-label">
          <Radio size={14} aria-hidden="true" />
          <span>SIMULATE CONDITIONS:</span>
        </div>
        <div className="scenario-buttons-scroll" role="radiogroup" aria-label="Select simulation condition">
          {seedScenarios.map((item) => {
            const isCurrent = scenario === item.id;
            const cfg = scenarioConfig[item.id] || { label: item.label, desc: item.description };
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isCurrent}
                className={`scenario-pill ${isCurrent ? 'scenario-pill-active' : ''}`}
                onClick={() => runScenario(item.id)}
              >
                <span className="pill-indicator" />
                <span className="pill-title">{cfg.label}</span>
              </button>
            );
          })}
        </div>
        <div className="scenario-detail-preview">
          <span>{scenarioConfig[scenario]?.desc || 'Demo condition active'}</span>
          <ProvenanceBadge type="SIMULATED" />
        </div>
      </section>

      {/* 5. Direct Operations Grid: Alert Queue & Priority Inspections */}
      <div className="command-primary-grid" style={{ marginTop: '16px' }}>
        {/* Active Alerts Queue */}
        <section aria-label="Active Alerts Queue">
          <AlertQueue
            alerts={activeAlerts}
            onAcknowledge={acknowledgeAlert}
            onOpenZone={setActiveZoneId}
            onLinkToTask={createLinkedInspection}
            onResolve={resolveAlert}
          />
        </section>

        {/* Priority Inspections & Shift Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Inspection Priorities */}
          <section className="panel priority-panel" aria-labelledby="priority-heading">
            <div className="priority-head">
              <SectionHeader
                title="Priority Inspections"
                aside="Ranked by risk and sensor age"
                action={<ProvenanceBadge type="SIMULATED" />}
              />
              <Link to="/inspections" className="text-link">
                <span>View all</span>
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>

            <div className="priority-list">
              {priorityRows.map((item, index) => {
                const zone = zones.find((candidate) => candidate.id === item.zoneId);
                return (
                  <div className="priority-row" key={item.id}>
                    <button
                      type="button"
                      className="priority-row-btn"
                      onClick={() => setActiveZoneId(item.zoneId)}
                      title={`Inspect ${zone?.name || item.zoneId}`}
                    >
                      <span className="priority-rank">#{String(index + 1).padStart(2, '0')}</span>
                      <span className="priority-label">
                        <strong>{zone?.name ?? item.zoneId}</strong>
                        <small>{item.reason}</small>
                      </span>
                      <span className="score-number">{item.score}</span>
                    </button>

                    <div className="priority-row-actions">
                      <select
                        className="compact-select"
                        aria-label={`Update status for ${item.id}`}
                        value={item.status}
                        onChange={(e) => updateInspection(item.id, e.target.value as typeof item.status)}
                      >
                        <option>Queued</option>
                        <option>Assigned</option>
                        <option>In progress</option>
                        <option>Complete</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Shift Activity Log */}
          <section className="panel timeline-panel" aria-labelledby="activity-heading">
            <div className="timeline-head">
              <SectionHeader
                title="Shift Activity Log"
                aside="Recent operator events"
              />
              <ProvenanceBadge type="SIMULATED" />
            </div>

            <div className="timeline-list">
              {events.length ? (
                events.map((event) => <TimelineRow key={event.id} event={event} />)
              ) : (
                <div className="empty-state">
                  <Clock3 size={18} />
                  <strong>No recent shift events</strong>
                </div>
              )}
            </div>

            <div className="timeline-foot">
              <button
                type="button"
                className="text-button"
                onClick={() => addAudit('Shift inspection confirmed', 'Control room verified operational priorities')}
              >
                <span>+ Log Handover Note</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* 6. Statutory & Non-claim Disclaimer Notice */}
      <div className="command-safety-note">
        <Users size={14} aria-hidden="true" />
        <span>Simulated demonstration data · Decision support prototype only · No live mine connection</span>
        <Link to="/about">System boundaries <ArrowRight size={12} aria-hidden="true" /></Link>      </div>

      {/* Contextual Zone Drawer */}
      {selectedZone && (
        <ZoneDrawer
          zone={selectedZone}
          sensors={sensors}
          inspections={inspections}
          hazards={hazards}
          workers={workers}
          scenario={scenario}
          onClose={() => setActiveZoneId(null)}
          onCreateInspection={createInspection}
        />
      )}

      {/* Interactive Guided Demo Modal */}
      <GuidedDemoModal />

      {/* Reset Confirmation Dialog */}
      {resetDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setResetDialog(false);
          }}
        >
          <section
            className="confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <div className="confirm-icon">
              <RotateCcw size={20} />
            </div>
            <h2 id="reset-title">Reset Demo to Baseline?</h2>
            <p>
              This will reset all zone telemetry, inspection tasks, and alert acknowledgments to their default state.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setResetDialog(false)}
              >
                Keep Current State
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={doReset}
              >
                Confirm Reset
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: AuditEvent }) {
  const icon = event.action.toLowerCase().includes('alert') ? (
    <Bell size={13} />
  ) : event.action.toLowerCase().includes('inspection') ? (
    <Check size={13} />
  ) : (
    <Activity size={13} />
  );

  return (
    <div className="timeline-row">
      <span className="timeline-icon">{icon}</span>
      <div className="timeline-event">
        <strong>{event.action}</strong>
        <small>{event.detail}</small>
      </div>
      <span className="timeline-actor">{event.actor}</span>
      <time>{event.time}</time>
    </div>
  );
}
