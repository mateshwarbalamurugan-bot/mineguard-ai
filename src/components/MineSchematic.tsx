import { useMemo } from 'react';
import { Radio, ShieldQuestion } from 'lucide-react';
import type { Zone } from '../models/types';
import { StatusBadge } from './Badges';

const geometry = [
  { id: 'shaft', label: 'Main Shaft', x: 8, y: 50 },
  { id: 'tunnel-a', label: 'Tunnel A', x: 26, y: 26 },
  { id: 'tunnel-b', label: 'Tunnel B', x: 46, y: 26 },
  { id: 'tunnel-c', label: 'Tunnel C', x: 46, y: 75 },
  { id: 'pump', label: 'Pumping Station', x: 68, y: 26 },
  { id: 'exit', label: 'Emergency Exit', x: 85, y: 76 },
];

export function MineSchematic({ zones, frozen, selectedZoneId, onSelect, layers = { sensors: true, hazards: true, checkpoints: true, unknown: true } }: { zones: Zone[]; frozen: boolean; selectedZoneId?: string | null; onSelect: (zoneId: string) => void; layers?: { sensors: boolean; hazards: boolean; checkpoints: boolean; unknown: boolean } }) {
  const zoneMap = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const lines = [
    ['shaft', 'tunnel-a', 'flow-branch'], ['shaft', 'tunnel-b', 'flow-main'], ['shaft', 'tunnel-c', 'flow-branch'],
    ['tunnel-b', 'pump', 'flow-main'], ['tunnel-c', 'exit', 'flow-branch'], ['shaft', 'exit', 'flow-branch'],
  ];
  const position = (id: string) => geometry.find((item) => item.id === id)!;
  return <section className="panel mine-schematic-panel" aria-labelledby="mine-map-title">
    <div className="section-header"><div><h2 id="mine-map-title">Underground network</h2><span className="section-aside"><Radio size={13}/>Zone information flow · 6 fictional zones</span></div><span className="mini-label">2D SCHEMATIC</span></div>
    <div className="schematic-stage"><div className="schematic-grid"/><svg className="schematic-lines" viewBox="0 0 520 340" role="img" aria-labelledby="schematic-title schematic-desc"><title id="schematic-title">Fictional Kestrel Ridge underground schematic</title><desc id="schematic-desc">Select a named mine zone to open its sample record. Dotted paths show illustrative information flow to the control-room connection; no mine systems are connected.</desc>
      {lines.map(([from, to, kind]) => { const start = position(from); const end = position(to); const x1 = start.x / 100 * 520; const y1 = start.y / 100 * 340; const x2 = end.x / 100 * 520; const y2 = end.y / 100 * 340; const mid = (x1 + x2) / 2; const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`; return <g key={`${from}-${to}`}><path d={path} className="schematic-tunnel"/><path d={path} className={`schematic-flow ${frozen && (from === 'tunnel-b' || to === 'tunnel-b') ? 'flow-frozen' : ''} ${kind}`} /></g>; })}
      <circle cx="473" cy="171" r="15" className="control-node"/><path d="M 449 171 H 457" className="schematic-trunk"/><text x="473" y="175" textAnchor="middle" className="control-node-letter">C</text><text x="473" y="200" textAnchor="middle" className="control-node-label">CONTROL</text>
    </svg>
    {geometry.map((point) => { const zone = zoneMap.get(point.id); if (!zone || (zone.state === 'UNKNOWN' && !layers.unknown)) return null; return <button key={zone.id} className={`schematic-node node-${zone.state.toLowerCase()} ${selectedZoneId === zone.id ? 'node-selected' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`Open ${zone.name}, status ${zone.state.toLowerCase()}`} aria-pressed={selectedZoneId === zone.id} onClick={() => onSelect(zone.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(zone.id); } }}>
        <span className="node-core"><span className="node-status-glyph" aria-hidden="true">{zone.state === 'KNOWN' ? '✓' : zone.state === 'UNCERTAIN' ? '!' : zone.state === 'UNKNOWN' ? '?' : '●'}</span></span><span className="node-name">{zone.name}</span><span className="node-status">{zone.state}</span></button>; })}
    {layers.sensors && <div className="schematic-overlay-marker marker-sensor" style={{ left: '31%', top: '15%' }} title="Illustrative sensor locations">S</div>}
    {layers.sensors && <div className="schematic-overlay-marker marker-sensor" style={{ left: '51%', top: '15%' }} title="Illustrative sensor locations">S</div>}
    {layers.hazards && <div className="schematic-overlay-marker marker-hazard" style={{ left: '51%', top: '65%' }} title="Sample hazard observation">!</div>}
    {layers.checkpoints && <div className="schematic-overlay-marker marker-checkpoint" style={{ left: '82%', top: '63%' }} title="Worker checkpoint">C</div>}
    <div className="schematic-hatch-label"><ShieldQuestion size={13}/>Unknown volume · missing scan/sample coverage</div></div>
    <div className="schematic-legend" aria-label="Zone status legend"><StatusBadge status="KNOWN"/><StatusBadge status="UNCERTAIN"/><StatusBadge status="UNKNOWN"/><StatusBadge status="ALERT"/><span className="legend-simulated">SIMULATED · no live connection</span></div>
    {frozen && <div className="flow-caption" role="status">B-CH4-02 flow stopped · last sample at 09:00 · silence is not a safe reading.</div>}
  </section>;
}
