import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Battery, Bell,
  Bot, ChevronRight, Clock3, Compass,
  Cpu, Layers, Radio, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMineStore } from '../store/useMineStore';
import { seedScenarios } from '../data/seed';
import { freshSensorCount, freshnessPercent, sortAlerts } from '../simulation/scenarioEngine';
import { MetricCard, SectionHeader } from '../components/Primitives';
import { ProvenanceBadge } from '../components/Badges';
import { AlertQueue } from '../components/AlertQueue';
import { RoverCadSimulation } from '../components/RoverCadSimulation';
import { ZoneDrawer } from '../components/ZoneDrawer';
import type { MineAlert, ScenarioId } from '../models/types';

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
  const [showRoverCad, setShowRoverCad] = useState(true);

  const openAlerts = useMemo(() => sortAlerts(alerts), [alerts]);
  const activeAlerts = openAlerts.filter((alert) => alert.state !== 'resolved');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'Critical').length;
  const highCount = activeAlerts.filter((a) => a.severity === 'High').length;
  const mediumCount = activeAlerts.filter((a) => a.severity === 'Medium').length;
  const lowCount = activeAlerts.filter((a) => a.severity === 'Low').length;

  const priorityRows = useMemo(() => [...inspections].sort((a, b) => b.score - a.score).slice(0, 5), [inspections]);
  const selectedZone = zones.find((zone) => zone.id === activeZoneId) ?? null;

  const freshCount = freshSensorCount(sensors);
  const freshness = freshnessPercent(sensors, expected);
  const undergroundWorkers = workers.filter((w) => w.exitStatus !== 'verified-out').length;
  const overdueCheckpoints = workers.filter((w) => w.checkpointOverdue).length;

  const events = [...audit].reverse().slice(0, 6);

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
      {/* 1. Header with Operational Context & Actions */}
      <header className="ops-header-bar" aria-label="Operations Overview">
        <div className="ops-header-left">
          <div className="ops-eyebrow">
            <span className="live-dot" />
            <span>KESTREL RIDGE MINE · SEAM #4</span>
            <span className="mono-clock">LIVE TELEMETRY</span>
          </div>
          <h1 className="ops-title">Command Center</h1>
          <p className="ops-subtitle">
            Monitor underground operations, robotic systems and mining safety from one place.
          </p>
        </div>

        <div className="ops-header-actions">
          <div className="header-status-chip">
            <span className={`status-dot ${criticalCount > 0 ? 'dot-red' : 'dot-green'}`} />
            <span>{scenarioConfig[scenario]?.label || 'Operational Baseline'}</span>
          </div>

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

      {/* 2. Key Operational KPI Cards (Section 5) */}
      <section className="kpi-grid command-kpi-grid" aria-label="Operational Metrics Summary">
        <MetricCard
          label="Total Robots"
          value="4 Units"
          note="3 underground · 1 maintenance bay"
          icon={<Bot size={16} />}
          tone="neutral"
        />
        <MetricCard
          label="Active Robots"
          value="2 Operating"
          note="RVR-04A Inspecting · DRN-02S Returning"
          icon={<Cpu size={16} />}
          tone="teal"
        />
        <MetricCard
          label="Hazards Detected"
          value={activeAlerts.length}
          note={activeAlerts.length > 0 ? `${activeAlerts.length} active anomalies logged` : 'Zero active anomalies'}
          icon={<AlertTriangle size={16} />}
          tone={activeAlerts.length > 0 ? 'warning' : 'teal'}
        />
        <MetricCard
          label="Critical Alerts"
          value={criticalCount}
          note={criticalCount > 0 ? 'Immediate shift triage required' : 'All critical thresholds clear'}
          icon={<Bell size={16} />}
          tone={criticalCount > 0 ? 'alert' : 'teal'}
        />
      </section>

      {/* 3. Main Dashboard Visualizations: 4 Content Areas (Section 5 A, B, C, D) */}
      <div className="command-visualizations-grid">
        {/* A. Underground Operations Overview */}
        <section className="panel command-card-panel">
          <div className="card-panel-head">
            <div>
              <h3>Underground Operations Overview</h3>
              <p>Subterranean depth levels (-120m to -360m) and spatial coverage</p>
            </div>
            <Link to="/map" className="button button-ghost compact-action">
              <Layers size={13} />
              <span>Full 3D Map</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="ops-overview-body">
            <div className="ops-spatial-sectors">
              {zones.map((zone) => {
                const zoneSensors = sensors.filter((s) => s.zoneId === zone.id);
                const hasAlert = activeAlerts.some((a) => a.zoneId === zone.id);
                return (
                  <button
                    key={zone.id}
                    className={`ops-sector-chip ${hasAlert ? 'sector-alert' : ''} ${activeZoneId === zone.id ? 'sector-active' : ''}`}
                    onClick={() => setActiveZoneId(zone.id)}
                    title={`Inspect sector ${zone.name}`}
                  >
                    <div className="sector-chip-top">
                      <span className={`sector-dot state-${zone.state.toLowerCase()}`} />
                      <strong>{zone.name}</strong>
                    </div>
                    <div className="sector-chip-foot">
                      <span>{zoneSensors.length} Sensors</span>
                      <small>{zone.state}</small>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="ops-depth-meta">
              <span>Depth Range: -120m to -360m</span>
              <span>Sensors Reporting: {freshCount} / {sensors.length} ({freshness}%)</span>
              <span>Personnel Underground: {undergroundWorkers}{overdueCheckpoints > 0 ? ` (${overdueCheckpoints} overdue)` : ''}</span>
            </div>
          </div>
        </section>

        {/* B. Robot Fleet Status */}
        <section className="panel command-card-panel">
          <div className="card-panel-head">
            <div>
              <h3>Robot Fleet Status</h3>
              <p>Autonomous rover and drone operational states</p>
            </div>
            <Link to="/robotics" className="button button-ghost compact-action">
              <Bot size={13} />
              <span>Manage Fleet</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="fleet-status-body">
            <div className="fleet-status-breakdown">
              <div className="fleet-status-item">
                <span className="fleet-status-badge status-inspecting">Inspecting</span>
                <strong>1</strong>
                <small>Rover MK-IV Alpha</small>
              </div>
              <div className="fleet-status-item">
                <span className="fleet-status-badge status-returning">Returning</span>
                <strong>1</strong>
                <small>Drone Scout-2</small>
              </div>
              <div className="fleet-status-item">
                <span className="fleet-status-badge status-idle">Idle / Docked</span>
                <strong>1</strong>
                <small>Rover MK-III Bravo</small>
              </div>
              <div className="fleet-status-item">
                <span className="fleet-status-badge status-maintenance">Maintenance</span>
                <strong>1</strong>
                <small>Surveyor 01</small>
              </div>
            </div>

            <div className="fleet-quick-status">
              <div className="fleet-telemetry-pill">
                <Battery size={13} />
                <span>Avg Fleet Battery: <strong>56%</strong></span>
              </div>
              <div className="fleet-telemetry-pill">
                <Radio size={13} />
                <span>Subterranean Mesh: <strong>Connected</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* C. Hazard Overview */}
        <section className="panel command-card-panel">
          <div className="card-panel-head">
            <div>
              <h3>Hazard Severity Distribution</h3>
              <p>Identified anomalies categorized by risk level</p>
            </div>
            <Link to="/hazards" className="button button-ghost compact-action">
              <AlertTriangle size={13} />
              <span>View All ({activeAlerts.length})</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="hazard-distribution-body">
            <div className="severity-bar-breakdown">
              <div className="severity-dist-row">
                <div className="sev-dist-label">
                  <span className="sev-dist-dot sev-dot-critical" />
                  <span>Critical Risk</span>
                </div>
                <div className="sev-dist-val">
                  <strong>{criticalCount}</strong>
                  <div className="sev-progress-track">
                    <div className="sev-progress-fill fill-critical" style={{ width: `${Math.min(100, criticalCount * 25)}%` }} />
                  </div>
                </div>
              </div>

              <div className="severity-dist-row">
                <div className="sev-dist-label">
                  <span className="sev-dist-dot sev-dot-high" />
                  <span>High Severity</span>
                </div>
                <div className="sev-dist-val">
                  <strong>{highCount}</strong>
                  <div className="sev-progress-track">
                    <div className="sev-progress-fill fill-high" style={{ width: `${Math.min(100, highCount * 25)}%` }} />
                  </div>
                </div>
              </div>

              <div className="severity-dist-row">
                <div className="sev-dist-label">
                  <span className="sev-dist-dot sev-dot-medium" />
                  <span>Medium Severity</span>
                </div>
                <div className="sev-dist-val">
                  <strong>{mediumCount}</strong>
                  <div className="sev-progress-track">
                    <div className="sev-progress-fill fill-medium" style={{ width: `${Math.min(100, mediumCount * 25)}%` }} />
                  </div>
                </div>
              </div>

              <div className="severity-dist-row">
                <div className="sev-dist-label">
                  <span className="sev-dist-dot sev-dot-low" />
                  <span>Low / Advisory</span>
                </div>
                <div className="sev-dist-val">
                  <strong>{lowCount}</strong>
                  <div className="sev-progress-track">
                    <div className="sev-progress-fill fill-low" style={{ width: `${Math.min(100, lowCount * 25)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* D. Recent Activity Feed */}
        <section className="panel command-card-panel">
          <div className="card-panel-head">
            <div>
              <h3>Recent Shift Activity</h3>
              <p>Verified operator and automated event log</p>
            </div>
            <ProvenanceBadge type="SIMULATED" />
          </div>

          <div className="activity-feed-body">
            <div className="timeline-list">
              {events.map((event) => (
                <div className="activity-event-row" key={event.id}>
                  <div className="activity-time-tag">
                    <Clock3 size={11} />
                    <span>{event.time}</span>
                  </div>
                  <div className="activity-content">
                    <strong>{event.action}</strong>
                    <span>{event.detail}</span>
                  </div>
                  <span className="activity-actor">{event.actor}</span>
                </div>
              ))}
            </div>

            <div className="activity-feed-foot">
              <button
                type="button"
                className="text-button"
                onClick={() => addAudit('Shift inspection confirmed', 'Control room verified operational priorities')}
              >
                + Log Handover Event
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Interactive Autonomous Rover CAD Hardware Simulation */}
      <section className="panel hero-rover-section" aria-label="Autonomous Rover Inspection Simulation">
        <div className="card-panel-head">
          <div className="head-left">
            <span className="section-title-badge">
              <Cpu size={15} className="text-cyan glow-cyan" aria-hidden="true" />
              <strong>AUTONOMOUS ROVER RECONNAISSANCE SIMULATION</strong>
            </span>
            <span className="mine-depth-live">
              <span className="live-dot" />
              STARK HARDWARE CAD · 9 SUBSYSTEMS
            </span>
          </div>

          <div className="head-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setShowRoverCad((prev) => !prev)}
            >
              {showRoverCad ? 'Minimize Simulation' : 'Expand Simulation'}
            </button>
            <Link to="/robotics" className="button button-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
              <span>Robotics Workspace</span>
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {showRoverCad && (
          <div className="mine-depth-viewport" style={{ minHeight: '520px' }}>
            <RoverCadSimulation height={540} />
          </div>
        )}

        <div className="mine-depth-card-foot">
          <div className="foot-status-pills">
            <span className="foot-pill pill-cyan">
              <span className="pill-dot cyan" />
              LiDAR 360° Scanning Active · Thermal Telemetry Online
            </span>
            <span className="foot-caption">
              Drag to orbit · Click parts to inspect technical specs · Drag the Explode slider to view hardware internals
            </span>
          </div>
        </div>
      </section>

      {/* 5. Condition Simulator Toolbar */}
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

      {/* 6. Operations Triage Queue & Priority Inspections */}
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

        {/* Priority Inspections */}
        <section className="panel priority-panel" aria-labelledby="priority-heading">
          <div className="priority-head">
            <SectionHeader
              title="Priority Inspections & Work Orders"
              aside="Ranked by risk and sensor age"
              action={<ProvenanceBadge type="SIMULATED" />}
            />
            <Link to="/incidents" className="text-link">
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
      </div>

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

      {/* Reset Confirmation Dialog */}
      {resetDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setResetDialog(false);
          }}
        >
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
            <div className="confirm-icon">
              <RotateCcw size={20} />
            </div>
            <h2 id="reset-modal-title">Reset Demonstration State</h2>
            <p>
              This action restores all seeded baseline sensors, worker statuses, alerts and scenarios to their default values.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setResetDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={doReset}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
