import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BookOpen, Bot, Check, CheckCircle2,
  CircleHelp, ClipboardCheck, CloudUpload, Database, Download, FileText,
  Info, MapPin, Radio, RefreshCw, Search, ShieldAlert, Users,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { PageTitle, SectionHeader, MetricCard, SourceLink } from '../components/Primitives';
import { ProvenanceBadge, StatusBadge } from '../components/Badges';
import { MineSchematic } from '../components/MineSchematic';
import { Mine3DScene } from '../components/Mine3DScene';
import { ZoneDrawer } from '../components/ZoneDrawer';
import { useMineStore } from '../store/useMineStore';
import { confidenceChecks, isThresholdBreached } from '../rules/confidenceEngine';
import { freshSensorCount, freshnessPercent } from '../simulation/scenarioEngine';
import { seedScans } from '../data/seed';
import { sources } from '../data/sources';
import { vendors as vendorCatalog } from '../data/vendors';
import type { Inspection, ScenarioId, Sensor, Zone } from '../models/types';

const scenarioLabels: Record<ScenarioId, string> = {
  normal: 'Normal baseline', 'rising-water': 'Rising water', temperature: 'Temperature rise',
  'gas-anomaly': 'Gas anomaly', 'sensor-failure': 'Sensor communication failure', 'stale-data': 'Stale data',
};
const zoneName = (zones: Zone[], id: string) => zones.find((zone) => zone.id === id)?.name ?? id;
const fmt = (value: number, digits = 1) => Number(value.toFixed(digits)).toString();

function SimNote({ children = 'Fictional demonstration data · no live mine connection' }: { children?: string }) {
  return <div className="workspace-note"><Info size={14}/><span>{children}</span><ProvenanceBadge type="SIMULATED"/></div>;
}

function Panel({ title, aside, action, children, className = '' }: { title: string; aside?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel work-panel ${className}`}><SectionHeader title={title} aside={aside} action={action}/>{children}</section>;
}

function TechnologyWorkspaceTabs({ active }: { active: 'directory' | 'advisor' | 'radar' }) {
  const tabs = [
    { id: 'directory', label: 'Vendor directory', path: '/vendors' },
    { id: 'advisor', label: 'Technology advisor', path: '/advisor' },
    { id: 'radar', label: 'Technology radar', path: '/radar' },
  ] as const;
  return <nav className="workspace-tabs" aria-label="Vendor and technology tools">
    {tabs.map((tab) => <NavLink key={tab.id} to={tab.path} className={active === tab.id ? 'workspace-tab workspace-tab-active' : 'workspace-tab'} aria-current={active === tab.id ? 'page' : undefined}>{tab.label}</NavLink>)}
  </nav>;
}

function Sparkline({ value = 1, danger = false }: { value?: number; danger?: boolean }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const y = 25 - (Math.sin(i * 0.68 + value) * 5 + Math.cos(i * 0.23 + value) * 4 + (i > 18 ? (i - 18) * (danger ? 1.4 : .35) : 0));
    return `${i * 4.2},${Math.max(3, Math.min(29, y))}`;
  }).join(' ');
  return <svg className="work-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-label="Illustrative recent trend"><polyline points={points} fill="none" stroke={danger ? '#d97706' : '#16899e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function WorkspacePage() {
  const path = useLocation().pathname;
  switch (path) {
    case '/monitoring': return <MonitoringPage/>;
    case '/map': return <MapPage/>;
    case '/scans': return <ScansPage/>;
    case '/confidence': return <ConfidencePage/>;
    case '/inspections': return <InspectionsPage/>;
    case '/incidents': return <InspectionsPage/>;
    case '/workforce': return <WorkforcePage/>;
    case '/copilot': return <CopilotPage/>;
    case '/vendors': return <VendorsPage/>;
    case '/advisor': return <AdvisorPage/>;
    case '/radar': return <RadarPage/>;
    case '/reports': return <ReportsPage/>;
    case '/settings': return <SettingsPage/>;
    default: return <MonitoringPage/>;
  }
}

function MonitoringPage() {
  const sensors = useMineStore((s) => s.sensors);
  const zones = useMineStore((s) => s.zones);
  const alerts = useMineStore((s) => s.alerts);
  const scenario = useMineStore((s) => s.scenario);
  const setScenario = useMineStore((s) => s.setScenario);
  const [period, setPeriod] = useState('1h');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [measureFilter, setMeasureFilter] = useState('all');
  const measures = ['CH4', 'CO', 'O2', 'Temperature', 'Humidity', 'Water level', 'Airflow', 'Dust'];
  const filtered = sensors.filter((sensor) => (zoneFilter === 'all' || sensor.zoneId === zoneFilter) && (measureFilter === 'all' || sensor.measure === measureFilter));
  const cards = measures.map((measure) => sensors.find((sensor) => sensor.measure === measure)).filter((sensor): sensor is Sensor => !!sensor);
  const activeAlerts = alerts.filter((alert) => alert.state !== 'resolved');
  return <div className="page-stack">
    <PageTitle eyebrow="MONITORING · SIMULATED SHIFT" title="Live Mine Monitoring" detail="Review environmental measurements, communication health and configured demonstration thresholds."><span className="header-demo-label"><Radio size={14}/> DEMO FEED</span></PageTitle>
    <SimNote>All readings and threshold values on this page are illustrative sample data, not statutory limits or certified mine measurements.</SimNote>
    <div className="work-kpi-grid">
      <MetricCard label="Sensors reporting" value={`${freshSensorCount(sensors)} / 36`} note="12 sample sensor records shown" icon={<Radio size={16}/>}/>
      <MetricCard label="Freshness" value={`${freshnessPercent(sensors, 36)}%`} note="Reporting sample sensors / expected" tone="teal" icon={<Activity size={16}/>}/>
      <MetricCard label="Communication issues" value={sensors.filter((s) => s.status !== 'reporting').length} note="Stale or silent sample feeds" tone="warning" icon={<WifiIcon/>}/>
      <MetricCard label="Open alerts" value={activeAlerts.length} note="Unresolved sample alerts" tone={activeAlerts.some((a) => a.severity === 'High' || a.severity === 'Critical') ? 'alert' : 'neutral'} icon={<AlertTriangle size={16}/>}/>
    </div>
    <Panel title="Environmental measurements" aside="Select a card to review its source and trend" action={<div className="period-switch">{['1h', '6h', '24h', '7d'].map((item) => <button key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div>}>
      <div className="monitor-filter-row"><label>Mine zone<select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}><option value="all">All zones</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label><label>Measurement<select value={measureFilter} onChange={(e) => setMeasureFilter(e.target.value)}><option value="all">All measurements</option>{measures.map((m) => <option key={m}>{m}</option>)}</select></label><span className="muted-inline">Showing {filtered.length} sample sensors · period {period}</span></div>
      <div className="monitor-cards-grid">{cards.filter((sensor) => (zoneFilter === 'all' || sensor.zoneId === zoneFilter) && (measureFilter === 'all' || sensor.measure === measureFilter)).map((sensor) => {
        const breach = isThresholdBreached(sensor);
        const label = sensor.status === 'silent' ? 'No current reading' : sensor.status === 'stale' ? 'Stale reading' : breach ? 'Demo threshold crossed' : 'Reporting';
        return <article className={`monitor-measure-card ${sensor.status !== 'reporting' ? 'measure-missing' : breach ? 'measure-alert' : ''}`} key={sensor.id}>
          <div className="measure-card-top"><span>{sensor.measure}</span><span className={`sensor-state-pill ${sensor.status !== 'reporting' ? 'state-stale' : breach ? 'state-alert' : 'state-ok'}`}>{sensor.status !== 'reporting' ? <CircleHelp size={12}/> : breach ? <AlertTriangle size={12}/> : <CheckCircle2 size={12}/>} {label}</span></div>
          <div className="measure-main-value">{sensor.status === 'silent' ? '—' : `${fmt(sensor.value, 2)} `}<small>{sensor.status === 'silent' ? '' : sensor.unit}</small></div>
          <div className="measure-location">{sensor.id} · {zoneName(zones, sensor.zoneId)}</div>
          <Sparkline value={sensor.value} danger={breach || sensor.status !== 'reporting'}/>
          <div className="measure-meta"><span>Last sample <b>{sensor.lastReading}</b></span><span>Demo threshold <b>{sensor.threshold} {sensor.unit}</b></span></div>
          {sensor.status !== 'reporting' && <p className="measure-warning">No current reading. This is not a safe reading.</p>}
          <ProvenanceBadge type="SIMULATED"/>
        </article>;
      })}</div>
      {filtered.length === 0 && <div className="empty-state"><Search size={22}/><strong>No sensor matches these filters</strong><p>Change the zone or measurement selection.</p></div>}
    </Panel>
    <div className="work-two-col">
      <Panel title="Sensor communication status" aside="Status is separate from an environmental alarm">
        <div className="work-table-wrap"><table className="work-table"><thead><tr><th>Sensor</th><th>Zone</th><th>Measurement</th><th>Last update</th><th>Status</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id}><td className="mono">{s.id}</td><td>{zoneName(zones, s.zoneId)}</td><td>{s.measure}</td><td className="mono">{s.lastReading}</td><td><span className={`sensor-state-pill ${s.status === 'reporting' ? 'state-ok' : 'state-stale'}`}>{s.status}</span></td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title="Demo scenario controls" aside="Changes propagate to the shared demo model">
        <div className="scenario-grid">{(Object.keys(scenarioLabels) as ScenarioId[]).map((id) => <button key={id} className={`scenario-option ${scenario === id ? 'selected' : ''}`} onClick={() => setScenario(id)}><span>{scenarioLabels[id]}</span>{scenario === id && <Check size={14}/>}</button>)}</div>
        <p className="helper-copy">Scenario changes update sample readings, zone confidence, alerts and inspection priorities. Reset the demo from the Command Centre.</p>
      </Panel>
    </div>
    <Panel title="Alert history" aside="Unresolved sample alerts">
      <div className="work-alert-list">{activeAlerts.length ? activeAlerts.map((alert) => <div className="work-alert-row" key={alert.id}><span className={`severity-dot severity-${alert.severity.toLowerCase()}`}/><div><strong>{alert.title}</strong><small>{zoneName(zones, alert.zoneId)} · {alert.time} · {alert.recommendedAction}</small></div><span className="severity-label">{alert.severity}</span></div>) : <div className="empty-state compact"><CheckCircle2 size={20}/><strong>No unresolved sample alerts</strong></div>}</div>
    </Panel>
  </div>;
}

function WifiIcon() { return <Radio size={16}/>; }

function MapPage() {
  const zones = useMineStore((s) => s.zones);
  const sensors = useMineStore((s) => s.sensors);
  const inspections = useMineStore((s) => s.inspections);
  const hazards = useMineStore((s) => s.hazards);
  const workers = useMineStore((s) => s.workers);
  const scenario = useMineStore((s) => s.scenario);
  const activeZoneId = useMineStore((s) => s.activeZoneId);
  const setActiveZoneId = useMineStore((s) => s.setActiveZoneId);
  const createInspection = useMineStore((s) => s.createInspection);
  const [view, setView] = useState<'3D' | '2D'>('3D');
  const [layers, setLayers] = useState({ sensors: true, hazards: true, checkpoints: true, unknown: true });
  const selectedZone = zones.find((zone) => zone.id === activeZoneId) ?? null;
  return <div className="page-stack">
    <PageTitle eyebrow="SPATIAL INTELLIGENCE · 3D TWIN" title="Underground Mine Map" detail="Explore the fictional Kestrel Ridge 3D spatial twin, depth levels (-120m to -360m) and associated sector telemetry."><div className="period-switch"><button className={view === '3D' ? 'active' : ''} onClick={() => setView('3D')}>3D Model</button><button className={view === '2D' ? 'active' : ''} onClick={() => setView('2D')}>2D Schematic</button></div></PageTitle>
    <SimNote>Illustrative demonstration geometry · not a surveyed mine plan or real LiDAR scan.</SimNote>
    <div className="work-two-col map-layout">
      <Panel title={view === '3D' ? 'Interactive 3D Subterranean Scene' : '2D Information Flow Schematic'} aside="Select any zone for telemetry and inspection records" className="map-main-panel">
        {view === '3D' ? (
          <Mine3DScene
            zones={zones}
            selectedZoneId={activeZoneId}
            onSelect={setActiveZoneId}
            height={520}
            layers={layers}
            showControls={true}
          />
        ) : (
          <MineSchematic
            zones={zones}
            frozen={scenario === 'sensor-failure'}
            selectedZoneId={activeZoneId}
            onSelect={setActiveZoneId}
            layers={layers}
          />
        )}
      </Panel>
      <div className="map-side-stack">
        <Panel title="Map layers" aside="Toggle visible information">
          {Object.entries(layers).map(([key, value]) => <label className="layer-toggle" key={key}><span>{key === 'unknown' ? 'Unknown information areas' : key[0].toUpperCase() + key.slice(1)}</span><input type="checkbox" checked={value} onChange={(e) => setLayers((current) => ({ ...current, [key]: e.target.checked }))}/></label>)}
          <div className="map-legend-list"><span><i className="legend-dot known"/>Known</span><span><i className="legend-dot uncertain"/>Uncertain</span><span><i className="legend-dot unknown"/>Unknown</span><span><i className="legend-dot alert"/>Alert</span></div>
        </Panel>
        <Panel title="Zone register" aside={`${zones.length} fictional zones`}>
          {zones.map((zone) => <button className={`zone-register-row ${activeZoneId === zone.id ? 'selected' : ''}`} key={zone.id} onClick={() => setActiveZoneId(zone.id)}><span><strong>{zone.name}</strong><small>{zone.note}</small></span><StatusBadge status={zone.state}/></button>)}
        </Panel>
      </div>
    </div>
    <div className="work-three-col"><MetricCard label="Zones represented" value={zones.length} note="Fictional schematic areas" icon={<MapPin size={15}/>}/><MetricCard label="Sample sensor points" value={sensors.length} note="12 displayed of 36 expected" icon={<Radio size={15}/>}/><MetricCard label="Open hazard records" value={hazards.filter((h) => h.state === 'Open').length} note="Historical / sample observations" icon={<ShieldAlert size={15}/>}/></div>
    <Panel title="Spatial context" aside="Map-based review support"><div className="insight-grid"><div><strong>Inspection history</strong><p>{inspections.length} sample inspection records are associated with the mapped zones.</p></div><div><strong>Workforce checkpoints</strong><p>{workers.length} pseudonymous worker records; checkpoint information is last-verified data, not live GPS.</p></div><div><strong>Hazard observations</strong><p>{hazards.length} sample hazard records are available for review.</p></div></div></Panel>
    {selectedZone && <ZoneDrawer zone={selectedZone} sensors={sensors} inspections={inspections} hazards={hazards} workers={workers} scenario={scenario} onClose={() => setActiveZoneId(null)} onCreateInspection={(zoneId, title) => createInspection(zoneId, title)}/>}
  </div>;
}

function ScansPage() {
  const [position, setPosition] = useState(50);
  const [selected, setSelected] = useState('scan-latest');
  const scan = seedScans.find((item) => item.id === selected) ?? seedScans[1];
  return <div className="page-stack">
    <PageTitle eyebrow="SPATIAL CHANGE REVIEW" title="Scan Comparison" detail="Review sample survey records, coverage and illustrative geometric differences over time."/>
    <SimNote>Sample scan metadata and geometry only · not real LiDAR, measured deformation or a geotechnical assessment.</SimNote>
    <div className="work-two-col">
      <Panel title="Scan history" aside="Select a sample record"><div className="scan-list">{seedScans.map((item) => <button className={`scan-list-item ${selected === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelected(item.id)}><div><strong>{item.label}</strong><small>{item.ageDays} days ago · {item.coverage}% sample coverage</small></div><span className="scan-coverage">{item.coverage}%</span></button>)}</div></Panel>
      <Panel title="Selected scan details" aside="Provenance: simulated"><div className="scan-stats"><div><span>Scan age</span><strong>{scan.ageDays} days</strong></div><div><span>Coverage</span><strong>{scan.coverage}%</strong></div><div><span>Missing areas</span><strong>{scan.missingAreas.length}</strong></div></div><p className="helper-copy">{scan.note}</p><ul className="simple-list">{scan.missingAreas.map((area) => <li key={area}>{area}</li>)}</ul></Panel>
    </div>
    <Panel title="Before / after comparison" aside="Illustrative geometry change view">
      <div className="scan-compare-visual"><div className="scan-tunnel scan-before"><span>PREVIOUS SCAN</span></div><div className="scan-tunnel scan-after" style={{ clipPath: `inset(0 0 0 ${position}%)` }}><span>LATEST SCAN</span></div><input aria-label="Compare previous and latest sample scan" type="range" min="0" max="100" value={position} onChange={(e) => setPosition(Number(e.target.value))}/><div className="scan-compare-divider" style={{ left: `${position}%` }}/></div>
      <div className="scan-slider-labels"><span>Previous · 14 days ago</span><span>Drag comparison slider</span><span>Latest · 2 days ago</span></div>
      <div className="scan-change-note"><AlertTriangle size={16}/><div><strong>Tunnel A east wall · sample deviation 4.2 cm</strong><p>Illustrative change value from the seeded example. Requires qualified engineering review; it is not a diagnosis of instability.</p></div></div>
    </Panel>
  </div>;
}

function ConfidencePage() {
  const zones = useMineStore((s) => s.zones);
  const sensors = useMineStore((s) => s.sensors);
  const readings = useMineStore((s) => s.readings);
  const [selected, setSelected] = useState('tunnel-b');
  const selectedZone = zones.find((z) => z.id === selected) ?? zones[0]!;
  const checks = confidenceChecks(selectedZone, sensors, readings);
  const count = (status: Zone['state']) => zones.filter((z) => z.state === status).length;
  return <div className="page-stack">
    <PageTitle eyebrow="FLAGSHIP INTELLIGENCE MODULE" title="Knowledge Confidence" detail="Understand what is known, uncertain, unknown or alerting in each mine zone."/>
    <SimNote>Classification is derived from fictional sample records and transparent rules. It is not a finding that any mine area is safe.</SimNote>
    <div className="status-summary-grid"><div className="status-summary known"><strong>{count('KNOWN')}</strong><span>Known</span><small>Sample information available</small></div><div className="status-summary uncertain"><strong>{count('UNCERTAIN')}</strong><span>Uncertain</span><small>Verification required</small></div><div className="status-summary unknown"><strong>{count('UNKNOWN')}</strong><span>Unknown</span><small>Information gap</small></div><div className="status-summary alert"><strong>{count('ALERT')}</strong><span>Alert</span><small>Configured demo condition</small></div></div>
    <div className="work-two-col confidence-layout">
      <Panel title="Zone information coverage" aside="Select a zone to inspect its evidence"><div className="confidence-zone-list">{zones.map((zone) => { const zoneSensors = sensors.filter((sensor) => sensor.zoneId === zone.id); const reporting = zoneSensors.filter((sensor) => sensor.status === 'reporting').length; return <button key={zone.id} className={`confidence-zone-row ${selected === zone.id ? 'selected' : ''}`} onClick={() => setSelected(zone.id)}><span className="zone-row-main"><strong>{zone.name}</strong><small>{zone.lastInspectionDays} days since last inspection · {reporting}/{zoneSensors.length} displayed sensors reporting</small><span className="confidence-meter"><i style={{ width: `${zone.coverage ?? (zoneSensors.length ? reporting / zoneSensors.length * 100 : 0)}%` }}/></span></span><StatusBadge status={zone.state}/></button>;})}</div></Panel>
      <Panel title={`Why ${selectedZone.name} is ${selectedZone.state.toLowerCase()}`} aside="Evidence checklist"><div className="confidence-detail-heading"><StatusBadge status={selectedZone.state}/><p>{selectedZone.note}</p></div><div className="confidence-checks">{checks.map((check) => <div className="confidence-check-row" key={check.key}><span className={`check-icon check-${check.state}`}>{check.state === 'clear' ? <Check size={14}/> : check.state === 'attention' ? <AlertTriangle size={14}/> : <CircleHelp size={14}/>}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div><span className="confidence-check-state">{check.state}</span></div>)}</div><div className="confidence-action"><ShieldAlert size={16}/><div><strong>Recommended handling</strong><p>Verify the listed information gap under the approved site procedure. Do not infer safety from missing data.</p></div></div></Panel>
    </div>
    <Panel title="Classification rules" aside="Transparent demo logic"><div className="rules-table"><div><strong>ALERT</strong><span>Reporting sample measurement crosses its configurable demonstration threshold.</span></div><div><strong>UNCERTAIN</strong><span>Sensor is silent, stale, calibration is overdue, or readings conflict.</span></div><div><strong>UNKNOWN</strong><span>Spatial or measurement coverage is insufficient for a meaningful assessment.</span></div><div><strong>KNOWN</strong><span>Sample information is available and meets the configured information checks. This does not mean safe.</span></div></div></Panel>
  </div>;
}

function InspectionsPage() {
  const inspections = useMineStore((s) => s.inspections);
  const zones = useMineStore((s) => s.zones);
  const createInspection = useMineStore((s) => s.createInspection);
  const updateInspection = useMineStore((s) => s.updateInspection);
  const [filter, setFilter] = useState('Open');
  const [newZone, setNewZone] = useState('tunnel-b');
  const [newTask, setNewTask] = useState('Verify zone information');
  const rows = [...inspections].filter((item) => filter === 'All' || (filter === 'Open' ? item.status !== 'Complete' : item.status === filter)).sort((a, b) => b.score - a.score);
  function createTask() { const id = createInspection(newZone, newTask.trim() || 'New verification task'); if (id) setNewTask('Verify zone information'); }
  return <div className="page-stack">
    <PageTitle eyebrow="SAFETY & INCIDENTS" title="Incident Management & Inspections" detail="Prioritize safety incidents, dispatch verification work orders and record resolution status."/>
    <SimNote>Priority values are transparent demonstration scores, not predictions of collapse or hazard.</SimNote>
    <div className="work-three-col"><MetricCard label="Open tasks" value={inspections.filter((i) => i.status !== 'Complete').length} note="Requires ownership or follow-up" icon={<ClipboardCheck size={15}/>}/><MetricCard label="Highest priority" value={Math.max(0, ...inspections.filter((i) => i.status !== 'Complete').map((i) => i.score))} note="Rule-based demonstration score" tone="warning" icon={<AlertTriangle size={15}/>}/><MetricCard label="Completed" value={inspections.filter((i) => i.status === 'Complete').length} note="Recorded in this demo session" tone="teal" icon={<CheckCircle2 size={15}/>}/></div>
    <Panel title="Create an inspection task" aside="Local demo workflow"><div className="inline-form"><label>Mine zone<select value={newZone} onChange={(e) => setNewZone(e.target.value)}>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label><label className="grow-field">Verification needed<input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Describe the check"/></label><button className="button button-primary" onClick={createTask}>Create task</button></div></Panel>
    <Panel title="Prioritized inspection queue" aside={`${rows.length} tasks`} action={<select className="compact-select" value={filter} onChange={(e) => setFilter(e.target.value)}><option>Open</option><option>All</option><option>Queued</option><option>Assigned</option><option>In progress</option><option>Complete</option></select>}>
      {rows.length ? <div className="work-table-wrap"><table className="work-table"><thead><tr><th>Rank / Score</th><th>Zone & reason</th><th>Verification</th><th>Owner / Due</th><th>Status</th><th>Update</th></tr></thead><tbody>{rows.map((item, index) => <tr key={item.id}><td><span className={`priority-score ${item.score >= 70 ? 'score-high' : item.score >= 45 ? 'score-medium' : ''}`}>#{index + 1} · {item.score}</span></td><td><strong>{zoneName(zones, item.zoneId)}</strong><small>{item.reason}</small></td><td>{item.requiredVerification}<small>{item.evidence.join(' · ')}</small></td><td>{item.team}<small>{item.due}</small></td><td><span className="task-state">{item.status}</span></td><td><select className="compact-select" aria-label={`Update ${item.id} status`} value={item.status} onChange={(e) => updateInspection(item.id, e.target.value as Inspection['status'])}><option>Queued</option><option>Assigned</option><option>In progress</option><option>Complete</option></select></td></tr>)}</tbody></table></div> : <div className="empty-state"><ClipboardCheck size={22}/><strong>No tasks match this filter</strong><p>Create a task or change the status filter.</p></div>}
    </Panel>
    <Panel title="Scoring methodology" aside="Explainable rules"><div className="insight-grid"><div><strong>Unresolved hazards</strong><p>Open hazard observations contribute to review priority.</p></div><div><strong>Sensor condition</strong><p>Silent or stale data increases verification importance.</p></div><div><strong>Inspection age & coverage</strong><p>Older inspections and missing spatial information remain visible.</p></div></div><p className="helper-copy">This sample scoring logic supports work planning only. It is not a statutory risk assessment, prediction of collapse or substitute for professional judgement.</p></Panel>
  </div>;
}

function WorkforcePage() {
  const workers = useMineStore((s) => s.workers);
  const checkpoints = useMineStore((s) => s.checkpoints);
  const setWorkerExit = useMineStore((s) => s.setWorkerExit);
  const registerCheckpoint = useMineStore((s) => s.registerCheckpoint);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [emergency, setEmergency] = useState(false);
  const [checkpointWorker, setCheckpointWorker] = useState(workers[0]?.id ?? 'W-0412');
  const [checkpointName, setCheckpointName] = useState('Main Shaft – Checkpoint 1');
  const visible = workers.filter((worker) => worker.id.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || worker.exitStatus === status));
  const underground = workers.filter((worker) => worker.exitStatus !== 'verified-out').length;
  const unconfirmed = workers.filter((worker) => worker.exitStatus === 'unconfirmed').length;
  return <div className="page-stack">
    <PageTitle eyebrow="WORKFORCE & EMERGENCY" title="Worker Accountability" detail="Review pseudonymous worker records, checkpoint history and unconfirmed exits."><button className="button button-danger" onClick={() => setEmergency(true)}><ShieldAlert size={15}/>Emergency accountability</button></PageTitle>
    <SimNote>Last-verified checkpoint records only · not live GPS or a rescue dispatch system.</SimNote>
    <div className="work-three-col"><MetricCard label="Registered for shift" value={workers.length} note="Pseudonymous sample IDs" icon={<Users size={15}/>}/><MetricCard label="Not verified out" value={underground} note="Includes active and unconfirmed records" tone="warning" icon={<MapPin size={15}/>}/><MetricCard label="Exit unconfirmed" value={unconfirmed} note="Requires roster reconciliation" tone={unconfirmed ? 'alert' : 'neutral'} icon={<AlertTriangle size={15}/>}/></div>
    <Panel title="Checkpoint registration" aside="Demonstration action"><div className="inline-form"><label>Worker<select value={checkpointWorker} onChange={(e) => setCheckpointWorker(e.target.value)}>{workers.map((w) => <option key={w.id}>{w.id}</option>)}</select></label><label className="grow-field">Checkpoint<input value={checkpointName} onChange={(e) => setCheckpointName(e.target.value)}/></label><button className="button button-primary" onClick={() => registerCheckpoint(checkpointWorker, checkpointName, '09:30')}>Register checkpoint</button></div></Panel>
    <Panel title="Shift workforce register" aside={`${visible.length} visible records`} action={<div className="filter-inline"><label className="search-field"><Search size={14}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search worker ID"/></label><select className="compact-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All states</option><option value="underground">Underground</option><option value="unconfirmed">Unconfirmed</option><option value="verified-out">Verified out</option></select></div>}>
      <div className="work-table-wrap"><table className="work-table"><thead><tr><th>Worker ID</th><th>Team</th><th>Last verified zone</th><th>Checkpoint / communication</th><th>Exit status</th><th>Action</th></tr></thead><tbody>{visible.map((worker) => <tr key={worker.id}><td className="mono">{worker.id}</td><td>{worker.team}</td><td>{worker.location}</td><td>{worker.lastCheckpoint}<small>Last communication {worker.lastCommunication}</small></td><td><span className={`worker-state worker-${worker.exitStatus}`}>{worker.exitStatus === 'verified-out' ? 'Verified out' : worker.exitStatus === 'unconfirmed' ? 'Unconfirmed' : 'Underground'}</span></td><td><button className="small-action" onClick={() => setWorkerExit(worker.id, worker.exitStatus !== 'verified-out')}>{worker.exitStatus === 'verified-out' ? 'Mark unconfirmed' : 'Verify exit'}</button></td></tr>)}</tbody></table></div>
      {visible.length === 0 && <div className="empty-state"><Search size={20}/><strong>No matching worker records</strong></div>}
    </Panel>
    <Panel title="Recent checkpoint records" aside={`${checkpoints.length} sample events`}><div className="checkpoint-list">{checkpoints.slice(-8).reverse().map((cp) => <div className="checkpoint-row" key={cp.id}><MapPin size={14}/><strong>{cp.workerId}</strong><span>{cp.label}</span><time>{cp.recordedAt}</time><span>{cp.verified ? 'Verified record' : 'Needs review'}</span></div>)}</div></Panel>
    {emergency && <div className="emergency-overlay" role="dialog" aria-modal="true" aria-label="Emergency accountability drill"><div className="emergency-window"><div className="emergency-heading"><div><span className="eyebrow">SIMULATED EMERGENCY DRILL</span><h2>Worker accountability overview</h2></div><button className="icon-button" onClick={() => setEmergency(false)}>×</button></div><div className="emergency-metrics"><div><strong>{workers.length}</strong><span>Registered</span></div><div><strong>{workers.filter((w) => w.exitStatus === 'verified-out').length}</strong><span>Verified out</span></div><div><strong>{unconfirmed}</strong><span>Unconfirmed</span></div></div><div className="emergency-warning"><AlertTriangle size={17}/><span>Positions below are last-verified checkpoint records, not live location. Follow the approved emergency plan.</span></div><div className="work-table-wrap"><table className="work-table"><thead><tr><th>Worker</th><th>Last verified</th><th>Time</th><th>Exit state</th></tr></thead><tbody>{workers.filter((w) => w.exitStatus !== 'verified-out').slice(0, 18).map((w) => <tr key={w.id}><td className="mono">{w.id}</td><td>{w.lastCheckpoint}</td><td>{w.lastCommunication}</td><td>{w.exitStatus}</td></tr>)}</tbody></table></div><button className="button button-secondary" onClick={() => setEmergency(false)}>Close drill view</button></div></div>}
  </div>;
}

const copilotSamples = [
  { keywords: ['ventilation', 'airflow'], title: 'Underground ventilation review', answer: 'A ventilation review should consider the mine ventilation plan, airflow quantity and direction, monitoring locations, leakage paths, auxiliary ventilation arrangements and current site procedures. Compare measured conditions with the mine-approved requirements and have any deviation reviewed by the responsible ventilation professional.', sourceIds: ['niosh', 'msha'] },
  { keywords: ['methane', 'ch4', 'gas'], title: 'Gas monitoring and data reliability', answer: 'For a gas-monitoring review, verify that the instrument is suitable for the intended application, correctly located, in calibration, communicating and producing current readings. A missing or stale reading must be treated as unavailable information, not as a normal or safe condition. Follow the mine-specific statutory and approved monitoring procedure.', sourceIds: ['msha', 'niosh'] },
  { keywords: ['ground', 'roof', 'rock', 'crack', 'structural'], title: 'Ground-control and inspection considerations', answer: 'Ground-control review should be based on the mine ground-control plan, geological conditions, support design, documented observations and qualified inspections. Repeat spatial surveys can help identify geometric change, but a point-cloud difference alone does not establish the cause or stability of a change.', sourceIds: ['niosh', 'emesent', 'exyn'] },
  { keywords: ['lidar', 'scan', 'mapping', '3d'], title: 'LiDAR and repeat-scan workflows', answer: 'LiDAR can produce spatial point-cloud data for tunnel mapping and repeat surveys. A repeat-scan workflow needs consistent coordinate registration, documented scan conditions, coverage checks and measurement uncertainty. Geometric differences should be reviewed by a qualified surveyor or geotechnical engineer before operational conclusions are made.', sourceIds: ['emesent', 'exyn'] },
  { keywords: ['robot', 'autonomous', 'inspection'], title: 'Inspection robotics', answer: 'Inspection robots and autonomous mapping platforms can collect information in selected hard-to-access environments. Suitability depends on tunnel geometry, floor and wall conditions, connectivity, dust and water exposure, payload, operating time, retrieval strategy and mine-specific hazardous-area requirements. Confirm product specifications and certifications with the manufacturer.', sourceIds: ['exyn', 'emesent'] },
  { keywords: ['maintenance', 'equipment', 'machine'], title: 'Equipment maintenance information', answer: 'Start with the exact equipment model, serial/configuration, fault code and manufacturer manual. Record symptoms and operating context, then use the OEM troubleshooting procedure and site isolation/permit process. This demonstration does not contain model-specific maintenance instructions.', sourceIds: ['sandvik', 'caterpillar', 'abb'] },
];
function CopilotPage() {
  const [query, setQuery] = useState('How should an underground mine review a gas sensor that has stopped communicating?');
  const [answer, setAnswer] = useState<(typeof copilotSamples)[number] | null>(null);
  const [topic, setTopic] = useState('Gas monitoring');
  function ask(question = query) { setQuery(question); const q = question.toLowerCase(); const match = copilotSamples.find((sample) => sample.keywords.some((keyword) => q.includes(keyword))); setAnswer(match ?? { keywords: [], title: 'No supporting document available', answer: 'No supporting document available. Add an approved source document or refine the question to a topic covered by the demonstration knowledge set. Do not use this sample workspace as a substitute for site procedures or qualified advice.', sourceIds: [] }); }
  return <div className="page-stack"><PageTitle eyebrow="MINING-SPECIFIC KNOWLEDGE WORKSPACE" title="MineGuard Mining Copilot" detail="A source-aware demonstration assistant for mining engineering, safety and technology research."/><SimNote>Offline sample knowledge responses · no AI API or mine data connection is configured.</SimNote>
    <div className="copilot-layout"><aside className="copilot-topics"><strong>TOPICS</strong>{['Ventilation', 'Ground control', 'Gas monitoring', 'Emergency preparedness', 'Maintenance', 'Regulations', 'Technology'].map((t) => <button key={t} className={topic === t ? 'active' : ''} onClick={() => { setTopic(t); setQuery(`What should I know about ${t.toLowerCase()} in an underground mine?`); }}>{t}</button>)}<div className="copilot-topic-note"><BookOpen size={15}/><span>Answers are limited to the reviewed sample reference set.</span></div></aside><div className="copilot-main"><div className="copilot-suggestions"><span>Suggested questions</span>{['How should ventilation be reviewed?', 'What if a methane sensor goes silent?', 'How can repeat LiDAR scans be compared?', 'What should be considered for inspection robots?'].map((q) => <button key={q} onClick={() => ask(q)}>{q}</button>)}</div><div className="copilot-answer-area">{answer ? <article className="copilot-answer-card"><div className="copilot-answer-top"><span className="sample-response-label">SAMPLE RESPONSE – SOURCE TO BE VERIFIED</span><span className="confidence-chip">Reference-assisted</span></div><h2>{answer.title}</h2><p>{answer.answer}</p><div className="copilot-limit"><Info size={14}/>This is general information for demonstration. Confirm all requirements against current mine-specific documents and qualified professional judgement.</div><div className="copilot-evidence"><strong>Evidence references</strong>{answer.sourceIds.length ? answer.sourceIds.map((id) => { const source = sources.find((s) => s.id === id); return source ? <div key={id}><BookOpen size={14}/><span>{source.title}<small>{source.jurisdiction ?? 'Vendor / industry reference'} · section not specified in reviewed page</small></span><SourceLink id={id}>Open source</SourceLink></div> : null; }) : <p>No source record is available for this sample response.</p>}</div></article> : <div className="copilot-empty"><Bot size={32}/><h2>Ask a mining question</h2><p>Choose a topic or enter a question to see a sample evidence-grounded response.</p></div>}</div><form className="copilot-input" onSubmit={(e) => { e.preventDefault(); ask(); }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Ask about ${topic.toLowerCase()}...`}/><button className="button button-primary" type="submit">Ask Copilot <ArrowUpRight size={14}/></button></form></div></div>
  </div>;
}

function VendorsPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const vendorCategories: Record<string, string[]> = { sandvik: ['monitoring', 'safety'], epiroc: ['monitoring', 'safety', 'mapping'], hexagon: ['safety'], caterpillar: ['equipment'], abb: ['automation'], becker: ['safety'], exyn: ['mapping'], emesent: ['mapping'] };
  const filtered = vendorCatalog.filter((vendor) => `${vendor.name} ${vendor.description} ${vendor.fields.map((f) => f.label).join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (category === 'all' || (vendorCategories[vendor.id] ?? []).includes(category)));
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((v) => v !== id) : current.length < 4 ? [...current, id] : current); }
  return <div className="page-stack"><PageTitle eyebrow="EXISTING MINING ECOSYSTEM" title="Vendor & Technology" detail="Explore existing mining suppliers, compare technology options and review their documented applications."/><TechnologyWorkspaceTabs active="directory"/><SimNote>Vendor descriptions are source-attributed and not independent verification of performance, suitability or compatibility.</SimNote>
    <div className="vendor-toolbar"><label className="search-field"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendors, products or applications"/></label><label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option><option value="monitoring">Monitoring</option><option value="safety">Safety</option><option value="mapping">Mapping</option><option value="automation">Automation</option><option value="equipment">Equipment</option></select></label><span className="muted-inline">{filtered.length} vendors</span></div>
    <div className="vendor-grid">{filtered.map((vendor) => { const source = sources.find((s) => s.id === vendor.sourceId); return <article className="vendor-card" key={vendor.id}><div className="vendor-card-top"><div className="vendor-monogram">{vendor.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div><button className={`compare-toggle ${selected.includes(vendor.id) ? 'active' : ''}`} onClick={() => toggle(vendor.id)}>{selected.includes(vendor.id) ? <Check size={13}/> : <PlusIcon/>}{selected.includes(vendor.id) ? 'Added' : 'Compare'}</button></div><h2>{vendor.name}</h2><p>{vendor.description}</p><div className="vendor-boundary"><Info size={13}/>{vendor.boundary}</div><div className="vendor-card-foot"><ProvenanceBadge type="VENDOR-PROVIDED"/>{source && <SourceLink id={source.id}>Source record</SourceLink>}</div></article>; })}</div>
    {filtered.length === 0 && <div className="empty-state"><Search size={22}/><strong>No vendors found</strong><p>Try a different keyword or category.</p></div>}
    {selected.length > 0 && <Panel title={`Comparison shortlist (${selected.length}/4)`} aside="Compare the source-supported descriptions"><div className="comparison-grid">{selected.map((id) => { const vendor = vendorCatalog.find((v) => v.id === id)!; return <div key={id} className="comparison-column"><div className="comparison-heading"><strong>{vendor.name}</strong><button className="small-action" onClick={() => toggle(id)}>Remove</button></div>{vendor.fields.map((field) => <div className="comparison-field" key={field.label}><span>{field.label}</span><strong>{field.value}</strong><small>{field.tag}</small></div>)}</div>; })}</div><button className="button button-secondary" onClick={() => setSelected([])}>Clear comparison</button></Panel>}
  </div>;
}

function PlusIcon() { return <span aria-hidden="true">+</span>; }

function AdvisorPage() {
  const [mineType, setMineType] = useState('Underground coal');
  const [challenge, setChallenge] = useState('Difficult-to-access tunnel inspection');
  const [conditions, setConditions] = useState('Wet / humid');
  const [infrastructure, setInfrastructure] = useState('Limited connectivity');
  const [budget, setBudget] = useState('Not yet defined');
  const [result, setResult] = useState(false);
  const matches = challenge.toLowerCase().includes('inspection') ? ['Autonomous mapping / mobile scanning', 'Protected industrial camera systems', 'Radar-based obstacle sensing'] : challenge.toLowerCase().includes('gas') ? ['Certified fixed gas monitoring', 'Environmental telemetry and alarm systems'] : challenge.toLowerCase().includes('worker') ? ['Underground personnel positioning', 'Checkpoint and mustering systems'] : ['Mine data integration', 'Sensor-health and inspection analytics'];
  const candidateVendors = vendorCatalog.filter((v) => ['exyn', 'emesent', 'sandvik', 'epiroc', 'hexagon'].includes(v.id));
  return <div className="page-stack"><PageTitle eyebrow="ENGINEERING DECISION SUPPORT" title="Technology Advisor" detail="Describe a mine requirement to explore relevant technology categories and existing vendors."/><TechnologyWorkspaceTabs active="advisor"/><SimNote>Illustrative technology matching. This is not an engineering approval or a purchasing recommendation.</SimNote>
    <Panel title="Describe the mine and operational challenge" aside="Step 1 · Mine context"><div className="advisor-form-grid"><label>Mine type<select value={mineType} onChange={(e) => setMineType(e.target.value)}><option>Underground coal</option><option>Underground metal</option><option>Open-pit</option><option>Quarry</option></select></label><label>Main challenge<select value={challenge} onChange={(e) => setChallenge(e.target.value)}><option>Difficult-to-access tunnel inspection</option><option>Gas monitoring and data reliability</option><option>Worker accountability</option><option>Fragmented mine information</option><option>Structural change monitoring</option></select></label><label>Environmental conditions<select value={conditions} onChange={(e) => setConditions(e.target.value)}><option>Wet / humid</option><option>Dry / dusty</option><option>High temperature</option><option>Mixed / unknown</option></select></label><label>Available infrastructure<select value={infrastructure} onChange={(e) => setInfrastructure(e.target.value)}><option>Limited connectivity</option><option>Wi-Fi / leaky feeder</option><option>Existing telemetry network</option><option>Not yet assessed</option></select></label><label>Budget band<select value={budget} onChange={(e) => setBudget(e.target.value)}><option>Not yet defined</option><option>Under ₹10 lakh</option><option>₹10–50 lakh</option><option>₹50 lakh–₹2 crore</option><option>Over ₹2 crore</option></select></label></div><div className="advisor-actions"><button className="button button-primary" onClick={() => setResult(true)}>Explore suitable technology <ArrowUpRight size={14}/></button><button className="button button-secondary" onClick={() => { setMineType('Underground coal'); setChallenge('Difficult-to-access tunnel inspection'); setConditions('Wet / humid'); setInfrastructure('Limited connectivity'); setBudget('Not yet defined'); setResult(false); }}>Reset inputs</button></div></Panel>
    {result && <div className="advisor-results"><Panel title="Technology categories to evaluate" aside="Why these options appeared"><div className="advisor-result-list">{matches.map((match, index) => <div key={match}><span className="advisor-rank">0{index + 1}</span><div><strong>{match}</strong><small>Potential fit for {mineType.toLowerCase()} · conditions: {conditions.toLowerCase()} · infrastructure: {infrastructure.toLowerCase()}.</small></div><span className="fit-label">Evaluate</span></div>)}</div><div className="advisor-context"><Info size={15}/><p>Budget: {budget}. Before selection, confirm dimensions, water/dust exposure, hazardous-area requirements, network performance, payload and maintenance/retrieval strategy.</p></div></Panel><Panel title="Relevant vendors to research" aside="Category-level leads, not product endorsements"><div className="advisor-vendor-list">{candidateVendors.map((v) => <div key={v.id}><strong>{v.name}</strong><span>{v.description}</span><SourceLink id={v.sourceId}>Source</SourceLink></div>)}</div></Panel></div>}
  </div>;
}

const radarItems = [
  { name: 'Autonomous underground mapping', category: 'Mapping', maturity: 'Early commercial', use: 'Capture spatial information in selected hard-to-access workings.', barrier: 'Geometry, connectivity, operating conditions and retrieval strategy.', vendors: 'Exyn Technologies; Emesent', source: 'exyn' },
  { name: 'Repeat-scan convergence analysis', category: 'Ground monitoring', maturity: 'Established', use: 'Compare repeated point clouds to quantify geometric change for engineering review.', barrier: 'Registration quality, scan coverage and measurement uncertainty.', vendors: 'Emesent', source: 'emesent' },
  { name: 'Underground personnel positioning', category: 'Worker safety', maturity: 'Established', use: 'Provide location or checkpoint context using mine-installed infrastructure.', barrier: 'Network coverage, tag behaviour, mine layout and integration.', vendors: 'Sandvik; Epiroc', source: 'sandvik' },
  { name: 'AI visual analytics', category: 'Computer vision', maturity: 'Early commercial', use: 'Analyze selected visual tasks such as PPE or equipment activity.', barrier: 'Lighting, dust, camera placement, ground-truth data and false alarms.', vendors: 'Becker Mining Systems', source: 'becker' },
  { name: 'Smart ventilation analytics', category: 'Ventilation', maturity: 'Pilot', use: 'Support ventilation monitoring and operational optimization.', barrier: 'Sensor quality, control-system integration and human sign-off.', vendors: 'ABB and specialist providers', source: 'abb' },
  { name: 'Mine data interoperability', category: 'Digital infrastructure', maturity: 'Established', use: 'Structure data exchange across equipment and software systems.', barrier: 'Vendor adapters, semantics, cybersecurity and site-specific configuration.', vendors: 'OPC Foundation ecosystem', source: 'opc40560' },
  { name: 'Electric underground fleets', category: 'Electrification', maturity: 'Established', use: 'Evaluate battery-electric equipment for suitable mine duties.', barrier: 'Charging, duty cycle, ventilation design and lifecycle economics.', vendors: 'Multiple OEMs', source: 'caterpillar' },
];
function RadarPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = radarItems.filter((item) => `${item.name} ${item.category} ${item.use}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || item.maturity === filter));
  return <div className="page-stack"><PageTitle eyebrow="TECHNOLOGY LANDSCAPE" title="Future Mining Technology Radar" detail="Explore selected mining technology areas, maturity signals and implementation considerations."/><TechnologyWorkspaceTabs active="radar"/><SimNote>Illustrative curated examples · not live news, investment advice or a complete market survey.</SimNote><div className="vendor-toolbar"><label className="search-field"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search technology areas"/></label><label>Maturity<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All stages</option><option>Research</option><option>Pilot</option><option>Early commercial</option><option>Established</option></select></label><span className="muted-inline">{filtered.length} topics</span></div><div className="radar-grid">{filtered.map((item) => <article className="radar-card" key={item.name}><div className="radar-card-head"><span>{item.category}</span><span className={`maturity-chip maturity-${item.maturity.toLowerCase().replaceAll(' ', '-')}`}>{item.maturity}</span></div><h2>{item.name}</h2><p>{item.use}</p><div className="radar-barriers"><strong>Implementation considerations</strong><span>{item.barrier}</span></div><div className="radar-vendors"><span>Vendors / ecosystem</span><strong>{item.vendors}</strong></div><SourceLink id={item.source}>Reference record</SourceLink></article>)}</div>{filtered.length === 0 && <div className="empty-state">No matching technology topics.</div>}</div>;
}

function ReportsPage() {
  const sensors = useMineStore((s) => s.sensors);
  const zones = useMineStore((s) => s.zones);
  const workers = useMineStore((s) => s.workers);
  const alerts = useMineStore((s) => s.alerts);
  const inspections = useMineStore((s) => s.inspections);
  const audit = useMineStore((s) => s.audit);
  const [report, setReport] = useState('Shift handover');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [generated, setGenerated] = useState(false);
  const types = ['Shift handover', 'Environmental monitoring', 'Worker accountability', 'Sensor health', 'Inspection status', 'Hazard history', 'Information coverage', 'Incident / near-miss'];
  const rows = useMemo(() => {
    if (report === 'Worker accountability') return workers.map((w) => [w.id, w.team, w.location, w.lastCheckpoint, w.exitStatus]);
    if (report === 'Sensor health') return sensors.filter((s) => zoneFilter === 'all' || s.zoneId === zoneFilter).map((s) => [s.id, zoneName(zones, s.zoneId), s.measure, s.status, s.lastReading, s.calibration]);
    if (report === 'Inspection status') return inspections.filter((i) => zoneFilter === 'all' || i.zoneId === zoneFilter).map((i) => [i.id, zoneName(zones, i.zoneId), i.requiredVerification, i.score, i.team, i.due, i.status]);
    if (report === 'Hazard history' || report === 'Incident / near-miss') return alerts.filter((a) => zoneFilter === 'all' || a.zoneId === zoneFilter).map((a) => [a.id, zoneName(zones, a.zoneId), a.title, a.severity, a.time, a.state, a.recommendedAction]);
    if (report === 'Environmental monitoring') return sensors.filter((s) => zoneFilter === 'all' || s.zoneId === zoneFilter).map((s) => [s.id, zoneName(zones, s.zoneId), s.measure, s.value, s.unit, s.lastReading, s.status]);
    if (report === 'Information coverage') return zones.filter((z) => zoneFilter === 'all' || z.id === zoneFilter).map((z) => [z.id, z.name, z.state, `${z.coverage ?? 'Not available'}%`, z.lastInspectionDays, z.note]);
    return audit.slice(-20).reverse().map((a) => [a.time, a.actor, a.action, a.detail]);
  }, [report, zoneFilter, workers, sensors, zones, inspections, alerts, audit]);
  function downloadCsv() {
    const csv = [['MineGuard demo report', report], ['Generated', '09:30'], ['Data source', 'SIMULATED'], [], ...rows].map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `mineguard-${report.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.csv`; a.click(); URL.revokeObjectURL(url); setGenerated(true);
  }
  return <div className="page-stack"><PageTitle eyebrow="REPORTING & ANALYTICS" title="Reports & Analytics" detail="Prepare shift handover and supporting safety-information reports from the fictional demo dataset."><button className="button button-secondary" onClick={() => window.print()}><FileText size={15}/>Print / Save PDF</button></PageTitle><SimNote>Reports are generated from local simulated data and are not statutory or official records.</SimNote>
    <Panel title="Build a report" aside="Choose content and optional zone filter"><div className="report-builder"><label>Report type<select value={report} onChange={(e) => { setReport(e.target.value); setGenerated(false); }}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label>Mine zone<select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}><option value="all">All zones</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label><button className="button button-primary" onClick={downloadCsv}><Download size={15}/>Download CSV</button></div>{generated && <div className="inline-success"><CheckCircle2 size={14}/>CSV report generated from simulated data.</div>}</Panel>
    <Panel title={`${report} · Preview`} aside={`${rows.length} records`}><div className="report-preview-head"><div><strong>Demo Mine – Kestrel Ridge (Coal, fictional)</strong><small>Generated 09:30 · Data source: SIMULATED</small></div><ProvenanceBadge type="SIMULATED"/></div><div className="work-table-wrap"><table className="work-table"><thead><tr>{(report === 'Worker accountability' ? ['Worker', 'Team', 'Location', 'Last checkpoint', 'Exit status'] : report === 'Sensor health' ? ['Sensor', 'Zone', 'Measurement', 'Status', 'Last update', 'Calibration'] : report === 'Inspection status' ? ['Task', 'Zone', 'Verification', 'Score', 'Team', 'Due', 'Status'] : report === 'Hazard history' || report === 'Incident / near-miss' ? ['ID', 'Zone', 'Title', 'Severity', 'Time', 'State', 'Action'] : report === 'Environmental monitoring' ? ['Sensor', 'Zone', 'Measure', 'Value', 'Unit', 'Time', 'Status'] : report === 'Information coverage' ? ['Zone ID', 'Zone', 'Status', 'Coverage', 'Inspection age', 'Note'] : ['Time', 'Actor', 'Action', 'Detail']).map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></Panel>
  </div>;
}

function SettingsPage() {
  const darkMode = useMineStore((s) => s.darkMode);
  const reducedMotion = useMineStore((s) => s.reducedMotion);
  const notificationMuted = useMineStore((s) => s.notificationMuted);
  const setDarkMode = useMineStore((s) => s.setDarkMode);
  const setReducedMotion = useMineStore((s) => s.setReducedMotion);
  const setNotificationMuted = useMineStore((s) => s.setNotificationMuted);
  const integrations = useMineStore((s) => s.integrations);
  const setIntegrationStatus = useMineStore((s) => s.setIntegrationStatus);
  const resetDemo = useMineStore((s) => s.resetDemo);
  const audit = useMineStore((s) => s.audit);
  const [uploadName, setUploadName] = useState('');
  const [preview, setPreview] = useState<string[][]>([]);
  const [fileError, setFileError] = useState('');
  async function handleFile(file?: File) { if (!file) return; setUploadName(file.name); setFileError(''); try { const text = await file.text(); const parsed = text.split(/\r?\n/).filter(Boolean).slice(0, 6).map((line) => line.split(',').slice(0, 6)); setPreview(parsed); } catch { setFileError('Could not read this file in the browser.'); } }
  return <div className="page-stack"><PageTitle eyebrow="CONFIGURATION & DATA GOVERNANCE" title="Settings & Integrations" detail="Review demo preferences, integration readiness and recent actions."/><SimNote>No live vendor or mine-system API is connected in this prototype.</SimNote>
    <div className="work-two-col"><Panel title="Display and notifications" aside="Preferences are saved locally"><label className="setting-toggle"><span><strong>Control-room dark theme</strong><small>Use a darker workspace for low-light control-room viewing.</small></span><input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/></label><label className="setting-toggle"><span><strong>Reduced motion</strong><small>Reduce non-essential transitions and animation.</small></span><input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)}/></label><label className="setting-toggle"><span><strong>Mute demo notifications</strong><small>Suppress notification sounds and visual toast prompts in this demo.</small></span><input type="checkbox" checked={notificationMuted} onChange={(e) => setNotificationMuted(e.target.checked)}/></label><div className="helper-copy">Designed using WCAG 2.2 AA practices; no accessibility audit performed.</div></Panel>
      <Panel title="Data import preview" aside="Local browser preview only"><label className="upload-drop"><CloudUpload size={23}/><strong>Choose a CSV file</strong><small>Preview up to 6 rows. This does not connect the file to a mine.</small><input type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0])}/></label>{uploadName && <div className="upload-result"><strong>{uploadName}</strong><ProvenanceBadge type="UPLOADED"/></div>}{fileError && <p className="form-error">{fileError}</p>}{preview.length > 0 && <div className="csv-preview">{preview.map((row, i) => <div key={i}>{row.map((cell, j) => <span key={j}>{cell}</span>)}</div>)}</div>}</Panel></div>
    <Panel title="Integration readiness" aside="Adapter-oriented architecture · no live connection"><div className="integration-list">{integrations.map((item) => <div className="integration-row" key={item.id}><div className="integration-icon"><Database size={17}/></div><div><strong>{item.name}</strong><small>{item.note}</small></div><select value={item.status} onChange={(e) => setIntegrationStatus(item.id, e.target.value as typeof item.status)}><option>Demo connection</option><option>Not connected</option><option>Configuration required</option></select></div>)}</div><div className="integration-footnote">OPC UA for Mining (OPC-40560) is a planned interoperability reference, not an implemented integration. <SourceLink id="opc">Source record</SourceLink></div></Panel>
    <Panel title="Recent audit events" aside={`${audit.length} local events`}><div className="audit-list">{[...audit].reverse().slice(0, 12).map((event) => <div key={event.id}><time>{event.time}</time><strong>{event.action}</strong><span>{event.detail}</span><small>{event.actor}</small></div>)}</div></Panel>
    <div className="settings-reset"><div><strong>Reset fictional demo workspace</strong><small>Restore the seeded sample mine, workers, sensors, alerts and scenarios.</small></div><button className="button button-danger-outline" onClick={() => { if (window.confirm('Reset all local demo state to the original sample?')) resetDemo(); }}><RefreshCw size={14}/>Reset demo data</button></div>
  </div>;
}
