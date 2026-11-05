import { useState } from 'react';
import { ArrowUpRight, Bell, Check, ChevronRight, Clock3 } from 'lucide-react';
import type { MineAlert } from '../models/types';
import { SectionHeader } from './Primitives';
import { ProvenanceBadge } from './Badges';

export function AlertQueue({ alerts, onAcknowledge, onOpenZone, onLinkToTask, onResolve }: { alerts: MineAlert[]; onAcknowledge: (id: string) => void; onOpenZone: (id: string) => void; onLinkToTask: (alert: MineAlert) => void; onResolve: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const ordered = alerts.filter((alert) => alert.state !== 'resolved');
  const visible = showAll ? ordered : ordered.slice(0, 4);
  return <section className="panel attention-panel" aria-labelledby="attention-heading">
    <SectionHeader title="Attention queue" aside="Unresolved · severity ordered" action={<span className="queue-count">{ordered.length} OPEN</span>} />
    {ordered.length === 0 ? <div className="empty-state"><Check size={22}/><strong>No unresolved demo alerts</strong><p>Scenario-derived alerts will appear here.</p></div> : <div className="attention-list">{visible.map((alert) => <article className={`alert-row alert-${alert.severity.toLowerCase()}`} key={alert.id}>
      <span className="alert-severity-mark" aria-hidden="true"><Bell size={14}/></span><div className="alert-main"><div className="alert-title-line"><strong>{alert.title}</strong><span className={`severity-tag severity-${alert.severity.toLowerCase()}`}>{alert.severity}</span></div><button className="alert-zone-link" onClick={() => onOpenZone(alert.zoneId)}>{zoneLabel(alert.zoneId)}<ArrowUpRight size={12}/></button><p>{alert.recommendedAction}</p><div className="alert-meta"><Clock3 size={12}/><span>{alert.time}</span><ProvenanceBadge type="SIMULATED"/></div>
      <div className="alert-actions">{alert.state === 'new' ? <button className="small-action" onClick={() => onAcknowledge(alert.id)}><Check size={13}/>Acknowledge</button> : alert.state === 'acknowledged' ? <button className="small-action" onClick={() => onLinkToTask(alert)}><Check size={13}/>Link to task</button> : <button className="small-action" onClick={() => onResolve(alert.id)}><Check size={13}/>Resolve</button>}<button className="small-action open-action" onClick={() => onOpenZone(alert.zoneId)}>Open zone <ChevronRight size={13}/></button></div>{alert.state === 'linked' && <div className="alert-linked-note">Task linked · {alert.taskId ?? 'ID unavailable'}</div>}</div>
    </article>)}</div>}
    {ordered.length > 4 && <button className="show-more-button" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show fewer' : `Show all ${ordered.length}`}<ChevronRight size={13}/></button>}
  </section>;
}
function zoneLabel(id: string) { return ({ shaft: 'Main Shaft', 'tunnel-a': 'Tunnel A', 'tunnel-b': 'Tunnel B', 'tunnel-c': 'Tunnel C', pump: 'Pumping Station', exit: 'Emergency Exit' } as Record<string, string>)[id] ?? 'Unknown zone'; }
