import { useEffect } from 'react';
import { AlertTriangle, CalendarClock, Check, Info, MapPinned, Radio, ShieldAlert, Users, X } from 'lucide-react';
import type { Hazard, Inspection, Sensor, Worker, Zone } from '../models/types';
import { StatusBadge, ProvenanceBadge } from './Badges';

export function ZoneDrawer({ zone, sensors, inspections, hazards, workers, scenario, onClose, onCreateInspection }: {
  zone: Zone; sensors: Sensor[]; inspections: Inspection[]; hazards: Hazard[]; workers: Worker[]; scenario: string;
  onClose: () => void; onCreateInspection: (zoneId: string, title?: string) => void;
}) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const zoneSensors = sensors.filter((sensor) => sensor.zoneId === zone.id);
  const zoneInspections = inspections.filter((inspection) => inspection.zoneId === zone.id);
  const zoneHazards = hazards.filter((hazard) => hazard.zoneId === zone.id);
  const zoneWorkers = workers.filter((worker) => worker.location.toLowerCase().includes(zone.name.toLowerCase()));
  return <div className="drawer-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="zone-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
    <div className="drawer-topline"><span className="eyebrow">ZONE DETAIL · SIMULATED</span><button className="icon-button" onClick={onClose} aria-label="Close zone detail"><X size={17}/></button></div>
    <div className="drawer-title-row"><div><h2 id="drawer-title">{zone.name}</h2><p>{zone.note}</p></div><StatusBadge status={zone.state}/></div>
    <div className="drawer-info-callout"><ShieldAlert size={15}/><span>Why this classification</span><p>{reasonText(zone.id, zone.state, scenario)}</p></div>
    <section className="drawer-section"><div className="drawer-section-title"><Radio size={14}/>Sensors & last update<span>{zoneSensors.length}</span></div>{zoneSensors.length ? <div className="drawer-rows">{zoneSensors.map((sensor) => <div className="drawer-data-row" key={sensor.id}><div><strong>{sensor.id}</strong><small>{sensor.measure} · {sensor.location}</small></div><span className={`sensor-mini-status mini-${sensor.status}`}>{sensor.status === 'silent' ? 'Silent' : sensor.status === 'stale' ? 'Stale' : 'Reporting'}</span><span className="mono">{sensor.status === 'silent' ? '—' : `${sensor.value} ${sensor.unit}`}</span><small>Last {sensor.lastReading}</small></div>)}</div> : <div className="drawer-empty">No sample sensor ID is included for this zone in the displayed 12. This does not mean there are zero sensors or safe conditions. {zone.note}</div>}</section>
    <section className="drawer-section"><div className="drawer-section-title"><CalendarClock size={14}/>Inspection history<span>{zoneInspections.length}</span></div>{zoneInspections.map((item) => <div className="drawer-data-row" key={item.id}><div><strong>{item.requiredVerification}</strong><small>{item.lastInspection} · {item.team}</small></div><span className="inspection-status-chip">{item.status}</span></div>)}</section>
    <section className="drawer-section"><div className="drawer-section-title"><AlertTriangle size={14}/>Hazard records<span>{zoneHazards.length}</span></div>{zoneHazards.length ? zoneHazards.map((hazard) => <div className="hazard-chip-row" key={hazard.id}><span className={`hazard-dot hazard-${hazard.state.toLowerCase()}`}/><div><strong>{hazard.title}</strong><small>{hazard.state} · {hazard.age} · {hazard.description}</small></div></div>) : <div className="drawer-empty">No sample hazard record is registered.</div>}</section>
    <section className="drawer-section"><div className="drawer-section-title"><Users size={14}/>Worker verification<span>{zoneWorkers.length}</span></div><div className="drawer-data-row"><div><strong>{zoneWorkers.length} sample records in/near zone</strong><small>Checkpoint records only · not live GPS</small></div><MapPinned size={14}/></div>{zoneWorkers.slice(0, 3).map((worker) => <div className="drawer-worker-row" key={worker.id}><span className="mono">{worker.id}</span><span>{worker.team}</span><small>{worker.lastCheckpoint}</small></div>)}</section>
    <div className="drawer-bottom"><ProvenanceBadge type="SIMULATED"/><button className="button button-primary" onClick={() => onCreateInspection(zone.id, `Verify ${zone.name} information`)}><Check size={15}/>Create verification task</button><p><Info size={13}/>Sample records only. Follow approved site procedures.</p></div>
  </aside></div>;
}
function reasonText(zoneId: string, state: Zone['state'], scenario: string) {
  if (zoneId === 'tunnel-b' && scenario === 'sensor-failure') return 'B-CH4-02 is silent and no current gas reading is available. The 12-day inspection age remains visible. Missing information is not proof of safety, so this zone is UNCERTAIN.';
  if (zoneId === 'tunnel-c') return 'Only 58% sample scan coverage is available, no gas sensor is listed, and the last inspection is 21 days ago. This zone is UNKNOWN.';
  if (zoneId === 'exit') return 'Checkpoint reader calibration is overdue and the last inspection was 9 days ago. Do not infer worker location from a missing checkpoint.';
  if (state === 'ALERT') return 'An illustrative value crossed a configurable demonstration threshold. This is not a statutory limit or certified detection.';
  if (zoneId === 'pump') return 'The sample sump trend increased by 6 cm in 2 hours. The current sample value remains below the configurable demo threshold.';
  return 'Recent sample inspection and reporting sensors support the KNOWN label for this demonstration; this is not a finding of safe conditions.';
}
